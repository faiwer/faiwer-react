import type { FiberNode } from 'faiwer-react/types';
import type { ReplaceAction } from 'faiwer-react/types/actions';
import { getFiberDomNodes } from './helpers';
import { isCompactSingleChild, unwrapCompactFiber } from '../compact';
import { nullthrows } from 'faiwer-react/utils';
import { applyAction } from './applyAction';

/**
 * Handles fiber replacement when a component with the same key renders a
 * completely different node. This happens when the `type`, `tag`, or
 * `component` fields change between renders.
 *
 * It's not called when the same node chnages its `key`. In such a cause we get:
 * - "create*" for the new fiber
 * - "remove" for the previous fiber
 * - "relayout" for the parent fiber
 *
 * The process involves removing the old fiber's DOM & fiber nodes and subnodes
 * and inserting the new fiber's DOM nodes in the same position, while
 * preserving the original fiber object (keeping the same ID).
 */
export function replaceAction(fiber: FiberNode, { newFiber }: ReplaceAction) {
  const { parent } = fiber;

  if (isCompactSingleChild(parent)) {
    // The node we're replacing is the only node of its parent, so the parent is
    // in the compact mode. We should unwrap it before removing this node.
    // Otherwise it'll be disconnected from the DOM tree.
    unwrapCompactFiber(parent);
  }

  // Add new nodes right after the previous nodes.
  const nodesBefore = getFiberDomNodes(fiber);
  let prev = nullthrows(nodesBefore.at(-1));
  const nodesAfter = getFiberDomNodes(newFiber);
  for (const n of nodesAfter) {
    prev.parentElement!.insertBefore(n, prev.nextSibling);
    prev = n;
  }

  applyAction({ type: 'Remove', fiber });
  fiber.parent = parent; // undo `parent = null` (done in "Remove").

  displaceFiber(fiber, newFiber);
}

/** Override `before` fiber fields with the `after` fiber fields. */
const displaceFiber = (before: FiberNode, after: FiberNode): void => {
  before.id = after.id;
  before.type = after.type;
  before.role = after.role;
  before.data = after.data;

  before.children = after.children;
  for (const child of before.children) {
    // after's dom nodes were in a <x-container/>. We moved them to the right
    // container. Now update the `parent` field.
    child.parent = before;
  }

  before.component = after.component;
  before.element = after.element;
  before.tag = after.tag;

  before.props = after.props;
  before.ref = after.ref;
};
