import type { FiberNode } from 'faiwer-react/types';
import type { ReplaceAction } from 'faiwer-react/types/actions';
import { getFiberDomNodes, unsetRef } from './helpers';
import { isCompactSingleChild, unwrapCompactFiber } from '../compact';
import { nullthrows } from 'faiwer-react/utils';
import { applyAction } from './applyAction';

export function replaceAction(fiber: FiberNode, { newFiber }: ReplaceAction) {
  if (fiber.ref) {
    // The previous fiber had a ref handler. Since we're removing it we have to
    // unset the ref.
    unsetRef(fiber.ref);
  }

  if (isCompactSingleChild(fiber)) {
    // To be replacable `fiber` must have its own dom-nodes.
    unwrapCompactFiber(fiber);
  }

  if (fiber.element === fiber.parent.element) {
    // The node we're replacing is the only node of its parent, so the parent is
    // in the compact mode. We should unwrap it before removing this node.
    // Otherwise it'll be disconnected from the DOM tree.
    unwrapCompactFiber(fiber.parent);
  }

  // Add new nodes right after the previous nodes.
  const nodesBefore = getFiberDomNodes(fiber);
  let prev = nullthrows(nodesBefore.at(-1));
  const nodesAfter = getFiberDomNodes(newFiber);
  for (const n of nodesAfter) {
    prev.parentElement!.insertBefore(n, prev.nextSibling);
    prev = n;
  }

  applyAction({ type: 'Remove', fiber, replaced: true });

  displaceFiber(fiber, newFiber);
}

/** Override `before` fiber fields with the `after` fiber fields. */
const displaceFiber = (before: FiberNode, after: FiberNode): void => {
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
};
