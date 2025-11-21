import {
  type DomNode,
  type FiberNode,
  type TagFiberNode,
} from 'faiwer-react/types';
import {
  isEmptyContainer,
  isSingleChildContainer,
  isAutoContainer,
} from '../compact';
import { isFiberDead, NULL_FIBER } from '../reconciliation/fibers';
import { scheduleEffect } from '../reconciliation/effects';
import { getAppByFiber } from '../reconciliation/app';
import {
  nullthrowsForFiber,
  ReactError,
} from '../reconciliation/errors/ReactError';

/**
 * Determines if a prop name represents an event handler by checking if it
 * starts with "on". This follows React's convention where any prop beginning
 * with "on" is treated as an event listener rather than a regular DOM
 * attribute.
 *
 * While HTML technically allows non-event attributes starting with "on", no
 * such attributes could be found in practice. React filters out all "on*" props
 * as event handlers, and this implementation follows the same pattern for
 * consistency.
 */
export const isEventName = (name: string): boolean => name.startsWith('on');

/**
 * Returns the DOM container for the given fiber node. This isn't always the
 * direct parent's element since the parent might be a component, a fragment, or
 * a portal node.
 */
export const getParentElement = (fiber: FiberNode): Element => {
  while (
    fiber.parent.type === 'component' ||
    fiber.parent.type === 'fragment'
  ) {
    fiber = fiber.parent; // Has to be "tag".
  }

  if (fiber.parent.data instanceof HTMLElement) {
    return fiber.parent.data; // Portal.
  }

  return nullthrowsForFiber(fiber, fiber.parent?.element) as Element;
};

export const asElement = (node: Node | null): Element => {
  if (!(node instanceof Element)) {
    throw new Error(`node is not element`);
  }

  return node;
};

/**
 * Returns the 1st DOM-node of the given auto-container fiber. Pass custom
 * `children` if `fiber`'s children are incorrect.
 */
export const getFirstContainerElement = (
  fiber: FiberNode,
  children = fiber.children,
): DomNode => {
  let [firstNode] = children;
  while (!(firstNode.element instanceof Node)) {
    [firstNode] = firstNode.children;
  }

  return firstNode.element as DomNode;
};

/** Returns the last DOM-node of the given auto-container fiber */
export const getLastContainerElement = (fiber: FiberNode): DomNode => {
  let lastNode = fiber.children.at(-1)!;
  while (!(lastNode.element instanceof Node)) {
    lastNode = lastNode.children.at(-1)!;
  }

  return lastNode.element as DomNode;
};

/**
 * Returns all direct DOM nodes associated with the given fiber. This isn't
 * always a single node since components and fragments may be in the
 * auto-container mode. That means they contain more then one direct DOM-nodes
 * that are inlined into the `fiber`'s DOM container.
 */
export const getFiberDomNodes = (fiber: FiberNode): DomNode[] => {
  if (isFiberDead(fiber)) {
    throw new ReactError(fiber, `Can't get fiber children for a dead fiber`);
  }

  switch (fiber.type) {
    case 'component':
    case 'fragment': {
      if (isAutoContainer(fiber)) {
        const first = getFirstContainerElement(fiber);
        const last = getLastContainerElement(fiber);
        const result: DomNode[] = [first];

        let domNode = first.nextSibling!;
        while (domNode !== last) {
          result.push(domNode as DomNode);
          domNode = domNode.nextSibling!;
        }
        result.push(last);

        return result;
      }

      if (isSingleChildContainer(fiber)) {
        return getFiberDomNodes(fiber.children[0]);
      }

      if (isEmptyContainer(fiber)) {
        return [fiber.element];
      }

      throw new ReactError(fiber, `Unknown kind of fiber`);
    }

    case 'null':
    case 'tag':
    case 'text':
      return [nullthrowsForFiber(fiber, fiber.element)];
  }
};

/**
 * When a node leaves the DOM tree, we need to update all associated ref
 * objects and ref handlers.
 */
export const unsetRef = (fiber: TagFiberNode, immediate: boolean): void => {
  const { ref } = fiber;

  if (typeof ref === 'function') {
    if (immediate) {
      ref(null);
      // TODO: add a test ^.
    } else {
      // It can be a setter (e.g., <div onRef={setContainer}/>). Since we
      // shouldn't allow invalidating components during commit phase we need
      // to schedule an async update.
      scheduleEffect(
        getAppByFiber(fiber),
        () => {
          ref(null);
        },
        'refsUnmount',
      );
    }
  } else {
    ref!.current = null;
  }
};

/**
 * To help avoid memory leaks, this method removes fiber properties that
 * can hold references to other objects.
 */
export const emptyFiberNode = (fiber: FiberNode): void => {
  // For debug purposes mark dead nodes with a negative number.
  fiber.id = -fiber.id;

  fiber.data = null;
  fiber.element = null;
  fiber.component = null;
  fiber.children = [];
  fiber.props = null;
  fiber.ref = null;
  fiber.parent = NULL_FIBER;
};

/**
 * Calls the given fn against every single child in the fiben fiber tree.
 * Return `false` to stop traversing right away.
 */
export const traverseFiberTree = (
  fiber: FiberNode,
  fn: (fiber: FiberNode) => boolean | void,
): boolean => {
  if (fn(fiber) === false) {
    return false;
  }

  for (const child of fiber.children) {
    if (traverseFiberTree(child, fn) === false) {
      return false;
    }
  }

  return true;
};
