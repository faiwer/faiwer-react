import type {
  ComponentFiberNode,
  FiberNode,
  TagFiberNode,
} from 'faiwer-react/types';
import type { RemoveAction } from 'faiwer-react/types/actions';
import { isCompactSingleChild, unwrapCompactFiber } from '../compact';
import { emptyFiberNode, getFiberDomNodes, unsetRef } from './helpers';
import { applyAction } from './applyAction';

/**
 * This action can be called directly (<div/> -> []), or indirectly (<div/> ->
 * false) from the replace action. `replaced` is `true` in the 2nd scenario.
 */
export function removeAction(fiber: FiberNode, { replaced }: RemoveAction) {
  for (const child of fiber.children) {
    // Recursively remove all children before we remove the parent node. It's
    // especially critical because components may have effects. We should run
    // effects before removing parent nodes and parent components.
    applyAction({ type: 'Remove', fiber: child });
  }

  if (fiber.type === 'component') {
    destroyHooks(fiber);
  } else if (fiber.role === 'context' && fiber.data.consumers.size > 0) {
    throw new Error(`One of the context consumers wasn't unmounted`);
  } else if (fiber.type === 'tag' && fiber.role !== 'portal') {
    unlistenTagEvents(fiber);
  }

  if (!replaced && isCompactSingleChild(fiber.parent)) {
    // Can't remove `fiber` when its parent doesn't have its own direct DOM
    // node. Thus, we need to unwrap the compact-fiber (create <!--begin|end-->
    // wrappers). We shouldn't do it in the "replace" mode because the replace
    // action handles this case separately.
    unwrapCompactFiber(fiber.parent);
  }

  for (const n of getFiberDomNodes(fiber)) {
    if (n.childNodes.length > 0) {
      throw new Error(`Remove: Node is not empty`);
    }
    n.remove();
  }

  if (fiber.ref && !replaced) {
    unsetRef(fiber.ref);
  }

  // Help to gc.
  emptyFiberNode(
    fiber,
    // Preserve `parent`, because in the replace mode this node will be reused.
    replaced,
  );
}

/**
 * Removes all assigned event listeners. Even though we never reuse the same tag
 * node after removal it makes sense, because such an event handlers captures a
 * link to a fiber tree. It will be a memory leak when the tag node is preserved
 * somewhere in the user's code. It would be a memory leak anyway, but it's
 * better to mitigate such an ussue.
 */
const unlistenTagEvents = (fiber: TagFiberNode): void => {
  for (const [name, record] of Object.entries(fiber.data.events)) {
    if (record?.wrapper) {
      (fiber.element as HTMLElement).removeEventListener(name, record.wrapper);
    }
  }
};

/**
 * Some component hooks might have destructors. We have to run them before we
 * destroy the component.
 */
const destroyHooks = (fiber: ComponentFiberNode): void => {
  for (const item of fiber.data.hooks ?? [])
    if ('destructor' in item) {
      item.destructor?.();
      item.destructor = null;
    }
};
