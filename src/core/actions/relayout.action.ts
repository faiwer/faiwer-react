import { containerSym, type FiberNode } from 'faiwer-react/types';
import type { RelayoutAction } from 'faiwer-react/types/actions';
import { isCompactNone, isCompactSingleChild, isContainer } from '../compact';
import {
  asElement,
  getFiberDomNodes,
  getFirstContainerElement,
} from './helpers';
import {
  nullthrowsForFiber,
  ReactError,
} from '../reconciliation/errors/ReactError';
import { isFiberDead } from '../reconciliation/fibers';

/**
 * Handles fiber tree layout updates when children have been modified. This
 * action is triggered when:
 * - A direct child was removed or replaced
 * - Child order changed (for keyed children)
 * - A new child was added
 *
 * The relayout process:
 * - Moves new children from temporary containers (`<x-container/>`) to their
 *   final DOM position
 * - Repositions existing children to match the new order
 * - Updates the fiber's children array to reflect the new structure
 *
 * Note: This action only handles positioning and insertion. All node removals
 * must be completed before this action runs.
 */
export function relayoutAction(
  fiber: FiberNode,
  { before, after }: RelayoutAction,
) {
  if (isCompactSingleChild(fiber)) {
    // Fiber couldn't come here remaing a true single-child container:
    // - Its only child is removed
    // - … or now has a neighbor
    (fiber as FiberNode).element = containerSym;
  }

  if (after.size > 0) {
    // Determine what can be used as a starting point for inserting new children.
    // If `prev` is `null`, new nodes should be added to the beginning.
    // Otherwise, add them right after the `prev` node.
    let [container, prev] = getAnchor(fiber);

    for (const [key, r] of after) {
      const l = before.get(key);

      if (!l) {
        // No nodes from `left` correlate with this node from `right`.
        // Consider it a brand new node and put it at the current position.
        prev = insertNewFiber(fiber, container, prev, r.fiber);
      } else {
        // Keep DOM nodes from the previous render. Any requested updates for
        // them are already applied, but we might need to reposition them
        // within their parent.
        prev = repositionFiberWhenNeeded(l.fiber, container, prev);
      }
    }
  }

  // Replace fiber.children with fibers from the `after` set.
  // Skip any nodes whose keys exist in `before`, since those are either
  // unchanged or already updated (their `after` entries served only as
  // references for the update process).
  fiber.children = [...after.keys()].map(
    (key) => nullthrowsForFiber(fiber, before.get(key) ?? after.get(key)).fiber,
  );

  if (after.size > 0 && isCompactNone(fiber)) {
    // Convert !-- to auto-container, 'cause now it has children.
    fiber.element.remove();
    (fiber as FiberNode).element = containerSym;
  }

  if (fiber.type !== 'tag') {
    tryFixContainerType(fiber);
  }
}

/**
 * Puts the given `child` DOM nodes into the `parent`'s DOM area at the anchor
 * position (`container` + `prev`). Updates the `child`'s parent node.
 */
const insertNewFiber = (
  parent: FiberNode,
  container: Element,
  prev: Node | null,
  child: FiberNode,
): Node => {
  const parentElement = child.parent.element;
  if (!(parentElement instanceof Element)) {
    throw new ReactError(child.parent, `Wrong temporary container`);
  }

  const newChildren = [...parentElement.childNodes];
  if (!prev) {
    container.prepend(...newChildren);
    prev = nullthrowsForFiber(parent, newChildren.at(-1));
  } else {
    for (const n of newChildren) {
      container.insertBefore(n, prev.nextSibling);
      prev = n;
    }
  }
  child.parent = parent; // <x-container/> -> real parent.

  return prev;
};

/**
 * Repositioning is needed in such situations:
 * - before: <a/><b/><c key="c"/> -> <c key="c"/><a/><b/>.
 */
const repositionFiberWhenNeeded = (
  fiber: FiberNode,
  container: Element,
  prev: Node | null,
): Node => {
  const nodes = getFiberDomNodes(fiber);
  if (nodes[0].previousSibling !== prev) {
    for (const n of nodes) {
      if (!prev) {
        // Couldn't find a way to test this, because even without this move the
        // following `repositionFiberWhenNeeded` will heal this gap. Anyway,
        // it seems right to keep it.
        container.prepend(n);
      } else {
        container.insertBefore(n, prev.nextSibling);
      }
      prev = n;
    }
  }

  return nodes.at(-1)!;
};

/**
 * Finds the anchor DOM node for attaching other nodes. There are two scenarios:
 * 1) [element, null] - the new node should be added to the beginning of the
 *    element;
 * 2) [element, child] - the new node should be added right after `child`.
 */
const getAnchor = (fiber: FiberNode): [Element, Node | null] => {
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
    if (isCompactNone(fiber)) {
      // Put other nodes right after !--empty. The !--empty will be removed
      // afterwards, but for now it'll be anchor.
      return [fiber.element.parentElement!, fiber.element];
    }

    if (isCompactSingleChild(fiber)) {
      // The node has only one node. This node was not removed in this render
      // (otherwise `fiber` would be converted into !--empty). Put other nodes
      // right after this one. It can temporarily violate the right order, but
      // it'll be automatically healed in the same for-cycle.
      return [fiber.element.parentElement!, fiber.element];
    }

    if (isContainer(fiber)) {
      // Find any child fiber that wasn't removed in this render. Use it's as an
      // anchor. It's not necessarily the 1st node, but relyout will recover the
      // right order anyway.
      const survivedChild = nullthrowsForFiber(
        fiber,
        fiber.children.find((f) => !isFiberDead(f)),
      );
      const element = getFirstContainerElement(fiber, [survivedChild]);
      return [element.parentElement!, element];
    }
  }

  // "text" & "null" types cannot contain children.
  throw new ReactError(fiber, `Unsupported anchor type: ${fiber.type}`);
};

export const tryFixContainerType = (fiber: FiberNode): void => {
  // Handle the node itself.
  switch (fiber.children.length) {
    case 0: {
      if (!isCompactNone(fiber)) {
        throw new ReactError(fiber, `Can't recover fiber none-container`);
      }
      break;
    }

    case 1: {
      if (isCompactNone(fiber)) {
        throw new ReactError(fiber, `None-fibers can't have child nodes`);
      }

      if (isContainer(fiber) && !isContainer(fiber.children[0])) {
        (fiber as FiberNode).element = getFirstContainerElement(fiber);
      }

      break;
    }

    default: {
      if (isCompactNone(fiber)) {
        throw new ReactError(fiber, `Incorrect none-fiber`);
      }

      if (isCompactSingleChild(fiber)) {
        (fiber as FiberNode).element = containerSym;
      }
    }
  }

  if (fiber.parent.type === 'tag') {
    return;
  }

  // Handle its parent.
  switch (fiber.parent.children.length) {
    case 0: {
      throw new ReactError(fiber.parent, 'This fiber cannot be empty');
    }

    case 1: {
      if (fiber.parent.element !== fiber.element) {
        // Two scenarios:
        // 1. fiber is a single-child node or a !--empty node. In such a case
        //    its parent should refer to the same DOM node.
        // 2. fiber is an auto-container. Then the parent node must be an auto-
        //    container too.
        tryFixContainerType(fiber.parent);
      }
      break;
    }

    default: {
      if (!isContainer(fiber.parent)) {
        // Only auto-containers may contain 2+ nodes.
        tryFixContainerType(fiber.parent);
      }
    }
  }
};
