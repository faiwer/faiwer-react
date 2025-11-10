import type {
  ComponentFiberNode,
  FiberNode,
  TagFiberNode,
} from 'faiwer-react/types';
import { isCompactSingleChild, unwrapCompactFiber } from '../compact';
import { emptyFiberNode, getFiberDomNodes, unsetRef } from './helpers';
import type { RemoveAction } from 'faiwer-react/types/actions';

/**
 * This action can be called directly (<div/> -> []), or indirectly (<div/> ->
 * false) from the replace action. `replaced` is `true` in the 2nd scenario.
 */
export function removeAction(
  fiber: FiberNode,
  { immediate }: Pick<RemoveAction, 'immediate'> = {},
) {
  for (const child of fiber.children) {
    // Recursively remove all children before removing the parent node. This is
    // critical for components with effects - we must run cleanup effects
    // before removing their parent nodes.
    removeAction(child, { immediate });
  }

  if (fiber.type === 'component') {
    destroyHooks(fiber);
  } else if (fiber.role === 'context' && fiber.data.consumers.size > 0) {
    throw new Error(`One of the context consumers wasn't unmounted`);
  } else if (fiber.type === 'tag' && fiber.role !== 'portal') {
    unlistenTagEvents(fiber);
  }

  if (isCompactSingleChild(fiber.parent)) {
    // Can't remove `fiber` when its parent lacks its own direct DOM node.
    // We need to unwrap the compact-fiber (create <!--begin|end--> wrappers).
    unwrapCompactFiber(fiber.parent);
  }

  for (const n of getFiberDomNodes(fiber)) {
    if (n.childNodes.length > 0) {
      throw new Error(`Remove: Node is not empty`);
    }
    n.remove();
  }

  if (fiber.ref) {
    unsetRef(fiber, !!immediate);
  }

  emptyFiberNode(fiber); // Help with garbage collection.
}

/**
 * Removes all assigned event listeners. While we never reuse tag nodes after
 * removal, this cleanup is important because event handlers capture references
 * to the fiber tree. If the tag node is preserved in user code, this would
 * create a memory leak. Better to mitigate this potential issue.
 */
const unlistenTagEvents = (fiber: TagFiberNode): void => {
  for (const record of Object.values(fiber.data.events)) {
    if (record?.wrapper) {
      (fiber.element as HTMLElement).removeEventListener(
        record.name,
        record.wrapper,
      );
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
