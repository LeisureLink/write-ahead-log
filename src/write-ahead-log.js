'use strict';

import assert from 'assert-plus';
import fs from 'fs';
import { Readable } from 'stream';
import RandomAccessFile from 'ranfile';

import Queue from './queue';
import LogIndexFile from './log-index-file';

const DEFAULT_INDEX_EXT = '.lix';

const $index = Symbol('index');
const $file = Symbol('file');

/**
 * An encapsulation of write-ahead logging behavior.
 *
 * Write-ahead logging (WAL) is a building block used to improve automicity and durability in distributed systems. WAL improves these properties by providing persistent, sequenced storage for _Log Entries_ as well as a record of which _Log Entries_ have been committed. Write-ahead logging enables systems to recover from failures, whether those failures are in software, storage, or the network.
 *
 * This implementation provides a basic semantic on which reliable systems can be built.
 */
class WriteAheadLog {

  constructor(file, index) {
    assert.object(file, 'file');
    assert.object(index, 'index');
    this[$file] = file;
    this[$index] = index;
  }

  /**
   * @type {string} - The log's file name (fully qualified path).
   */
  get name() {
    return this[$file].name;
  }

  /**
   * @type {string} - The log's index file name (fully qualified path).
   */
  get index() {
    return this[$index].name;
  }

  /**
   * @type {boolean} - Indicates whether the log was opened in a writable mode.
   */
  get writable() {
    return this[$file].writable;
  }

  /**
   * @type {number} - The log's size in bytes.
   */
  get size() {
    return this[$file].size;
  }

  /**
   * @type {number} - The next LSN/index (the write head).
   */
  get next() {
    return this[$index].head;
  }

  /**
   * @type {number} - The most recently commited LSN/index.
   */
  get commitHead() {
    return this[$index].commitHead;
  }

  /**
   * Determines if the specified LSN/index has been committed.
   *
   * ```javascript
   * wal.isCommitted(lsn)
   *   .then(committed => {
   *      if (committed) console.log(lsn + ' is committed');
   *   });
   * ```
   * @param {number} index - The LSN/index to check.
   * @returns {Promise} - A promise that upon success is resolved with boolean indicating whether the LSN/index has been committed.
   */
  isCommitted(index) {
    assert.number(index, 'index');
    return this[$index].isCommitted(index);
  }

  /**
   * Commits the specified, uncommitted LSN/index.
   *
   * ```javascript
   * wal.commit(lsn)
   *   .then(lsn => {
   *      console.log(lsn + ' successfully committed');
   *   })
   *   .catch(err => {
   *      console.log(`Unexpected error during commit of ${lsn}: ${''+err.stack}.`);
   *   })
   * ```
   * @param {number} index - The LSN/index to commit.
   * @returns {Promise} - A promise that upon success is resolved with the specified, committed LSN/index.
   */
  commit(index) {
    assert.number(index, 'index');
    return this[$index].commit(index);
  }

  /**
   * Writes a log entry.
   *
   * The entire contents of the specified `data` buffer is written as the log entry, the actual binary data is treated as opaque in the log. Since the log is not involved in the interpretation of the data, concerns such as encryption and data security is entirely the caller's responsibility.
   *
   * ```javascript
   * wal.write(data)
   *   .then(lsn => {
   *      console.log(`Data written as Log Entry ${lsn}.`);
   *   })
   *   .catch(err => {
   *      console.log(`Unexpected error: ${''+err.stack}.`);
   *   })
   * ```
   * @param {Buffer} data - The log entry as an opaque data buffer.
   * @returns {Promise} A promise that upon success is resolved with the new entry's LSN/index.
   * @throws {AssertionError} thrown when `data` is unspecified or not a `Buffer`.
   */
  write(data) {
    let log = this[$file];
    let idx = this[$index];
    let head = idx.head;

    return idx.offset(head)
      .then(firstByte => {
        return log.write(firstByte, data);
      })
      .then(subsequentByte => idx.increment(subsequentByte));
  }

  /**
   * Reads the log entry at the specified LSN/index.
   *
   * ```javascript
   * wal.read(lsn)
   *   .then(data => {
   *     console.log(`Log Entry ${lsn} has ${data.length} bytes of data.`);
   *   })
   *   .catch(err => {
   *      console.log(`Unexpected error: ${''+err.stack}.`);
   *   })
   * ```
   * @param {number} index - Specifies the LSN/index of the log entry to read.
   * @returns {Promise} A promise that upon success is resolved with a buffer containing the log entry
   * @throws {AssertionError} Thrown when the LSN/index is out of range.
   */
  read(index) {
    let log = this[$file];
    let idx = this[$index];
    return idx.get(index)
      .then(rec => log.read(rec.offset, rec.length));
  }

  /**
   * Reads a range of log entries beginning at the specified `first` LSN/index. If count is not specified all subsequent log entries are returned.
   *
   * ```javascript
   * wal.readRange(first)
   *   .then(stream => new Promise((resolve, reject) => {
   *       let acc = [];
   *       stream.on('data', data => {
   *          acc.push(data);
   *        })
   *        .on('end', () => resolve(acc))
   *        .on('error', reject);
   *      }))
   *   .then(entries => {
   *     console.log(`There are ${entries.length} log entries after LSN ${first}.`);
   *   })
   *   .catch(err => {
   *      console.log(`Unexpected error: ${''+err.stack}.`);
   *   })
   * ```
   * @param {number} first - Specifies the index of the first log entry to read.
   * @param {number} count - Specifies the number of log entries to read.
   * @returns {Readable}  A readable stream where the log entries are streamed to the caller.
   */
  readRange(first, count) {
    assert.number(first, 'first');
    assert.optionalNumber(count, 'count');
    let idx = this[$index];
    let log = this[$file];
    if (count === undefined) {
      // head points at the
      count = (idx.head - first);
    }
    // respect the flow-control specified streaming api.
    let sending = false;
    let ended = false;
    let ready = new Queue();
    let stream;

    function sendUntilPaused() {
      while (sending && ready.length) {
        sending = stream.push(ready.dequeue());
      }
      if (ended && ready.isEmpty) {
        stream.push(null);
        stream.emit('end');
      }
    }

    function readyToSend(data) {
      ready.enqueue(data);
      sendUntilPaused();
    }

    function clearToSend() {
      sending = true;
      return sendUntilPaused();
    }
    // read the entries from the logfile and possibly buffer them
    // for the readable stream.
    idx.getRange(first, count)
      .then(range => range.reduce((acc, rec) =>
        acc.then(() => log.read(rec.offset, rec.length).then(readyToSend)),
        Promise.resolve()))
      .then(() => {
        if (ready.isEmpty) {
          stream.push(null);
          stream.emit('end');
        } else {
          ended = true;
          sendUntilPaused();
        }
      })
      .catch(err => stream.emit('error', err));

    return stream = new Readable({
      read: clearToSend
    });
  }

  /**
   * Truncates the log from the specified, uncommitted LSN/index.
   *
   * Since the `.next` property is usually ahead of the `.commitHead`, when this call succeeds it resets the write head to the newly truncated LSN/index position. Be aware that the very next `.write()` will re-use this most-recent truncated LSN/index.
   *
   * ```javascript
   * wal.truncate(first)
   *   .then(size => {
   *     console.log(`There are ${bytes} committed to the log.`);
   *   })
   *   .catch(err => {
   *      console.log(`Unexpected error: ${''+err.stack}.`);
   *   })
   * ```
   * @param {number} from - Specifies the LSN/index where the log entries should be truncated.
   * @returns {Promise}  A promise that upon success is resolved with the new write head.
   */
  truncate(from) {
    assert.number(from, 'from');
    let idx = this[$index];
    let log = this[$file];
    return idx.truncate(from).then(next => log.truncate(next));
  }

  recover(handler) {
    if (handler === false) {
      handler = () => false;
    }
    assert.ok(typeof(handler) === 'function', 'handler (function) is required');
    let head = this.next;
    let committed = this.commitHead;
    let self = this;

    function truncAfterCommitHead() {
      return self.truncate(self.commitHead + 1)
        .then(() => self);
    }

    function possiblyRecover(index) {
      return self.read(index)
        .then(data => {
          let commit = handler(index, data);
          if (typeof(commit) === 'object' && typeof(commit.then) === 'function') {
            return commit.then(commit => {
              if (commit) {
                return self.commit(index)
                  .then(committed =>
                    ((committed + 1) < head) ?
                    possiblyRecover(committed + 1) :
                    truncAfterCommitHead());
              }
              return truncAfterCommitHead();
            });
          }
          if (commit) {
            return self.commit(index)
              .then(committed =>
                ((committed + 1) < head) ?
                possiblyRecover(committed + 1) :
                truncAfterCommitHead());
          }
          return truncAfterCommitHead();
        });
    }
    return ((committed + 1) < head) ?
      possiblyRecover(committed + 1) :
      Promise.resolve(self);
  }

  close() {
    return Promise.all([
      this[$file].close(),
      this[$index].close()
    ]);
  }
}

function open(options) {
  assert.object(options, 'options');
  assert.string(options.path, 'options.path');
  assert.optionalString(options.index, 'options.index');
  assert.optionalBool(options.writable, 'options.writable');
  assert.optionalBool(options.init, 'options.init');
  let mode = fs.R_OK;
  if (options.writable) {
    mode |= fs.W_OK;
  }
  let idxFile = options.index || options.path + DEFAULT_INDEX_EXT;
  let log;
  // ensure existence/access to files before continuing...
  return RandomAccessFile.open(options.path, options.writable)
    .then(file => {
      log = file;
      return LogIndexFile.open(idxFile, options.writable);
    })
    .then(index => new WriteAheadLog(log, index));
}

function create(options) {
  assert.object(options, 'options');
  assert.string(options.path, 'options.path');
  assert.optionalString(options.index, 'options.index');
  let idxFile = options.index || options.path + DEFAULT_INDEX_EXT;
  let log;
  return RandomAccessFile.create(options.path)
    .then(file => {
      log = file;
      return LogIndexFile.create(idxFile, 0);
    })
    .then(index => new WriteAheadLog(log, index));
}

function openOrCreate(options) {
  return WriteAheadLog.open(options)
    .catch(err => {
      // if it doesn't exist we'll create it if writable
      if (err.code === 'ENOENT' && options.writable) {
        return WriteAheadLog.create(options);
      }
      throw err;
    });
}

WriteAheadLog.create = create;
WriteAheadLog.open = open;
WriteAheadLog.openOrCreate = openOrCreate;
WriteAheadLog.DEFAULT_INDEX_EXT = DEFAULT_INDEX_EXT;

export default WriteAheadLog;
