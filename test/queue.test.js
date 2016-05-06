'use strict';

const test = require('tape');
const Queue = require('../').Queue;

test('.ctor errors when called as fn', t => {
  // behavior put in place by babel's transpiler
  t.throws(() => {
    Queue();
  },
  'TypeError: Cannot call class as function',
  'TypeError: Cannot call class as function');
  t.end();
});

test('.ctor creates an instance (duh)', t => {
  let q = new Queue();
  t.ok(q.isEmpty, 'queue is initially empty');
  t.equal(q.length, 0, 'queue length is 0 (zero)');
  t.end();
});

test('.enqueue() without arguments queues undefined', t => {
  let q = new Queue();
  q.enqueue();
  t.notOk(q.isEmpty, 'queue not empty');
  t.equal(q.length, 1, 'queue length of 1 (one)');
  t.equal(q.peek(), undefined, 'queued item is undefined (when peeked)');
  t.end();
});

test('.enqueue(null)', t => {
  let q = new Queue();
  q.enqueue(null);
  t.notOk(q.isEmpty, 'queue not empty');
  t.equal(q.length, 1, 'queue length of 1 (one)');
  t.equal(q.peek(), null, 'queued item is null (when peeked)');
  t.end();
});

test('.enqueue(null)', t => {
  let data = [];
  let q = new Queue();
  for (let i = 0; i < 10000; ++i) {
    data.push(Math.random());
    q.enqueue(data[i]);
  }
  // drain the queue
  data.forEach((item, i) => {
    if (q.isEmpty) {
      t.fail('queue should not be empty');
    }
    if (item !== q.dequeue()) {
      t.fail(`dequeued item ${i} is out of sequence with the items queued`);
    }
  });
  t.ok(q.isEmpty, 'drained queue is empty');
  t.equal(q.length, 0, 'drained queue length is 0 (zero)');
  t.end();
});

test('.dequeue() returns undefined on empty queue', t => {
  let q = new Queue();
  t.ok(q.isEmpty, 'queue is empty');
  t.equal(q.dequeue(), undefined, 'dequeued item is undefined');
  t.end();
});
