import {
  type ComponentFiberNode,
  type FiberNode,
  type TagFiberNode,
} from 'faiwer-react/types';
import { emptyFiberNode, unsetRef } from './helpers';
import type { RemoveAction } from 'faiwer-react/types/actions';
import { ReactError } from '../reconciliation/errors/ReactError';
import { buildComment } from '../reconciliation/comments';

/**
 * This action can be called directly (<div/> -> []), or indirectly (<div/> ->
 * false) from the replace action. `replaced` is `true` in the 2nd scenario.
 */
export function removeAction(
  fiber: FiberNode,
  { immediate, last }: Pick<RemoveAction, 'immediate' | 'last'> = {},
) {
  const lastChild = fiber.children.at(-1);
  for (const child of fiber.children) {
    // Recursively remove all children before removing the parent node. This is
    // critical for components with effects - we must run cleanup effects
    // before removing their parent nodes.
    removeAction(child, { immediate, last: child === lastChild });
  }

  if (fiber.type === 'component') {
    destroyHooks(fiber);
  } else if (fiber.role === 'context' && fiber.data.consumers.size > 0) {
    throw new ReactError(
      fiber,
      `One of the context consumers wasn't unmounted`,
    );
  } else if (fiber.type === 'tag' && fiber.role !== 'portal') {
    unlistenTagEvents(fiber);
  }

  if (last && fiber.parent.type !== 'tag') {
    // At this point if `fiber` is a component or a fragment its element is a
    // !--empty comment. It was converted to !--empty on the last child removal.
    const anchor = fiber.element as Node;
    // Do the same for the parent fragment|component fiber node:
    const empty = buildComment('empty', fiber.parent.id);
    anchor.parentElement!.insertBefore(empty, anchor);
    fiber.parent.element = empty;
  }

  if (!(fiber.element instanceof Node)) {
    throw new ReactError(fiber, `Couldn't remove a fiber without DOM element`);
  }

  // Text, tag, !--null or !--empty
  fiber.element.remove();

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
        { capture: record.capture },
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
