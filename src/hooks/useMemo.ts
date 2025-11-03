import { isFirstFiberRender } from '~/core/components';
import { type UseMemoItem } from '../types';
import { checkDeps, getNextHookOrCreate, saveDeps } from './helpers';

/**
 * A hook that memoizes the result of a computation and only recalculates it
 * when one of the dependencies has changed. This is useful for expensive
 * calculations that you don't want to repeat on every render, or when you want
 * to preserve the same object across renders to avoid invalidating effects
 * or other memoization.
 *
 * @example
 * const expensiveValue = useMemo(() => {
 *   return count * multiplier * 1000; // Simulate expensive computation
 * }, [count, multiplier]);
 */
export function useMemo<T>(
  /** A function that computes the value to be memoized. This function should be
   * pure (no side effects) and will only be called when needed. */
  fn: () => T,
  /** An array of dependencies that the memoized value depends on. When any of
   * these values change, the function will be re-executed. */
  deps: unknown[],
): T {
  const item = getNextHookOrCreate(
    'memo',
    (): UseMemoItem => ({
      type: 'memo',
      value: fn(),
      deps: saveDeps(deps),
    }),
  );

  if (!isFirstFiberRender() && !checkDeps(item.deps, deps)) {
    item.value = fn();
    item.deps = saveDeps(deps);
  }

  return item.value as T;
}
