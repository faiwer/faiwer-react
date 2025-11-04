import type { ElementNode, ScalarNode } from "faiwer-react/types";

export const Children = {
  count: (children: JSX.Element[]): number => {
  },
  forEach: (
    children: JSX.Element[],
    fn: (child: ElementNode | ScalarNode) => void,
    objThis?: unknown,
  ): void => {
  },
  map: <T>(
    chidlren: JSX.Element[],
    fn: (child: ElementNode | ScalarNode) => T,
    objThis?: unknown,
  ): T[] => {
  },
  only(children: JSX.Element): asserts children is ElementNode | ScalarNode {
  },
  toArray: (children: JSX.Element[]): Array<ElementNode | ScalarNode> => {
  },
};