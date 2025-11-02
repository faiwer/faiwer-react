import { getCurrentApp, isFirstFiberRender } from '~/core/components';
import {
  type EffectMode,
  type EffectHandler,
  type UseEffectItem,
} from '../types';
import { checkDeps, getNextHookOrCreate, saveDeps } from './helpers';
import { invalidateEffect } from 'faiwer-react/core/reconciliation/effects';

function useBaseEffect(mode: EffectMode, fn: EffectHandler, deps?: unknown[]) {
  const item = getNextHookOrCreate('effect', (): UseEffectItem => {
    const item: UseEffectItem = {
      type: 'effect',
      mode,
      fn,
      destructor: null,
      deps: deps ? saveDeps(deps) : null,
    };
    invalidateEffect(getCurrentApp(), () => runEffect(item), mode);
    return item;
  });

  item.fn = fn;

  if (!isFirstFiberRender() && (!deps || !checkDeps(item.deps!, deps))) {
    invalidateEffect(getCurrentApp(), () => runEffect(item), mode);
    item.deps = deps ? saveDeps(deps) : null;
  }
}

/**
 * A hook that performs side effects in functional components. This enhanced
 * version supports async functions and provides an AbortSignal for cleanup.
 *
 * Effects run after the render is committed to the screen, making them suitable
 * for data fetching, subscriptions, or manually changing the DOM.
 *
 * @example
 * // Basic effect with cleanup
 * useEffect(() => {
 *   const timer = setInterval(() => console.log('tick'), 1000);
 *   return () => clearInterval(timer);
 * }, []);
 *
 * // Async effect with abort signal
 * useEffect(async (signal) => {
 *   try {
 *     const response = await fetch('/api/data', { signal });
 *     const data = await response.json();
 *     setData(data);
 *   } catch (error) {
 *     if (!signal.aborted) {
 *       console.error('Fetch failed:', error);
 *     }
 *   }
 * }, [userId]);
 */
export const useEffect = (
  /** The effect function that receives an AbortSignal. Can be async and can
   * return a cleanup function. The AbortSignal is automatically aborted when
   * the effect is cleaned up. */
  fn: EffectHandler,
  /** Optional array of dependencies. If provided, the effect only runs when one
   * of the dependencies has changed. If omitted, the effect runs after every
   * render. */
  deps?: unknown[],
) => {
  useBaseEffect('normal', fn, deps);
};

/**
 * A hook that performs side effects synchronously after all DOM mutations but
 * before the browser paints. This enhanced version supports async functions
 * and provides an AbortSignal for cleanup.
 *
 * Use this for DOM measurements, synchronous DOM mutations, or when you need
 * to read layout properties before the browser paints.
 *
 * @example
 * // Measuring DOM elements before paint
 * useLayoutEffect(() => {
 *   const rect = elementRef.current?.getBoundingClientRect();
 *   if (rect) {
 *     setDimensions({ width: rect.width, height: rect.height });
 *   }
 * }, []);
 */
export const useLayoutEffect = (
  /** The effect function that receives an AbortSignal. Can be async and can
   * return a cleanup function. The AbortSignal is automatically aborted when
   * the effect is cleaned up. */
  fn: EffectHandler,
  /** Optional array of dependencies. If provided, the effect only runs when one
   * of the dependencies has changed. If omitted, the effect runs after every
   * render. */
  deps?: unknown[],
) => {
  useBaseEffect('layout', fn, deps);
};

const runEffect = (item: UseEffectItem): void => {
  item.destructor?.();
  item.destructor = null;

  const controller = new AbortController();
  const result = item.fn(controller.signal);

  item.destructor = function effectDestructor() {
    controller.abort();
    if (typeof result === 'function') {
      result();
    }
  };
};
