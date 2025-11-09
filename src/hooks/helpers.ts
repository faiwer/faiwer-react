import {
  getCurrentComponentFiber,
  getNextFiberState,
  isFirstFiberRender,
  registerStateItem,
} from '~/core/components';
import {
  type HookStateItem,
  type HookDeps,
  type ComponentFiberNode,
} from '../types';

/**
 * We could save the given deps as is, but this version allows to avoid memory
 * leaks by means of using WeakRefs for object-based dependencies.
 */
export const saveDeps = (deps: unknown[]): HookDeps => {
  return deps.map((dep) =>
    typeof dep === 'object' && dep ? new WeakRef(dep) : dep,
  );
};

/**
 * Returns `false` if some of the deps were changed.
 * Note: it compares deps shallowly.
 */
export const checkDeps = (saved: unknown[], deps: unknown[]): boolean => {
  return (
    saved.length === deps.length &&
    saved.every((s, idx) =>
      s instanceof WeakRef
        ? !!deps[idx] && s.deref() === deps[idx]
        : s === deps[idx],
    )
  );
};

/**
 * Returns the current hook state for 2nd+ renders and runs the given fn to
 * create the initial hook state during the 1st render.
 */
export const getNextHookOrCreate = <T extends { type: HookStateItem['type'] }>(
  type: HookStateItem['type'],
  fn: (fiber: ComponentFiberNode) => T,
): T => {
  const firstRender = isFirstFiberRender();
  const fiber = getCurrentComponentFiber();

  if (!Array.isArray(fiber.data.hooks)) {
    throw new Error(`Hooks cannot be used outside of components`);
  }

  if (firstRender) {
    const item: T = fn(fiber);
    registerStateItem(item);
    return item;
  }

  const item = firstRender ? fiber.data.hooks.at(-1)! : getNextFiberState();
  if (item.type !== type) {
    throw new Error(
      `The order of the hooks is violated. Expected: ${type}, got: ${item.type}`,
    );
  }

  return item as unknown as T;
};
