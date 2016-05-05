'use strict';

const crypto = require('crypto');
const equal = require('deep-equal');
const fs = require('fs');
const path = require('path');
const promisify = require('es6-promisify');
const WriteAheadLog = require('../');

const access = promisify(fs.access);
const stderr = console.error.bind(console); // eslint-disable-line no-console

function randomInt(low, high) {
  return Math.floor(Math.random() * (high - low) + low);
}

let log;

const options = {
  path: path.resolve(path.join(__dirname, 'test.wal')),
  writable: true
};

access(options.path)
  .then(() => WriteAheadLog.open(options))
  .catch(err => {
    // if it doesn't exist we'll create it...
    if (err.code === 'ENOENT') {
      return WriteAheadLog.create(options);
    }
    throw err;
  })
  .then(wal => {
    log = wal;

    const min = 8;
    const max = 1024;
    const count = 1000;
    const reads = count;
    const entries = [];
    let offset = 0;

    // generate many random buffers
    for (let index = 0; index < count; ++index) {
      const bytes = randomInt(min, max);
      const entry = {
        index,
        description: `This is log entry ${index}.`,
        data: new Buffer(crypto.randomBytes(bytes), 'binary')
      };
      const data = new Buffer(JSON.stringify(entry), 'utf-8');
      const length = data.length;
      entries.push({ index, offset, length, data });
      offset += length;
    }

    let series = entries.reduce((acc, rec) => {
      return acc.then(() => {
        return log.write(rec.data);
      });
    }, Promise.resolve(0));

    return series.then(
        () => {
          // ramdomly read the records and compare them to the
          // values written...
          let comparisons = Promise.resolve();
          for (let i = 0; i < reads; ++i) {
            let j = randomInt(0, count);
            let rec = entries[j];
            comparisons = comparisons
              .then(() => log.read(rec.index)) // eslint-disable-line no-loop-func
              .then(data => {
                if (!equal(rec.data, data)) {
                  throw new Error(`Oopsie! Expected ${rec.data} but got ${data}`);
                }
              });
          }
          return comparisons;
        })
      .then(() => new Promise((resolve, reject) => {
        let first = 10;
        let count = 10;
        let range = [];
        let stream = log.readRange(first, count);
        stream.on('data', data => range.push(data));
        stream.on('end', () => {
          try {
            range.forEach((data, i) => {
              let rec = entries[first + i];
              if (!equal(rec.data, data)) {
                throw new Error(`Oopsie! Expected ${rec.data} but got ${data}`);
              }
            });
            resolve();
          } catch (err) {
            reject(err);
          }
        });
        stream.on('error', err => reject(err));
      }));
  })
  .catch(err => stderr('' + err.stack))
  .then(() => log.close());
