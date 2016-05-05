'use strict';

const WriteAheadLog = require('../').WriteAheadLog;

const stdout = console.log.bind(console); // eslint-disable-line no-console
const stderr = console.error.bind(console); // eslint-disable-line no-console

function job(jobId) {
  // this is a simulation, you would probably do something more interesting.
  return new Promise((resolve) => {
    stdout(`performing job: ${jobId}`);
    setTimeout(() => {
      stdout(`done with job: ${jobId}`);
      resolve();
    }, 1000);
  });
}

const path = __filename + '.wal';
const writable = true;

WriteAheadLog.openOrCreate({ path, writable })
  // usually when you open a log you'll want to run recovery in case of prior failure.
  //   here we're telling wal to truncate all uncommitted entries.
  .then(wal => wal.recover(false))
  .then(wal => {
    let committed = wal.commitHead;

    // We'll just use the LSN as our job number...
    let jobId = committed + 1;
    let data = new Buffer(`job #${jobId}\r\n`);

    // 1. Log some data; this data is opaque to the log...
    return wal.write(data)
      .then(lsn => {

        // 2. Do the actual work...
        return job(jobId).then(() => {

          // 3. Commit the log up to the LSN.
          return wal.commit(lsn)
            .then(() => {
              stdout(`committed job: ${jobId}`);
            });
        });
      })
      // perform a normal close.
      .then(() => wal.close());
  })
  .catch(err => stderr('' + err));
