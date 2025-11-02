import type { App, FiberNode } from 'faiwer-react/types';
import type { Action } from 'faiwer-react/types/actions';
import { getAppByFiber } from '../app';
import { collectActionsFromFiberPair } from './fromFiberPair';
import { runFiberComponents } from '../runFiberComponents';
import { collectActionsFromNewFiber } from 'faiwer-react/core/reconciliation/collect/fromNewFiber';
import { createFakeFiberContainer, getChildrenMap } from '../fibers';
import { areFiberNodesEq } from '../compare/areFiberNodesEq';
import { isContainerFiber } from '../typeGuards';

/**
 * Returns a list of actions needed to convert `before` to `after`, where
 * `before` is a list of children from the last render, and `after` the list
 * of children of the same node gotten from the current render.
 */
export const collectActionsFromChildrenPair = (
  /** The parent node for both `before` and `after`. */
  fiber: FiberNode,
  /** New children set (some component's direct or indirect update) */
  after: FiberNode[],
): Action[] => {
  const app = getAppByFiber(fiber);
  const left = getChildrenMap(fiber.children);
  const right = getChildrenMap(after);
  /** A flag indicating there was at least one change that requires calling the
   * Relayout action. Such as removing, replacing, adding or repositioning a
   * fiber node. */
  let relayoutNeeded = false;

  const actions: Action[] = [];

  // Search for nodes that were in the past render but doesn't exist in the
  // current render. Then remove them.
  for (const [key, l] of left.entries()) {
    if (!right.has(key)) {
      // Don't run component from the removing node even if they were invalidated
      uninvalidateFiberSubTree(app, l.fiber);
      actions.push({ type: 'Remove', fiber: l.fiber });
      relayoutNeeded = true; // to handle the compact mode of the container.
    }
  }

  for (const [key, r] of right.entries()) {
    const l = left.get(key);

    if (!l || !areFiberNodesEq(l, r)) {
      // 1. There was no node with this key before. Create a new one.
      // 2. There was one, but it was very different. Replace it.
      relayoutNeeded = true;
      actions.push(...createFiberActions(app, r.fiber));

      if (l) {
        // Don't run component from the removing node even if they were invalidated
        uninvalidateFiberSubTree(app, l.fiber);
        actions.push({ type: 'Replace', fiber: l.fiber, newFiber: r.fiber });
      }
      continue;
    } else {
      // No need to recreate the existing node. But we might need to update it
      // or one of its children.
      actions.push(...collectActionsFromFiberPair(app, l.fiber, r.fiber));
    }

    // Handle the case when the node changed its position. It's possible for
    // nodes with manual keys.
    relayoutNeeded ||= l.order !== r.order;
  }

  if (relayoutNeeded) {
    // It'll:
    // - update node positions when needed
    // - move new nodes from a temporary container to the existing l-container
    // - wrap or unwrap !--brackets for the fiber's container
    actions.push({ type: 'Relayout', fiber, before: left, after: right });
  }

  return actions;
};

/**
 * Recursively search for components marked for invalidation. Then remove them
 * from the updating queue (invalidatedComponents). Should be called on
 * fiber-node deletion.
 */
const uninvalidateFiberSubTree = (app: App, fiberNode: FiberNode): void => {
  if (fiberNode.type === 'component') {
    app.invalidatedComponents.delete(fiberNode);
  }

  for (const f of fiberNode.children) {
    uninvalidateFiberSubTree(app, f);
  }
};

/**
 * Returns a list of actions to create from scratch the DOM nodes of the given
 * fiber node.
 */
const createFiberActions = (app: App, fiber: FiberNode): Action[] => {
  const fakeParent = createFakeFiberContainer(fiber.parent);
  fakeParent.parent = fiber.parent;
  // Wrap the given node with a fake <x-container/> node to force `applyActions`
  // to create new DOM nodes in the fake dom-node, not in the mounted container.
  // Relayout-action will move them into the real node and then reassign the
  // parent.
  fiber.parent = fakeParent;

  if (isContainerFiber(fiber)) {
    // Since all inner components are also new we need to run them.
    runFiberComponents(app, fiber);
  }

  // Reuse the same tooling we use for mounting the app.
  return collectActionsFromNewFiber(fiber);
};
