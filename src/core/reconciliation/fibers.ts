import type { FiberNode } from 'faiwer-react/types';
import { nullthrows } from 'faiwer-react/utils';

/**
 * Theoretically, fiber can't change its level. So this function linearly
 * calculates the fiber's level and caches the result in fiber.level.
 */
export const getFiberLevel = (fiber: FiberNode): number => {
  if (fiber.level !== null) {
    return fiber.level;
  }

  fiber.level = getFiberLevel(fiber.parent) + 1;
  return fiber.level;
};

/** To avoid having mess and havoc we keep new DOM-nodes in a temporary
 * <x-container/> DOM-node until the Relayout action comes into play. */
export const FAKE_CONTAINER_TAG = 'x-container';

/** Pseudo tagName for fragment JSX.Elements. Not used anywhere but in
 * jsxElementToFiberNode to differentiate fragments from tags. */
export const FRAGMENT_TAG = 'x-fragment';

let fiberIdx = 0;
export const createFiberNode = (parent: FiberNode) =>
  ({
    id: ++fiberIdx,
    appId: parent.appId,
    type: null,
    role: null,
    parent,
    level: null,
    key: null,
    ref: null,
    component: null,
    element: null,
    props: null,
    tag: null,
    children: [],
    data: null,
  }) satisfies Record<keyof FiberNode, unknown>;

export const NULL_FIBER = null as unknown as FiberNode;

/**
 * A little optimization. To avoid having `children: [[node]], we may flatten
 * it. But it can be done only with non-keyed regular fragments.
 */
export const toFiberChildren = (fiber: FiberNode): FiberNode[] => {
  if (fiber.type === 'fragment' && fiber.role === null && fiber.key === null) {
    for (const child of fiber.children) {
      // Fix the parent, 'cause we moved them 1-lvl up.
      child.parent = nullthrows(child.parent.parent);
    }
    return fiber.children;
  }

  return [fiber];
};
