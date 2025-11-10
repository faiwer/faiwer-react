type TCollator<T> = (a: T, b: T) => number;

// TODO: Add tests
export class Heap<T> {
  arr: T[] = [];

  constructor(private collator: TCollator<T>) {}

  static fromArray<T>(items: T[], collator: TCollator<T>): Heap<T> {
    const heap = new Heap<T>(collator);

    for (const item of items) heap.arr.push(item);

    for (let i = Math.floor(items.length / 2); i >= 0; --i) heap.heapify(i);

    return heap;
  }

  private collate(a: T, b: T): boolean {
    return this.collator(a, b) >= 0;
  }

  private heapify(idx: number): void {
    const item = this.arr[idx];
    if (item == null) return;

    const lIdx = this.getChildItemIdx(idx, true);
    const lItem = this.arr[lIdx];

    const rIdx = this.getChildItemIdx(idx, false);
    const rItem = this.arr[rIdx];

    const len = this.arr.length;

    if (
      lIdx < len &&
      this.collate(lItem, item) &&
      (rIdx >= len || this.collate(lItem, rItem))
    ) {
      this.arr[lIdx] = item;
      this.arr[idx] = lItem;
      return this.heapify(lIdx);
    }

    if (rIdx < len && this.collate(rItem, item)) {
      this.arr[rIdx] = item;
      this.arr[idx] = rItem;
      return this.heapify(rIdx);
    }
  }

  private getChildItemIdx(idx: number, isLeft: boolean): number {
    return idx * 2 + (isLeft ? 1 : 2);
  }

  private getParentItemIdx(idx: number): number {
    return Math.floor((idx - 1) / 2);
  }

  size(): number {
    return this.arr.length;
  }

  add(item: T): void {
    let idx = this.arr.push(item) - 1;
    let parentIdx = this.getParentItemIdx(idx);

    while (parentIdx >= 0 && this.collate(item, this.arr[parentIdx])) {
      this.arr[idx] = this.arr[parentIdx];
      this.arr[parentIdx] = item;

      idx = parentIdx;
      parentIdx = this.getParentItemIdx(parentIdx);
    }
  }

  pollToArray(): T[] {
    const arr: T[] = [];
    while (this.size() > 0) arr.push(this.poll()!);
    return arr;
  }

  peek(): T | null {
    return this.size() > 0 ? this.arr[0] : null;
  }

  poll(): T | null {
    if (!this.size()) return null;

    const root = this.arr[0];

    const last = this.arr.pop()!;
    if (this.arr.length !== 0) {
      this.arr[0] = last;
      this.heapify(0);
    }

    return root;
  }
}
