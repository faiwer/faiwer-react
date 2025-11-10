import type {
  ComponentFiberNode,
  ContextFiberNode,
  FiberNode,
  UseContextItem,
} from 'faiwer-react/types';
import type { ReplaceAction } from 'faiwer-react/types/actions';
import { getFiberDomNodes } from './helpers';
import { isCompactSingleChild, unwrapCompactFiber } from '../compact';
import { nullthrows } from 'faiwer-react/utils';
import { removeAction } from './remove.action';

/**
 * Handles fiber replacement when a component with the same key renders a
 * completely different node. This happens when the `type`, `tag`, or
 * `component` fields change between renders.
 *
 * It's not called when the same node changes its `key`. In such a case we get:
 * - "create*" for the new fiber
 * - "remove" for the previous fiber
 * - "relayout" for the parent fiber
 *
 * The process involves removing the old fiber's DOM and fiber nodes (and
 * subnodes), and inserting the new fiber's DOM nodes in the same position
 * while preserving the original fiber object (keeping the same ID).
 */
export function replaceAction(fiber: FiberNode, { newFiber }: ReplaceAction) {
  const { parent } = fiber;

  if (isCompactSingleChild(parent)) {
    // The node we're replacing is the only child of its parent, so the parent
    // is in compact mode. We should unwrap it before removing this node,
    // otherwise it will be disconnected from the DOM tree.
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

  removeAction(fiber);
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
    // after's DOM nodes were in a <x-container/>. We moved them to the correct
    // container. Now update the `parent` field.
    child.parent = before;
  }

  before.component = after.component;
  before.element = after.element;
  before.tag = after.tag;

  before.props = after.props;
  before.ref = after.ref;

  if (after.type === 'component') {
    moveHooks(before, after);
  } else if (after.role === 'context') {
    updateContext(before, after);
  }

  // For debug purposes mark dead nodes with a negative number.
  after.id = -after.id;
};

const moveHooks = (before: FiberNode, after: ComponentFiberNode): void => {
  for (const hook of after.data.hooks!) {
    if ('move' in hook) {
      // Update internal fiber links
      hook.move(before);
      // TODO: add a test ^.
    }
  }
};

/**
 * ContextFiberNode's `data.consumers` is a Set of components whose `useContext`
 * target the given `data.ctx`. At the same time the `useContext` state
 * preserves a link to the closest parent context provider of the given context
 * type. That means once we `displace` the context provider we must update the
 * hook states.
 */
const updateContext = (before: FiberNode, after: ContextFiberNode) => {
  for (const consumer of after.data.consumers) {
    const useConextItems = consumer.data.hooks!.filter(
      (hook): hook is UseContextItem =>
        hook.type === 'context' && hook.ctx === after.data.ctx,
    );
    for (const hook of useConextItems) {
      hook.providerFiber = before as ContextFiberNode;
    }
  }
};
