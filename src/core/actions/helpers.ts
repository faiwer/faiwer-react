import type { DomNode, FiberNode, TagFiberNode } from 'faiwer-react/types';
import { isBeginOf, isCompactNone, isCompactSingleChild } from '../compact';
import { NULL_FIBER } from '../reconciliation/fibers';
import { buildCommentText } from '../reconciliation/comments';
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
 * direct parent's element since the parent might be a compact node or a
 * fragment-like range (<!--begin|end-->), or it could be a portal node.
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

/**
 * Finds the !--begin comment for the given !--end comment.
 */
const getBeginComment = (fiber: FiberNode): Comment => {
  let node = asComment(fiber.element).previousSibling!;
  const text = buildCommentText('begin', fiber.id);
  while (!(node instanceof Comment) || node.textContent !== text)
    node = nullthrowsForFiber(fiber, node!.previousSibling);
  return node;
};

const asElement = (node: Node | null): Element => {
  if (!(node instanceof Element)) {
    throw new Error(`node is not element`);
  }

  return node;
};

const asComment = (node: Node | null): Comment => {
  if (!(node instanceof Comment)) {
    throw new Error(`node is not comment`);
  }

  return node;
};

/**
 * Finds the anchor node for attaching other nodes. There are two scenarios:
 * 1) [element, null] - the new node should be added to the beginning of the
 *    element;
 * 2) [element, child] - the new node should be added right after `child`.
 */
export const getAnchor = (fiber: FiberNode): [Element, Node | null] => {
  if (fiber.type === 'tag') {
    return [
      asElement(
        fiber.data instanceof HTMLElement
          ? fiber.data // Portal's `element` is !--r:portal
          : fiber.element,
      ),
      null,
    ];
  }

  if (fiber.type === 'component' || fiber.type === 'fragment') {
    if (isCompactSingleChild(fiber)) {
      throw new ReactError(
        fiber,
        `Solo-compact fibers cannot be used as an anchor`,
      );
    }

    if (isCompactNone(fiber)) {
      throw new ReactError(fiber, `Cannot use !--empty node as an anchor`);
    }

    // E.g.
    // <div>
    //   <something/>
    //   <!--r:begin:1--> // a component or a fragment
    //   … // the content of the `fiber`
    //   <!--r:end:1-->
    //   <something/>
    return [getParentElement(fiber), getBeginComment(fiber)];
  }

  // "text" & "null" types cannot contain children.
  throw new ReactError(fiber, `Unsupported anchor type: ${fiber.type}`);
};

/**
 * Returns all direct DOM nodes associated with the given fiber. This isn't
 * always a single node since components and fragments may be in expanded state
 * (<!--begin--> + content + <!--end-->).
 */
export const getFiberDomNodes = (fiber: FiberNode): DomNode[] => {
  switch (fiber.type) {
    case 'component':
    case 'fragment': {
      if (isCompactSingleChild(fiber)) {
        return getFiberDomNodes(fiber.children[0]);
      }

      if (isCompactNone(fiber)) {
        return [fiber.element];
      }

      // Collect [!--begin, …content, !--end]:
      const list: DomNode[] = [nullthrowsForFiber(fiber, fiber.element)];
      let prev: DomNode | null = nullthrowsForFiber(
        fiber,
        list[0].previousSibling,
      ) as DomNode;
      while (prev && !isBeginOf(prev, fiber)) {
        list.push(prev);
        prev = nullthrowsForFiber(fiber, prev.previousSibling) as DomNode;
      }
      list.push(prev);
      return list.reverse();
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
        'refs',
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
