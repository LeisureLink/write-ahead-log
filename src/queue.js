'use strict';

const $queue = Symbol('queue');
const $offset = Symbol('offset');

class Queue {
  constructor() {
    this[$queue] = [];
    this[$offset] = 0;
  }

  get length() {
    return (this[$queue].length - this[$offset]);
  }

  get isEmpty() {
    return (this.length === 0);
  }

  enqueue(item) {
    this[$queue].push(item);
  }

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

  peek() {
    return (this.length > 0 ? this[$queue][this[$offset]] : undefined);
  }
}

export default Queue;
