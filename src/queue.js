'use strict';

const $queue = Symbol('queue');
const $offset = Symbol('offset');

/**
 * A simple queue class.
 *
 * This is an obvious es6 dirivative of [Stephen Morley's queue implementation](http://code.stephenmorley.org/javascript/queues/).
 */
class Queue {

  /**
   * Creates a new instance.
   */
  constructor() {
    this[$queue] = [];
    this[$offset] = 0;
  }

  /**
   * @type {number} The queue's length.
   */
  get length() {
    return (this[$queue].length - this[$offset]);
  }

  /**
   * @type {boolean} Indicates whether the queue is empty.
   */
  get isEmpty() {
    return (this.length === 0);
  }

  /**
   * Enqueues the specified item.
   * @param item - An item to put on the queue.
   */
  enqueue(item) {
    this[$queue].push(item);
  }

  /**
   * Dequeues the item at the head of the queue, removing the item.
   * @return The item at the head of the queue or `undefined` if the queue is empty.
   */
  dequeue() {
    if (this.length === 0) {
      return undefined;
    }
    let item = this[$queue][this[$offset]];
    if (++this[$offset] * 2 >= this[$queue].length) {
      this[$queue] = this[$queue].slice(this[$offset]);
      this[$offset] = 0;
    }
    return item;
  }

  /**
   * Peeks at the item at the head of the queue without removing it.
   * @return The item at the head of the queue or `undefined` if the queue is empty.
   */
  peek() {
    return (this.length > 0 ? this[$queue][this[$offset]] : undefined);
  }
}

export default Queue;
