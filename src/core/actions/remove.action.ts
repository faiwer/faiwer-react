import type { FiberNode, TagFiberNode } from 'faiwer-react/types';
import type { RemoveAction } from 'faiwer-react/types/actions';
import { isCompactSingleChild, unwrapCompactFiber } from '../compact';
import { getFiberDomNodes, unsetRef } from './helpers';
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
