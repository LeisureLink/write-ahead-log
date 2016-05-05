'use strict';

const WriteAheadLog = require('../').WriteAheadLog;

const stdout = console.log.bind(console); // eslint-disable-line no-console
const stderr = console.error.bind(console); // eslint-disable-line no-console

function chaos(action) {
  let n = Math.floor(Math.random() * (100 - 1) + 1);
  if (!(n % 13)) {
    throw new Error(`Chaos struck while ${action}!`);
  }
}

function job(jobId) {
  // this is a simulation, you would probably do something more interesting.
  stdout(`performing job: ${jobId}`);
  return new Promise((resolve, reject) =>
    setTimeout(() => {
      try {
        chaos('working');
        stdout(`done with job: ${jobId}`);
        resolve();
      } catch (err) {
        reject(err);
      }
    }, 1000));
}

const path = __filename + '.wal';
const writable = true;

WriteAheadLog.openOrCreate({ path, writable })
  // usually when you open a log you'll want to run recovery in case of prior failure.
  //   here we're telling wal to truncate all uncommitted entries.
  .then(wal => wal.recover(false))
  .then(wal => {
    let committed = wal.commitHead;

    chaos('writing log');

    // We'll just use the LSN as our job number...
    let jobId = committed + 1;
    let data = new Buffer(`job #${jobId}\r\n`);

    // 1. Log some data; this data is opaque to the log...
    return wal.write(data)
      .then(lsn => {

        chaos('preparing the work');

        // 2. Do the actual work...
        return job(jobId).then(() => {

          chaos('preparing to commit');

          // 3. Commit the log up to the LSN.
          return wal.commit(lsn)
            .then(() => {
              stdout(`committed job: ${jobId}`);
            });
        });
      })
      .then(() => wal.close());
  })
  .catch(err => stderr('' + err));
