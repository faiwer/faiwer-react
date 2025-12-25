import type { ElementNode, FiberNode } from 'faiwer-react/types';
import { nullthrowsForFiber } from './errors/ReactError';

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

/** To avoid mess and havoc, we keep new DOM nodes in a temporary
 * <x-container/> DOM node until the Relayout action comes into play. */
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
    source: null,
  }) satisfies Record<keyof FiberNode, unknown>;

export const NULL_FIBER = null as unknown as FiberNode;

/**
 * A small optimization. To avoid having `children: [[node]]`, we may flatten
 * it. But this can only be done with non-keyed regular fragments.
 */
export const toFiberChildren = (fiber: FiberNode): FiberNode[] => {
  if (fiber.type === 'fragment' && fiber.role === null && fiber.key === null) {
    for (const child of fiber.children) {
      // Fix the parent, since we moved them 1 level up.
      child.parent = nullthrowsForFiber(child, child.parent.parent);
    }
    return fiber.children;
  }

  return [fiber];
};

/**
 * Returns `true` when the given fiber:
 * - was removed
 * - was abandoned (its content moved to another node)
 */
export const isFiberDead = (fiber: FiberNode) => fiber.id < 0;

/**
 * Returns `true` if the given fiber is THE root of the whole fiber tree.
 */
export const isRootFiber = (fiber: FiberNode): boolean => fiber.tag === 'root';

/**
 * Returns a new fiber node that is identical to the given one, besides it
 * doesn't have any state. Like if it was just created from a JSX element.
 */
export const cloneFiber = (node: FiberNode): FiberNode => {
  switch (node.type) {
    case 'component': {
      return {
        ...node,
        children: [], // Children will be set on the component run()
        data: {
          hooks: null, // 1st render,
          actions: [],
          isErrorBoundary: false,
          remount: false,
        },
      };
    }

    case 'tag': {
      return node.role === 'portal'
        ? {
            ...node,
            children: node.children.map((n) => cloneFiber(n)),
            // .data is HTMLElement, keep it
          }
        : {
            ...node,
            children: node.children.map((n) => cloneFiber(n)),
            data: {
              events: {},
              styles: null,
            },
          };
    }

    case 'fragment':
    case 'null':
    case 'text':
      return {
        ...node,
        children: node.children.map((n) => cloneFiber(n)),
        // .data is either null or ContextState.
      };
  }
};

export const isJsxElementNode = (node: unknown): node is ElementNode =>
  !!node &&
  typeof node === 'object' &&
  'type' in node &&
  (typeof node.type === 'string' ||
    typeof node.type === 'function' ||
    node.type instanceof Node) &&
  'props' in node &&
  `key` in node &&
  'children' in node &&
  'source' in node;
