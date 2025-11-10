import type { FiberNode, UnknownProps } from 'faiwer-react/types';
import { Heap } from './heap';
import { getFiberLevel } from './fibers';

/**
 * A wrapper over Heap and Set to control the queue of invalidated components.
 * Using a heap to be able to return the highest item (within the tree). Using
 * a map to be able to remove items when needed (e.g. a parent component removes
 * some children that were already invalidated).
 *
 * TODO: Add tests
 */
export class Queue {
  private heap = new Heap<FiberNode>(
    (a, b) => getFiberLevel(b) - getFiberLevel(a),
  );
  private map = new Map<FiberNode, UnknownProps | null>();

  isEmpty(): boolean {
    this.prune();
    return this.heap.size() === 0;
  }

  add(fiber: FiberNode, props: UnknownProps | null): void {
    if (this.map.has(fiber)) {
      if (props) {
        this.map.set(fiber, props);
      }
      return;
    }

    this.map.set(fiber, props);
    this.heap.add(fiber);
  }

  has(fiber: FiberNode): boolean {
    return this.map.has(fiber);
  }

  poll(): [fiber: FiberNode, props: UnknownProps | null] {
    this.prune();
    const fiber = this.heap.poll()!;
    const props = this.map.get(fiber)!;
    this.map.delete(fiber);

    return [fiber, props];
  }

  delete(fiber: FiberNode): void {
    this.map.delete(fiber);
    this.prune();
  }

  traverse(fn: (fiber: FiberNode) => void | boolean): void {
    for (const fiber of this.heap.arr) {
      if (this.map.has(fiber)) {
        fn(fiber);
      }
    }
  }

  private prune(): void {
    while (this.heap.size() > 0 && !this.map.has(this.heap.peek()!)) {
      this.heap.poll();
    }
  }
}
