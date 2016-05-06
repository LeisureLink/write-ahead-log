# write-ahead-log [![Circle CI](https://circleci.com/gh/LeisureLink/write-ahead-log.svg?style=svg)](https://circleci.com/gh/LeisureLink/write-ahead-log)

An implementation of write-ahead logging (WAL) for nodejs.

## Why

Write-ahead logging (WAL) is a building block used to improve automicity and durability in distributed systems. WAL improves these properties by providing persistent, sequenced storage for _Log Entries_ as well as a record of which _Log Entries_ have been committed. Since networks, software systems, and storage devices are unreliable, write-ahead logging also provides a mechanism to recover from failure.

## Keep it Simple

`wal` is a simple, abstract, write-ahead log. It won't provide much value unless you define a semantic for your application.

In our implementation, _Log Entries_ are opaque binary values, defined and interpreted by you. Likewise, what it means to commit is also defined by you. For example, if you were to use `wal` in a data replication utility, _committed_ may mean the _Log Entry_ has been successfully distributed and acknowledged by your replicas.

We also define _Log Serial Number_ (LSN) as an integer identfier numbered from 0 (zero) and incremented for each _Log Entry_. Our implementation guarantees that committed LSNs will never repeat or be re-issued.

We provide a simple recovery mechanism that visits each uncommitted entry, in order, and commits each, as long as the handler you supply indicates it is safe to do so by returning a truthy value; when your handler returns a falsy value, remaining uncommitted _Log Entries_ are truncated. The LSN/index associated with those uncommitted _Log Entries_ will be re-issued whan a subsequent _Log Entry_ is made. This scheme enables our algorithm to be simple and fast. If your code requires guaranteed unique LSNs across restarts (a requirement for most database systems), we feel we have provided the collaboration semantics necessary for you to implement such guarantees on top of `wal` as an additional level of LSN indirection.

## Install

```bash
npm install wal
```

## Use

**es5**
```javascript
var WriteAheadLog = require('wal').WriteAheadLog;
```

**es6**
```javascript
import { WriteAheadLog } from 'wal';
```

### Write-Work-Commit Cycle

Write-ahead logging is accomplished through in a _write-work-commit_ cycle.

* First &mdash; `write` a log entry containing enough information to describe the activity and recover it if there is a subsequent failure,
* Second &mdash; perform the work,
* Third &mdash; when the activity is completed, `commit` the log entry; otherwise, if the activity cannot be completed, `truncate` the log at the log entry's LSN.

```javascript
const WriteAheadLog = require('wal');
const stdout = console.log.bind(console);
const stderr = console.error.bind(console);

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

```

Chaos can occur at any time, for an illustration of simple failure and recovery, run the example script [chaotic-operations](https://github.com/LeisureLink/write-ahead-log/blob/master/examples/chaotic-operations.js) and monitor what happens in both the log and index. This should give you a feel for how to scaffold on top of `wal`.

### Sequencing

`wal` imposes strict ordering of commits; LSN/indexes must be committed in order. Obviously parallel operations, such as those waiting on IO will often complete out of order. It is the responsibility of the caller to ensure that out of order completion is resequenced before being applied to the log for commit.

## Detailed Documentation (esdoc)

Detailed documentation is produced from code using [`esdoc`](https://esdoc.org/) and [is available online](https://leisurelink.github.io/write-ahead-log/).

To build the documentation locally, use `npm run docs` on the command line.

## Module API

**Classes:**

* [`WriteAheadLog`](#user-content-writeaheadlog-class) : _class_ &ndash; a simple write-ahead logging implementation.

**Methods:**

* `.create(options)` &ndash; creates a write-ahead log using the specified options.
* `.open(options)` &ndash; opens an existing a write-ahead log using the specified options.
* `.openOrCreate(options)` &ndash; opens a specified write-ahead log if it exists; otherwise creates and opens the log.

#### WriteAheadLog Class

An encapsulation of write-ahead logging behavior.

**Properties:**

* `.name` &ndash; the name of the log file (fully qualified path).
* `.index` &ndash; the name of the log file's index (fully qualified path).
* `.writable` &ndash; indicates whether the log was opened in a writable mode.
* `.size` &ndash; the log files size in bytes.
* `.head` &ndash; the log's next LSN/index (the write head).
* `.commitHead` &ndash; the LSN/index of the most recently committed log entry.

**Methods:**

* `.close()` &ndash; performs a normal close.
* `.commit(index)` &ndash; commits the specified LSN/index.
* `.isCommitted(index)` &ndash; determines if the specified LSN/index has been committed.
* `.read(index)` &ndash; reads the log entry at the specified LSN/index.
* `.readRange(first, count)` &ndash; streams the log entries starting at the first specified LSN/index until the specified number of log entries have been returned.
* `.recover(handler)` &ndash; performs recovery logic against uncommitted log entries.
* `.truncate(from)` &ndash; truncates uncommitted log entries starting at the specified LSN/index.
* `.write(data)` &ndash; writes the specified data buffer next log entry.


## License

[MIT](https://github.com/LeisureLink/write-ahead-log/blob/master/LICENSE)
