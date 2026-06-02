import {
  type App,
  type ComponentFiberNode,
  type EffectMountMode,
  type FiberNode,
  type TagFiberNode,
} from 'faiwer-react/types';
import { emptyFiberNode, unsetRef } from './helpers';
import type { RemoveAction } from 'faiwer-react/types/actions';
import { ReactError } from '../reconciliation/errors/ReactError';
import { buildComment } from '../reconciliation/comments';
import { getAppByFiber } from '../reconciliation/app';
import { cleanupEffect } from 'faiwer-react/hooks/useEffect';
import { getFiberLevel, isRootFiber } from '../reconciliation/fibers';
import { reportEffectError } from '../reconciliation/effects';

/**
 * This action can be called directly (<div/> -> []), or indirectly (<div/> ->
 * false) from the replace action. `replaced` is `true` in the 2nd scenario.
 */
export function removeAction(
  fiber: FiberNode,
  { last }: Pick<RemoveAction, 'last'> = {},
) {
  const app = getAppByFiber(fiber);
  // Gather all ref unmount functions to run them on time in the right order.
  // We shouldn't use the default "refsUnmount" scheduler because we remove the
  // fiber and all its children in one jump synchronously.
  const refsUnmount: RefUnmount[] = [];

  cleanupEffectsTopDown(app, fiber, 'imperativeHandlesMount');
  // Layout destructors are run BEFORE the DOM node is detached. The normal
  // effects are run AFTER the DOM node is detached.
  cleanupEffectsTopDown(app, fiber, 'layoutMount');
  cleanupNonEffectHooksTopDown(fiber);
  removeDomTopDown(fiber, {
    last,
    parentNodeRemoved: false,
    refsUnmount,
  });
  flushRefsUnmount(app, refsUnmount);
  cleanupEffectsTopDown(app, fiber, 'normalMount');
  emptyFiberTreeTopDown(fiber);
}

const removeDomTopDown = (
  fiber: FiberNode,
  {
    last,
    parentNodeRemoved,
    refsUnmount,
  }: Pick<RemoveAction, 'last'> & {
    parentNodeRemoved: boolean;
    refsUnmount: RefUnmount[];
  },
): void => {
  for (const [idx, child] of fiber.children.entries()) {
    removeDomTopDown(child, {
      last: idx === fiber.children.length - 1,
      parentNodeRemoved: parentNodeRemoved || isRealDomNode(fiber),
      refsUnmount,
    });
  }

  if (fiber.role === 'context' && fiber.data.consumers.size > 0) {
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

  if (isRootFiber(fiber)) {
    // Notify Preact DevTools about the unmount.
    getAppByFiber(fiber).preact?.api.unmount(fiber);
    return;
  }

  if (!(fiber.element instanceof Node)) {
    throw new ReactError(fiber, `Couldn't remove a fiber without DOM element`);
  }

  // Text, tag, !--null or !--empty
  if (!parentNodeRemoved) {
    // The parent removal is more than enough.
    fiber.element.remove();
  }

  if (fiber.ref) {
    unsetRef(fiber, (effect) => refsUnmount.push(effect));
  }

  getAppByFiber(fiber).preact?.api.unmount(fiber);
};

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
 * React runs the effect cleanups top-down on removal. And it does the opposite
 * on update.
 */
const cleanupEffectsTopDown = (
  app: App,
  fiber: FiberNode,
  mode: EffectMountMode,
): void => {
  if (fiber.type === 'component') {
    for (const item of fiber.data.hooks ?? []) {
      if (item.type === 'effect' && item.mode === mode) {
        try {
          cleanupEffect(item);
        } catch (error: unknown) {
          reportEffectError(app, fiber, error, { skipUnmount: true });
        }
      }
    }
  }

  for (const child of fiber.children) {
    cleanupEffectsTopDown(app, child, mode);
  }
};

/**
 * Finally kill the fiber node and all its children. Any operation with them
 * afterwards are considered an error.
 */
const emptyFiberTreeTopDown = (fiber: FiberNode): void => {
  for (const child of fiber.children) {
    emptyFiberTreeTopDown(child);
  }

  emptyFiberNode(fiber); // Help with garbage collection.
};

/**
 * Run non-effect hooks top-down on removal. Namely state & context.
 * In the hooks destructor we remove the node from its parent context provider's
 * consumers list.
 */
const cleanupNonEffectHooksTopDown = (fiber: FiberNode): void => {
  if (fiber.type === 'component') {
    for (const item of fiber.data.hooks ?? []) {
      if (item.type !== 'effect' && 'destructor' in item) {
        item.destructor?.();
      }
    }
  }

  for (const child of fiber.children) {
    cleanupNonEffectHooksTopDown(child);
  }
};

const isRealDomNode = (fiber: FiberNode): boolean =>
  fiber.type === 'tag' && fiber.role !== 'portal' && !isRootFiber(fiber);

/**
 * Run all gathered ref unmount functions. Run them in the fake "refEffects"
 * state. Because useState setter has custom logic for !fiber-cases.
 */
const flushRefsUnmount = (app: App, refsUnmount: RefUnmount[]): void => {
  // Guarantee "top-down" order.
  const effects = refsUnmount.sort(
    (a, b) => getFiberLevel(a.fiber) - getFiberLevel(b.fiber),
  );

  const prevState = app.state;
  app.state = 'refEffects';
  try {
    for (const { fn } of effects) {
      fn();
    }
  } finally {
    app.state = prevState;
  }
};

type RefUnmount = {
  fiber: TagFiberNode;
  fn: () => void;
};
