'use strict';

const cluster = require('cluster');

const WriteAheadLog = require('../').WriteAheadLog;

const stdout = console.log.bind(console); // eslint-disable-line no-console
const stderr = console.error.bind(console); // eslint-disable-line no-console

const objective = 25;

const path = __filename + '.wal';
const writable = true;

function chaos(action) {
  let n = Math.floor(Math.random() * (100 - 1) + 1);
  if (!(n % 7)) {
    throw new Error(`Chaos struck while ${action}!`);
  }
}

function job(jobId) {
  // this is a simulation, you would probably do something more interesting.
  stdout(`${process.pid} performing job: ${jobId}`);
  return new Promise((resolve, reject) =>
    setTimeout(() => {
      try {
        chaos('working');
        stdout(`${process.pid} done with job: ${jobId}`);
        resolve();
      } catch (err) {
        reject(err);
      }
    }, 1000));
}

function chaoticWriteEntries(wal) {
  let committed = wal.commitHead;
  chaos('writing log');

  function cycle(jobId) {
    let data = new Buffer(`job #${jobId}\r\n`);
    // 1. Log the data; this data is our opaque log entry...
    return wal.write(data)
      .then(lsn => {
        chaos('preparing the work');

        // 2. Do the actual work...
        return job(jobId).then(() => {
          chaos('preparing to commit');

          // 3. Commit the log up to the LSN.
          return wal.commit(lsn)
            .then(() => {
              process.send({ jobId });
              stdout(`${process.id} committed job: ${jobId}\r\n`);
            });
        });
      })
      // recurse until we've met our objective
      .then(() => (jobId < objective) ? cycle(jobId + 1) : wal);
  }

  // We'll just use the LSN as our job number...
  return (committed < objective) ? cycle(committed + 1) : wal;
}

let file;

function exitFail(err) {
  stderr('' + err);
  if (file) {
    file.close();
  }
  process.exit(-1);
}

function exitSuccess(log) {
  return log.close()
    .then(() => process.exit(0));
}

let observed = 0;

function onWorkerMessage(worker, msg) {
  observed = msg.jobId;
}

if (cluster.isMaster) {
  let worker = cluster.fork();
  worker.on('message', onWorkerMessage.bind(null, worker));

  cluster.on('exit', (exited, code) => {
    stdout(`worker ${exited.process.pid} exited with code ${code}`);
    if (code !== 0 && observed < objective) {
      worker = cluster.fork();
      worker.on('message', onWorkerMessage.bind(null, worker));
    }
  });
} else {

  WriteAheadLog.openOrCreate({ path, writable })
    .then(wal => wal.recover(false)) // truncate all uncommitted
    .then(wal => chaoticWriteEntries(file = wal))
    .then(exitSuccess)
    .catch(exitFail);
}
