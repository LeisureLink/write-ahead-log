'use strict';

const test = require('tape');
const tmp = require('tmp');
const WriteAheadLog = require('../').WriteAheadLog;

tmp.setGracefulCleanup();

function spool(stream) {
  return new Promise(
    (resolve, reject) => {
      let acc = [];
      stream
        .on('data', data => {
          acc.push(data);
        })
        .on('end', () => resolve(acc))
        .on('error', reject);
    });
}

//function randomInt(low, high) {return Math.floor(Math.random() * (high - low) + low); }

test('WriteAheadLog.create() fails without options', t => {
  t.throws(() => WriteAheadLog.create(), 'AssertionError: options (object) is required');
  t.end();
});

test('WriteAheadLog.create({}) fails without path', t => {
  t.throws(() => WriteAheadLog.create({}), 'AssertionError: options.path (string) is required');
  t.end();
});

test('WriteAheadLog.create({ path: 1 }) fails when path wrong type', t => {
  t.throws(() => WriteAheadLog.create({ path: 1 }), 'AssertionError: options.path (string) is required');
  t.end();
});

test('WriteAheadLog.create({ path: \'random-temp\' }) creates a new log with a default index file name', t => {
  tmp.tmpName((err, path) => {
    if (err) t.fail('' + err);
    WriteAheadLog.create({ path })
      .then(wal => {
        t.equal(wal.name, path, '.name is the temp file');
        t.equal(wal.index, path + WriteAheadLog.DEFAULT_INDEX_EXT, '.index is conventionally named');
        t.equal(wal.size, 0, '.size is 0 (zero)');
        t.equal(wal.next, 0, '.next is 0 (zero)');
        t.equal(wal.commitHead, -1, '.commitHead is -1 (none)');
        t.end();
      })
      .catch(err => {
        t.fail('' + err);
      });
  });
});

test('WriteAheadLog.create({ path: \'random-temp\', index: \'specified\' }) creates a new log with the specified names', t => {
  tmp.tmpName((err, path) => {
    let index = path + '-my-specified-name';
    if (err) t.fail('' + err);
    WriteAheadLog.create({ path, index })
      .then(wal => {
        t.equal(wal.name, path, '.name is the temp file');
        t.equal(wal.index, index, '.index has the specified name');
        t.equal(wal.size, 0, '.size is 0 (zero)');
        t.equal(wal.next, 0, '.next is 0 (zero)');
        t.equal(wal.commitHead, -1, '.commitHead is -1 (none)');
        t.end();
      })
      .catch(err => {
        t.fail('' + err);
      });
  });
});

test('WriteAheadLog.open({ path: 1 }) fails when path wrong type', t => {
  t.throws(() => WriteAheadLog.open({ path: 1 }), 'AssertionError: options.path (string) is required');
  t.end();
});

test('WriteAheadLog.open() fails without options', t => {
  t.throws(() => WriteAheadLog.open(), 'AssertionError: options (object) is required');
  t.end();
});

test('WriteAheadLog.open({}) fails without path', t => {
  t.throws(() => WriteAheadLog.open({}), 'AssertionError: options.path (string) is required');
  t.end();
});

test('WriteAheadLog.open({ path: 1 }) fails when path wrong type', t => {
  t.throws(() => WriteAheadLog.open({ path: 1 }), 'AssertionError: options.path (string) is required');
  t.end();
});

test('WriteAheadLog.open({ path: \'random-temp\' }) fails when file doesn\'t exist', t => {
  tmp.tmpName((err, path) => {
    if (err) t.fail('' + err);
    WriteAheadLog.open({ path })
      .then(wal => {
        t.fail(`Non-existent log should cause an error: ${wal.name}`);
      })
      .catch(err => {
        t.equal(err.code, 'ENOENT', '' + err);
        t.end();
      });
  });
});

test('WriteAheadLog.openOrCreate() fails without options', t => {
  t.throws(() => WriteAheadLog.openOrCreate(), 'AssertionError: options (object) is required');
  t.end();
});

test('WriteAheadLog.openOrCreate({}) fails without path', t => {
  t.throws(() => WriteAheadLog.openOrCreate({}), 'AssertionError: options.path (string) is required');
  t.end();
});

test('WriteAheadLog.openOrCreate({ path: 1 }) fails when path wrong type', t => {
  t.throws(() => WriteAheadLog.openOrCreate({ path: 1 }), 'AssertionError: options.path (string) is required');
  t.end();
});

test('WriteAheadLog.openOrCreate({ path: \'random-temp\' }) when writable not specified and path doesn\'t exist', t => {
  tmp.tmpName((err, path) => {
    if (err) t.fail('' + err);
    WriteAheadLog.openOrCreate({ path })
      .then(wal => {
        t.fail(`Non-existent log should cause an error: ${wal.name}`);
      })
      .catch(err => {
        t.equal(err.code, 'ENOENT', '' + err);
        t.end();
      });
  });
});

test('WriteAheadLog.openOrCreate({ path: \'random-temp\', index: \'specified\' }) when writable not specified and path doesn\'t exist', t => {
  tmp.tmpName((err, path) => {
    let index = path + '-my-specified-name';
    if (err) t.fail('' + err);
    WriteAheadLog.openOrCreate({ path, index })
      .then(wal => {
        t.fail(`Non-existent log should cause an error: ${wal.name}`);
      })
      .catch(err => {
        t.equal(err.code, 'ENOENT', '' + err);
        t.end();
      });
  });
});

test('WriteAheadLog.openOrCreate({ path: \'random-temp\', writable: true }) creates a new log with a default index file name', t => {
  tmp.tmpName((err, path) => {
    if (err) t.fail('' + err);
    WriteAheadLog.openOrCreate({ path, writable: true })
      .then(wal => {
        t.equal(wal.name, path, '.name is the temp file');
        t.equal(wal.index, path + WriteAheadLog.DEFAULT_INDEX_EXT, '.index is conventionally named');
        t.equal(wal.size, 0, '.size is 0 (zero)');
        t.equal(wal.next, 0, '.next is 0 (zero)');
        t.equal(wal.commitHead, -1, '.commitHead is -1 (none)');
        t.end();
      })
      .catch(err => {
        t.fail('' + err);
      });
  });
});

test('WriteAheadLog.openOrCreate({ path: \'random-temp\', index: \'specified\', writable: true }) creates a new log with the specified names', t => {
  tmp.tmpName((err, path) => {
    let index = path + '-my-specified-name';
    if (err) t.fail('' + err);
    WriteAheadLog.openOrCreate({ path, index, writable: true })
      .then(wal => {
        t.equal(wal.name, path, '.name is the temp file');
        t.equal(wal.index, index, '.index has the specified name');
        t.equal(wal.size, 0, '.size is 0 (zero)');
        t.equal(wal.next, 0, '.next is 0 (zero)');
        t.equal(wal.commitHead, -1, '.commitHead is -1 (none)');
        t.end();
      })
      .catch(err => {
        t.fail('' + err);
      });
  });
});

test('.write(data) fails when data not specified', t => {
  tmp.tmpName((err, path) => {
    if (err) t.fail('' + err);
    WriteAheadLog.create({ path })
      .then(wal => wal.write()
        .then(() => t.fail('Should fail due to missing data.')))
      .catch(err => {
        t.equal('' + err,
          'AssertionError: data (Buffer) is required',
          'AssertionError: data (Buffer) is required');
        t.end();
      });
  });
});

test('.write(data) fails when data is wrong type', t => {
  tmp.tmpName((err, path) => {
    if (err) t.fail('' + err);
    WriteAheadLog.create({ path })
      .then(wal => wal.write('This is string data.')
        .then(() => t.fail('Should fail due to data of wrong type.')))
      .catch(err => {
        t.equal('' + err,
          'AssertionError: data (Buffer) is required',
          'AssertionError: data (Buffer) is required');
        t.end();
      });
  });
});

test('.write(data) successfully writes binary', t => {
  tmp.tmpName((err, path) => {
    if (err) t.fail('' + err);
    let data = new Buffer('This is binary data in the buffer.', 'utf8');
    WriteAheadLog.create({ path })
      .then(wal => wal.write(data)
        .then(lsn => {
          t.equals(lsn, 0, 'LSNs are sequential starting from 0 (zero).');
          t.equals(wal.next, 1, '.next is 1; then next available LSN.');
          t.equals(wal.commitHead, -1, '.commitHead is -1 (none).');
          t.equals(wal.size, data.length, '.size is the byte length of data written so far.');
          t.end();
        }))
      .catch(err => {
        t.fail('' + err.stack);
      });
  });
});

test('.read() fails when index unspecified', t => {
  tmp.tmpName((err, path) => {
    if (err) t.fail('' + err);
    WriteAheadLog.create({ path })
      .then(wal => wal.read()
        .then(() => t.fail('Should fail due to missing LSN.')))
      .catch(err => {
        t.equal('' + err, 'AssertionError: index (number) is required');
        t.end();
      });
  });
});

test('.read(lsn) successfully reads exact binary data at the specified log index', t => {
  tmp.tmpName((err, path) => {
    if (err) t.fail('' + err);
    let buffers = [
      new Buffer('This is the first data.', 'utf8'),
      new Buffer('This is the second data.', 'utf8'),
      new Buffer('This is the third data.', 'utf8')
    ];
    WriteAheadLog.create({ path })
      .then(wal => {
        // write all buffers as log entries
        return buffers.reduce(
            (acc, data) => acc.then(() => wal.write(data)),
            Promise.resolve())
          // read back the second log entry.
          .then(() => wal.read(1));
      })
      .then(logEntry => {
        t.equal(logEntry.toString('hex'), buffers[1].toString('hex'), 'log entry\'s bytes are equal to the orig buffer\'s bytes');
        t.end();
      })
      .catch(err => {
        t.fail('' + err.stack);
      });
  });
});

test('.commit() fails when index unsepcified', t => {
  tmp.tmpName((err, path) => {
    if (err) t.fail('' + err);
    WriteAheadLog.create({ path })
      .then(wal => wal.commit()
        .then(() => t.fail('Should fail due to missing LSN.')))
      .catch(err => {
        t.equal('' + err,
          'AssertionError: index (number) is required',
          'AssertionError: index (number) is required'
        );
        t.end();
      });
  });
});

test('.commit(lsn) fails when committing entry out of order', t => {
  tmp.tmpName((err, path) => {
    if (err) t.fail('' + err);
    let buffers = [
      new Buffer('commit first data.', 'utf8'),
      new Buffer('commit second data.', 'utf8'),
      new Buffer('commit third data.', 'utf8')
    ];
    WriteAheadLog.create({ path })
      .then(wal => {
        // write all buffers as log entries
        return buffers.reduce(
            (acc, data) => acc.then(() => wal.write(data)),
            Promise.resolve())
          // attempt to commit the second entry
          .then(() => wal.commit(1));
      })
      .catch(err => {
        t.equal('' + err,
          'Error: Out of order commit; expected 0 but received 1.',
          'Error: Out of order commit; expected 0 but received 1.');
        t.end();
      });
  });
});

test('.commit(lsn) succeeds when committing first entry in order', t => {
  tmp.tmpName((err, path) => {
    if (err) t.fail('' + err);
    let buffers = [
      new Buffer('commit first data.', 'utf8'),
      new Buffer('commit second data.', 'utf8'),
      new Buffer('commit third data.', 'utf8')
    ];
    WriteAheadLog.create({ path })
      .then(wal => {
        // write all buffers as log entries
        return buffers.reduce(
            (acc, data) => acc.then(() => wal.write(data)),
            Promise.resolve())
          // commit first entry
          .then(() => wal.commit(0))
          .then(lsn => {
            t.equals(lsn, 0, 'success response is the committed LSN');
            t.equals(wal.commitHead, lsn, '.committedHead equals specified LSN');
            t.end();
          });
      })
      .catch(err => {
        t.fail('' + err.stack);
      });
  });
});

test('.commit(lsn) succeeds when committing multiple entries in order', t => {
  tmp.tmpName((err, path) => {
    if (err) t.fail('' + err);
    let buffers = [
      new Buffer('commit first data.', 'utf8'),
      new Buffer('commit second data.', 'utf8'),
      new Buffer('commit third data.', 'utf8')
    ];
    WriteAheadLog.create({ path })
      .then(wal => {
        // write all buffers as log entries
        return buffers.reduce(
            (acc, data) => acc.then(() => wal.write(data)),
            Promise.resolve())
          // commit all entries in order
          .then(() => wal.commit(0))
          .then(() => wal.commit(1))
          .then(() => wal.commit(2))
          .then(lsn => {
            t.equals(lsn, 2, 'success response is the committed LSN');
            t.equals(wal.commitHead, lsn, '.committedHead equals specified LSN');
            t.end();
          });
      })
      .catch(err => {
        t.fail('' + err.stack);
      });
  });
});

test('.truncate() fails when LSN unspecified', t => {
  tmp.tmpName((err, path) => {
    if (err) t.fail('' + err);
    WriteAheadLog.create({ path })
      .then(wal => wal.truncate())
      .catch(err => {
        t.equal('' + err,
          'AssertionError: from (number) is required',
          'AssertionError: from (number) is required');
        t.end();
      });
  });
});

test('.truncate(lsn) fails when LSN out of range (ahead of entries)', t => {
  tmp.tmpName((err, path) => {
    if (err) t.fail('' + err);
    WriteAheadLog.create({ path })
      .then(wal => wal.truncate(1))
      .catch(err => {
        t.equal('' + err,
          'AssertionError: index out of range',
          'AssertionError: index out of range');
        t.end();
      });
  });
});

test('.truncate(lsn) fails when LSN has already been committed', t => {
  tmp.tmpName((err, path) => {
    if (err) t.fail('' + err);
    let buffers = [
      new Buffer('commit first data.', 'utf8'),
      new Buffer('commit second data.', 'utf8'),
      new Buffer('commit third data.', 'utf8')
    ];
    WriteAheadLog.create({ path })
      .then(wal => {
        // write all buffers as log entries
        return buffers.reduce(
            (acc, data) => acc.then(() => wal.write(data)),
            Promise.resolve())
          // commit the first entry
          .then(() => wal.commit(0))
          // try to truncate the first entry
          .then(() => wal.truncate(0));
      })
      .catch(err => {
        t.equal('' + err,
          'AssertionError: cannot truncate a committed log entry',
          'AssertionError: cannot truncate a committed log entry');
        t.end();
      });
  });
});

test('.truncate(lsn) succeeds for uncommitted LSNs', t => {
  tmp.tmpName((err, path) => {
    if (err) t.fail('' + err);
    let buffers = [
      new Buffer('commit first data.', 'utf8'),
      new Buffer('commit second data.', 'utf8'),
      new Buffer('commit third data.', 'utf8')
    ];
    WriteAheadLog.create({ path })
      .then(wal => {
        // write all buffers as log entries
        return buffers.reduce(
            (acc, data) => acc.then(() => wal.write(data)),
            Promise.resolve())
          // commit the first entry
          .then(() => wal.commit(0))
          // try to truncate the second entry
          .then(() => wal.truncate(1))
          .then(size => {
            t.equal(size, wal.size, 'result is truncated log size in bytes');
            t.equal(wal.next, 1, 'truncated entry becomes new write head (.next)');
            t.equal(wal.commitHead, 0, '.committedHead equals last committed LSN');
            t.end();
          });
      })
      .catch(err => t.fail('' + err.stack));
  });
});

test('.write(data) succeeds after unsuccessful .truncate', t => {
  tmp.tmpName((err, path) => {
    if (err) t.fail('' + err);
    let buffers = [
      new Buffer('commit first data.', 'utf8'),
      new Buffer('commit second data.', 'utf8'),
      new Buffer('commit third data.', 'utf8')
    ];
    WriteAheadLog.create({ path })
      .then(wal => {
        // write all buffers as log entries
        return buffers.reduce(
            (acc, data) => acc.then(() => wal.write(data)),
            Promise.resolve())
          // commit the first entry
          .then(() => wal.commit(0))
          .then(() => wal.truncate(0))
          .catch(() => {
            buffers.push(new Buffer('commit fourth data.', 'utf8'));
            return wal.write(buffers[3]);
          })
          .then(lsn => {
            t.equal(lsn, 3, 'lsn should be next expected LSN');
            t.equal(wal.commitHead, 0, 'commit head doesn\'t change');
            t.end();
          });
      })
      .catch(err => t.fail('' + err.stack));
  });
});

test('.write(data) succeeds after successful .truncate', t => {
  tmp.tmpName((err, path) => {
    if (err) t.fail('' + err);
    let buffers = [
      new Buffer('commit first data.', 'utf8'),
      new Buffer('commit second data.', 'utf8'),
      new Buffer('commit third data.', 'utf8'),
      new Buffer('commit fourth data.', 'utf8')
    ];
    WriteAheadLog.create({ path })
      .then(wal => {
        // write all buffers as log entries
        return buffers.reduce(
            (acc, data) => acc.then(() => wal.write(data)),
            Promise.resolve())
          // commit the first entry
          .then(() => wal.commit(0))
          .then(() => wal.truncate(1))
          .then(() => wal.write(buffers[2]))
          .then(lsn => {
            t.equal(lsn, 1, 'lsn should be the LSN that was truncated');
            t.equal(wal.commitHead, 0, 'commit head doesn\'t change');
            t.end();
          });
      })
      .catch(err => t.fail('' + err.stack));
  });
});

test('.recover() fails when handler unspecified', t => {
  tmp.tmpName((err, path) => {
    if (err) t.fail('' + err);
    WriteAheadLog.create({ path })
      .then(wal => wal.recover())
      .catch(err => {
        t.equal('' + err,
          'AssertionError: handler (function) is required',
          'AssertionError: handler (function) is required');
        t.end();
      });
  });
});

test('.recover() is benign when called on a new, empty log', t => {
  tmp.tmpName((err, path) => {
    if (err) t.fail('' + err);
    WriteAheadLog.create({ path })
      .then(wal => wal.recover(false))
      .then(wal => {
        t.equal(wal.name, path, '.name is the temp file');
        t.equal(wal.size, 0, '.size is 0 (zero)');
        t.equal(wal.next, 0, '.next is 0 (zero)');
        t.equal(wal.commitHead, -1, '.commitHead is -1 (none)');
        t.end();
      })
      .catch(err => {
        t.fail('' + err);
      });
  });
});

test('.recover(false) is benign when all entries are committed', t => {
  tmp.tmpName((err, path) => {
    if (err) t.fail('' + err);
    let buffers = [
      new Buffer('commit first data.', 'utf8'),
      new Buffer('commit second data.', 'utf8')
    ];
    WriteAheadLog.create({ path })
      .then(wal => {
        // write all buffers as log entries
        return buffers.reduce(
            (acc, data) => acc.then(() => wal.write(data)
              .then(lsn => wal.commit(lsn))),
            Promise.resolve())
          .then(() => wal.recover(false))
          .then(() => {
            t.equal(wal.next, buffers.length, '.next is the LSN count');
            t.equal(wal.commitHead, wal.next - 1, '.commitHead is the last LSN');
            t.end();
          });
      })
      .catch(err => t.fail('' + err.stack));
  });
});

test('.recover(false) truncates after the last committed LSN (discards uncommitted)', t => {
  tmp.tmpName((err, path) => {
    if (err) t.fail('' + err);
    let buffers = [
      new Buffer('commit first data.', 'utf8'),
      new Buffer('commit second data.', 'utf8'),
      new Buffer('commit third data.', 'utf8'),
      new Buffer('commit fourth data.', 'utf8')
    ];
    WriteAheadLog.create({ path })
      .then(wal => {
        // write all buffers as log entries
        return buffers.reduce(
            (acc, data) => acc.then(() => wal.write(data)
              .then(lsn => {
                return (lsn < 2) ? wal.commit(lsn) : lsn;
              })),
            Promise.resolve())
          .then(() => wal.recover(false))
          .then(() => {
            t.equal(wal.next, 2, '.next is the committed LSN count');
            t.equal(wal.commitHead, 1, '.commitHead is the last LSN committed');
            t.end();
          });
      })
      .catch(err => t.fail('' + err.stack));
  });
});

test('.recover(handler) handler is called for each uncommitted entry', t => {
  tmp.tmpName((err, path) => {
    if (err) t.fail('' + err);
    let buffers = [
      new Buffer('commit first data.', 'utf8'),
      new Buffer('commit second data.', 'utf8'),
      new Buffer('commit third data.', 'utf8'),
      new Buffer('commit fourth data.', 'utf8')
    ];
    WriteAheadLog.create({ path })
      .then(wal => {
        // write all buffers as log entries
        return buffers.reduce(
            (acc, data) => acc.then(() => wal.write(data)
              .then(lsn => {
                return (lsn < 2) ? wal.commit(lsn) : lsn;
              })),
            Promise.resolve())
          .then(() => new Promise((resolve, reject) => {
            let n = 2;

            function recoveryHandler(lsn, entry) {
              t.equal(lsn, n, `LSNs are processed in order: ${n}`);
              t.equal(entry.toString('hex'), buffers[n++].toString('hex'), 'entry has expected binary data');
              // true indicates the LSN should be committed; false indicates truncate here.
              return true;
            }
            return wal.recover(recoveryHandler)
              .then(() => {
                t.equal(wal.next, buffers.length, '.next is the committed count');
                t.equal(wal.commitHead, buffers.length - 1, '.commitHead is the last LSN committed');
                t.end();
                resolve();
              })
              .catch(err => reject(err));
          }));
      })
      .catch(err => t.fail('' + err.stack));
  });
});

test('.recover(handler) truncates after first falsy response from handler', t => {
  tmp.tmpName((err, path) => {
    if (err) t.fail('' + err);
    let buffers = [
      new Buffer('commit first data.', 'utf8'),
      new Buffer('commit second data.', 'utf8'),
      new Buffer('commit third data.', 'utf8'),
      new Buffer('commit fourth data.', 'utf8')
    ];
    WriteAheadLog.create({ path })
      .then(wal => {
        // write all buffers as log entries
        return buffers.reduce(
            (acc, data) => acc.then(() => wal.write(data)
              .then(lsn => {
                return (lsn < 2) ? wal.commit(lsn) : lsn;
              })),
            Promise.resolve())
          .then(() => new Promise((resolve, reject) => {
            let n = 2;

            function recoveryHandler(lsn, entry) {
              t.equal(lsn, n, `LSNs are processed in order: ${n}`);
              t.equal(entry.toString('hex'), buffers[n].toString('hex'), 'entry has expected binary data');
              // true indicates the LSN should be committed; false indicates truncate here.
              return (n++ < 3);
            }
            return wal.recover(recoveryHandler)
              .then(() => {
                t.equal(wal.next, buffers.length - 1, '.next is the committed count');
                t.equal(wal.commitHead, buffers.length - 2, '.commitHead is the last LSN committed');
                t.end();
                resolve();
              })
              .catch(err => reject(err));
          }));
      })
      .catch(err => t.fail('' + err.stack));
  });
});

test('.readRange() fails when arguments not specified', t => {
  tmp.tmpName((err, path) => {
    if (err) t.fail('' + err);
    WriteAheadLog.create({ path })
      .then(wal => wal.readRange())
      .catch(err => {
        t.equal('' + err,
          'AssertionError: first (number) is required',
          'AssertionError: first (number) is required');
        t.end();
      });
  });
});

test('.readRange(first) streams all entries when first is in range', t => {
  tmp.tmpName((err, path) => {
    if (err) t.fail('' + err);
    let buffers = [
      new Buffer('commit first data.', 'utf8'),
      new Buffer('commit second data.', 'utf8'),
      new Buffer('commit third data.', 'utf8'),
      new Buffer('commit fourth data.', 'utf8')
    ];
    WriteAheadLog.create({ path })
      .then(wal => buffers.reduce(
          (acc, data) => acc.then(() => wal.write(data)
            .then(lsn => wal.commit(lsn))),
          Promise.resolve())
        .then(() => wal.readRange(0))
        .then(stream => spool(stream))
        .then(entries => {
          t.equal(entries.length, buffers.length, 'all entries were returned');
          entries.forEach((entry, i) => {
            t.equal(entry.toString('hex'), buffers[i].toString('hex'), `[${i}] log entry's bytes are equal to the orig buffer's bytes`);
          });
          t.end();
        }))
      .catch(err => t.fail('' + err.stack));
  });
});

test('.readRange(index, count) streams count entries from the log starting at index', t => {
  tmp.tmpName((err, path) => {
    if (err) t.fail('' + err);
    let buffers = [
      new Buffer('commit first data.', 'utf8'),
      new Buffer('commit second data.', 'utf8'),
      new Buffer('commit third data.', 'utf8'),
      new Buffer('commit fourth data.', 'utf8')
    ];
    let first = 1;
    let count = 2;
    WriteAheadLog.create({ path })
      .then(wal => buffers.reduce(
          (acc, data) => acc.then(() => wal.write(data)
            .then(lsn => wal.commit(lsn))),
          Promise.resolve())
        .then(() => wal.readRange(first, count))
        .then(stream => spool(stream))
        .then(entries => {
          t.equal(entries.length, count, 'count entries were returned');
          entries.forEach((entry, i) => {
            t.equal(entry.toString('hex'), buffers[i + first].toString('hex'), `[${i+first}] log entry's bytes are equal to the orig buffer's bytes`);
          });
          t.end();
        }))
      .catch(err => t.fail('' + err.stack));
  });
});
