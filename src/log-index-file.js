'use strict';

import assert from 'assert-plus';
import RandomAccessFile from 'ranfile';

/******************************************************************************
The log index file is a side-file that tracks the byte offsets to each distinct
log entry. Using the side-file indexing scheme, we are able to efficiently
store and retrieve each distinct log entry without having to care about the
entry's byte content. In this scheme, log-serial-numbers (LSNs) are the natural
integer index at which the log entry was written, as if being written to an
array.

Layout:

marker   -- 4 marker bytes identifying the file's type: IDX$
base     -- 4 bytes integer (big-endian); an index offset, usually 0 (zero).
            Offsets are only meaningful when indexes are split across many
            files so are a placeholder for future work.
head     -- 4 bytes integer (big-endian); the write head (next unused entry)
commit   -- 4 bytes integer (big-endian); the commit head (may trail head)

In this layout there are 16 header bytes (hlen), therefore each subsequent 4
bytes contains a pointer to a log entry's starting byte in the indexed write-
ahead-log (WAL).

hlen + ((index - base) * sizeof(int))


Example (octets)...

            Base      Head        Commit      Index 0     Index 1
            v           v           v           V           v
49 44 58 24 00 00 00 00 00 00 00 02 00 00 00 01 00 00 00 00 00 00 00 58 \

Index 2
v
00 00 02 1f

Log Entry 0 begins at byte 0
Log Entry 1 begins at byte 88
Log Entry 2 begins at byte 543



******************************************************************************/

const MARKER = 'IDX$';
const OFS_MARKER = 0;
const OFS_BASEINDEX = 4;
const OFS_HEAD = 8;
const OFS_COMMIT = 12;
const HLEN = 16;
const SIZEOF_INT = 4;
const DEF_COMMIT = -1;

const $file = Symbol('file');
const $header = Symbol('header');

function allocFill(len) {
  return (Buffer.alloc) ?
    Buffer.alloc(len) :
    new Buffer(len); // deprecated in 5.x+
}

class LogIndexFile {

  constructor(file) {
    assert.object(file, 'file');
    assert.func(file.read, 'file.read');
    assert.func(file.write, 'file.write');
    assert.func(file.close, 'file.close');
    if (file.size < HLEN) {
      throw new Error('File too small to be an index file.');
    }
    this[$file] = file;
  }

  get name() { return this[$file].name; }

  get writable() {
    return this[$file].writable;
  }

  get marker() {
    assert.ok(this[$header], 'index must be open');
    return this[$header].toString('ascii', OFS_MARKER, OFS_BASEINDEX);
  }

  get baseIndex() {
    assert.ok(this[$header], 'index must be open');
    return this[$header].readInt32BE(OFS_BASEINDEX, true);
  }

  get head() {
    assert.ok(this[$header], 'index must be open');
    return this[$header].readInt32BE(OFS_HEAD, true);
  }

  get commitHead() {
    assert.ok(this[$header], 'index must be open');
    return this[$header].readInt32BE(OFS_COMMIT, true);
  }

  isCommitted(index) {
    assert.ok(this[$header], 'index must be open');
    return index < this.commitHead;
  }

  commit(index) {
    assert.ok(this[$header], 'index must be open');
    assert.number(index, 'index');
    let expected = this.commitHead + 1;
    if (index < expected) {
      return Promise.resolve(index);
    }
    if (index !== expected) {
      return Promise.reject(new Error(`Out of order commit; expected ${expected} but received ${index}.`));
    }
    this[$header].writeInt32BE(index, OFS_COMMIT, true);
    return this[$file].write(OFS_COMMIT, this[$header], OFS_COMMIT, SIZEOF_INT)
      .then(() => index);
  }

  localizeIndex(index) {
    assert.number(index, 'index');
    index = index - this.baseIndex;
    return index;
  }

  globalizeIndex(index) {
    assert.number(index, 'index');
    index = index + this.baseIndex;
    return index;
  }

  offset(index) {
    assert.ok(index <= this.head, 'index out of range');
    assert.ok(this[$header], 'index must be open');
    let ofs = HLEN + (this.localizeIndex(index) * SIZEOF_INT);
    return this[$file].read(ofs, SIZEOF_INT)
      .then(data => {
        let offset = data.readInt32BE(0, SIZEOF_INT);
        return offset;
      });
  }

  get(index) {
    assert.number(index, 'index');
    assert.ok(index < this.head, 'index out of range');
    assert.ok(this[$header], 'index must be open');
    let ofs = HLEN + (this.localizeIndex(index) * SIZEOF_INT);
    return this[$file].read(ofs, 2 * SIZEOF_INT)
      .then(data => {
        let offset = data.readInt32BE(0, SIZEOF_INT);
        return {
          offset,
          length: data.readInt32BE(SIZEOF_INT, SIZEOF_INT) - offset
        };
      });
  }

  getRange(index, count) {
    assert.number(index, 'index');
    assert.ok(index < this.head, 'index out of range');
    assert.number(count, 'count');
    assert.ok(this[$header], 'index must be open');
    // head points at the next entry
    let limit = (this.head - index);
    assert.ok(count <= limit, 'count puts index out of range');
    let ofs = HLEN + (this.localizeIndex(index) * SIZEOF_INT);
    return this[$file].read(ofs, (count + 1) * SIZEOF_INT)
      .then(data => {
        let i = -1;
        let result = [];
        while (++i < count) {
          let offset = data.readInt32BE(i * SIZEOF_INT, SIZEOF_INT);
          result.push({
            index: index + i,
            offset,
            length: data.readInt32BE((i + 1) * SIZEOF_INT, SIZEOF_INT) - offset
          });
        }
        return result;
      });
  }

  truncate(from) {
    assert.number(from, 'from');
    assert.ok(from > this.commitHead, 'cannot truncate a committed log entry');
    assert.ok(from < this.head, 'index out of range');
    let header = this[$header];
    header.writeInt32BE(from, OFS_HEAD, SIZEOF_INT);
    return this[$file].write(OFS_HEAD, header, OFS_HEAD, SIZEOF_INT)
      .then(() => {
        if (this.head === this.baseIndex) {
          return this[$file].read(HLEN, SIZEOF_INT)
            .then(data => {
              return {
                offset: data.readInt32BE(0, SIZEOF_INT),
                length: 0
              };
            });
        }
        return this.get(this.head - 1);
      })
      .then(rec => rec.offset + rec.length);
  }

  increment(offset) {
    assert.ok(this[$header], 'index must be open');
    // write the offset into the next index location (typically at EOF),
    // then update and write the header reference, which completes the
    // increment.
    let header = this[$header];
    let current = this.head;
    let next = current + 1;
    let ofs = HLEN + (this.localizeIndex(next) * SIZEOF_INT);
    let data = allocFill(SIZEOF_INT);
    data.writeInt32BE(offset, 0, SIZEOF_INT);
    return this[$file].write(ofs, data)
      .then(() => {
        header.writeInt32BE(next, OFS_HEAD, SIZEOF_INT);
        return this[$file].write(OFS_HEAD, header, OFS_HEAD, SIZEOF_INT);
      })
      .then(() => {
        return current;
      });
  }

  open() {
    assert.ok(!this[$header], 'index already open');
    let file = this[$file];
    return file.read(OFS_MARKER, HLEN)
      .then(data => {
        let marker = data.toString('ascii', OFS_MARKER, OFS_BASEINDEX);
        if (marker !== MARKER) {
          throw new Error(`Invalid index file; expected file marker to be ${MARKER} but found ${marker}.`);
        }
        this[$header] = data;
        return this;
      });
  }

  close() {
    return this[$file].close()
      .then(() => {
        this[$header] = null;
      });
  }

}

function open(path, writable) {
  assert.string(path, 'path');
  assert.optionalBool(writable, 'writable');
  writable = writable === true;
  return RandomAccessFile.open(path, writable)
    .then(file => new LogIndexFile(file).open());
}

function create(path, baseIndex, byteOffset) {
  assert.string(path, 'path');
  assert.optionalNumber(baseIndex, 'baseIndex');
  assert.optionalNumber(byteOffset, 'byteOffset');
  if (baseIndex === undefined) {
    baseIndex = 0;
  }
  if (byteOffset === undefined) {
    byteOffset = 0;
  }
  let data = allocFill(HLEN + SIZEOF_INT);
  data.write(MARKER, 'ascii');
  data.writeInt32BE(baseIndex, OFS_BASEINDEX, true);
  data.writeInt32BE(baseIndex, OFS_HEAD, true);
  data.writeInt32BE(DEF_COMMIT, OFS_COMMIT, true);
  data.writeInt32BE(byteOffset, HLEN, true);
  return RandomAccessFile.create(path)
    .then(file => file.write(OFS_MARKER, data)
      .then(() => new LogIndexFile(file).open()));
}

LogIndexFile.open = open;
LogIndexFile.create = create;

export default LogIndexFile;
