import type { ElementNode, ScalarNode } from 'faiwer-react/types';

type Children = {
  count: (children: JSX.Element[]) => number;
  only: (children: JSX.Element) => asserts children is ElementNode | ScalarNode;
  forEach: (
    children: JSX.Element[],
    fn: (child: ElementNode | ScalarNode) => void,
    objThis?: unknown,
  ) => void;
  map: <T>(
    chidlren: JSX.Element[],
    fn: (child: ElementNode | ScalarNode) => T,
    objThis?: unknown,
  ) => T[];
  toArray: (children: JSX.Element[]) => Array<ElementNode | ScalarNode>;
};

export const Children: Children = {
  count: (children) => {
    return Children.toArray(children).length;
  },

  forEach: (children, fn, objThis): void => {
    for (const child of children) {
      if (Array.isArray(child)) {
        Children.forEach(child, fn, objThis);
      } else {
        fn.call(objThis, child);
      }
    }
  },

  map: <T>(
    chidlren: JSX.Element[],
    fn: (child: ElementNode | ScalarNode) => T,
    objThis?: unknown,
  ): T[] => {
    const result: T[] = [];
    Children.forEach(
      chidlren,
      (child) => {
        result.push(fn.call(objThis, child));
      },
      objThis,
    );
    return result;
  },

  only(children) {
    if (!Array.isArray(children)) {
      children = [children];
    }

    const items = Children.toArray(children);
    if (items.length !== 1) {
      throw new Error(`Found ${items.length} children. Expected only one`);
    }
  },

  toArray: (children) => {
    return Children.map(children, (child) => child);
  },
};
