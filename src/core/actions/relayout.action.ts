import type { FiberMap, FiberNode } from 'faiwer-react/types';
import type { RelayoutAction } from 'faiwer-react/types/actions';
import {
  isCompactNone,
  isCompactSingleChild,
  tryToCompactNode,
  unwrapCompactFiber,
} from '../compact';
import { getAnchor, getFiberDomNodes } from './helpers';
import { nullthrows } from 'faiwer-react/utils';

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
  if (after.size > 0) {
    // If `fiber` is in compact mode we may need to unwrap it.
    expandFiberWhenNeeded(fiber, after);
  }

  if (after.size > 0) {
    // Determine what can be used as a starting point to inserting new children.
    // If `prev` is `null` new nodes should be added to the beginning. If not:
    // right after the `prev` node.
    let [container, prev] = getAnchor(fiber);

    for (const [key, r] of after) {
      const l = before.get(key);

      if (!l) {
        // No nodes from `left` correlates with this node from `right`. So
        // consider it a brand new node. And put to the current position.
        prev = insertNewFiber(fiber, container, prev, r.fiber);
      } else {
        // Keep DOM-nodes from the previous render. Any requested updates for
        // them are already applied. But we might need to reposition them within
        // their parent.
        prev = repositionFiberWhenNeeded(l.fiber, container, prev);
      }
    }
  }

  // Replace fiber.children with fibers from the `after` set.
  // Skip any nodes whose keys exist in `before`, since those are either
  // unchanged or already updated (their `after` entries served only as
  // references for the update process).
  fiber.children = [...after.keys()].map(
    (key) => nullthrows(before.get(key) ?? after.get(key)).fiber,
  );

  // If `fiber` has 0 or 1 dom-children we can remove <!--begin|end--> brackets.
  tryToCompactNode(fiber);
}

/**
 * If the given fiber (a container) is in the compact mode we might need to
 * unwrap it.
 */
const expandFiberWhenNeeded = (fiber: FiberNode, after: FiberMap): void => {
  if (isCompactNone(fiber)) {
    // Case 1: it's !--empty. So it can't have children. Fix it.
    unwrapCompactFiber(fiber);
  } else if (isCompactSingleChild(fiber)) {
    if (after.size > 1) {
      // Case 2: It's in the "single child" mode. Fix it to support more than
      // one children
      unwrapCompactFiber(fiber);
    } else {
      throw new Error(
        `Invalid state: "remove" action didn't unwap the parent container node during deletion of the only child`,
      );
    }
  }
};

/**
 * Puts the given `child` DOM nodes to the `parent`'s DOM-area at the anchor
 * position (`container` + `prev`). Actualizes the `child`'s parent node.
 */
const insertNewFiber = (
  parent: FiberNode,
  container: Element,
  prev: Node | null,
  child: FiberNode,
): Node => {
  const newChildren = [...child.parent.element!.childNodes];
  if (!prev) {
    container.prepend(...newChildren);
    prev = nullthrows(newChildren.at(-1));
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
 * Reposition is be needed in such situations:
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
        // Couldn't find a way to test it, because even without this move the
        // following `repositionFiberWhenNeeded` will heal this gap. Anyway, it
        // it seems right to keep it.
        container.prepend(n);
      } else {
        container.insertBefore(n, prev.nextSibling);
      }
      prev = n;
    }
  }

  return nullthrows(fiber.element);
};
