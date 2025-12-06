import { invalidateFiber } from 'faiwer-react/core/reconciliation/invalidateFiber';
import { type FiberNode, type StateSetter, type UseStateItem } from '../types';
import { getNextHookOrCreate } from './helpers';
import { getAppByFiber } from 'faiwer-react/core/reconciliation/app';

/**
 * A hook that allows you to add state to functional components. Returns a
 * stateful value and a function to update it.
 *
 * @example
 * const [count, setCount] = useState(0);
 * setCount(1); // Set to specific value
 * setCount(prev => prev + 1); // Update based on previous value
 *
 * // With lazy initialization
 * const [data, setData] = useState(() => expensiveComputation());
 */
export const useState = <T>(
  /** The initial state value or a function that returns the initial state. If a
   * function is provided, it will only be called once during initialization. */
  initValue: ((() => T) | T) | (() => T),
): [T, StateSetter<T>] => {
  const item = getNextHookOrCreate('state', (initFiber): UseStateItem => {
    let fiber: FiberNode | null = initFiber;
    const app = getAppByFiber(fiber);
    const item: UseStateItem<T> = {
      type: 'state',
      state: (typeof initValue === 'function'
        ? (initValue as () => T)()
        : initValue) as T,
      move: (newFiber) => {
        fiber = newFiber;
      },
      destructor: () => {
        // Help GC.
        item.state = null as T;
        fiber = null;
      },
      setter: function setState(valueOrFn) {
        if (!fiber) {
          // When a component is removed, we clean up all of its children and
          // their refs. This setState function may be used as a ref handler.
          // The ref handler gets scheduled before the parent node is removed,
          // but executes after removal. In this case, we should skip the
          // warning since it's expected behavior.
          if (app.state !== 'refEffects') {
            console.warn(`Component has been removed. State cannot be updated`);
          }
          return;
        }

        const v = (
          typeof valueOrFn === 'function'
            ? (valueOrFn as (prev: T) => T)(item.state)
            : valueOrFn
        ) as T;

        if (item.state === v) return;
        item.state = v;
        invalidateFiber(fiber);
      },
    };
    return item as UseStateItem;
  });

  return [item.state as T, item.setter as StateSetter<T>];
};
