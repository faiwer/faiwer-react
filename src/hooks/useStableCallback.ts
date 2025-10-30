import { type UseRefItem } from '../types';
import { getNextHookOrCreate } from './helpers';
import { useLayoutEffect } from './useEffect';

/**
 * A hook that returns a stable callback function that never changes reference
 * but always calls the latest version of the provided function. This is
 * superior to React's `useEffectEvent` which returns a new function on each
 * render.
 *
 * Unlike React's `useEffectEvent`, this hook:
 * - Returns the SAME function reference on every render (truly stable)
 * - Can be safely included in dependency arrays (though not needed)
 * - Is designed for async actions and event handlers, not just effects
 * - Eliminates the need to exclude it from dependency arrays
 *
 * ⚠️ **Important**: The returned function should never be called during the
 * rendering phase because at that time its internal function is not updated,
 * so calling it would work incorrectly. Only call it in event handlers,
 * effects, or other non-rendering contexts.
 *
 * @example
 * const MyComponent = ({ onSubmit, userId }) => {
 *   // This callback never changes reference, unlike useCallback
 *   const handleSubmit = useStableCallback((data: FormData) => {
 *     // Always uses the latest onSubmit and userId values
 *     onSubmit({ ...data, userId });
 *   });
 *
 *   useEffect(() => {
 *     // Safe to include in deps (though not necessary)
 *     document.addEventListener('keydown', handleSubmit);
 *     return () => document.removeEventListener('keydown', handleSubmit);
 *   }, [handleSubmit]); // No lint warnings, handleSubmit never changes
 *
 *   // Perfect for async event handlers
 *   const handleClick = useStableCallback(async () => {
 *     const result = await api.updateUser(userId); // Always latest userId
 *     onSubmit(result); // Always latest onSubmit
 *   });
 *
 *   return <User onClick={handleClick}>Update User</User>;
 * };
 */
export function useStableCallback<TArgs extends unknown[], TRes>(
  /** The function to wrap. The wrapper will always call the latest version of
   * this function, but the wrapper itself never changes reference. */
  fn: (...TArgs: TArgs) => TRes,
): (...TArgs: TArgs) => TRes {
  const item = getNextHookOrCreate(
    'ref',
    (): UseRefItem<State<TArgs, TRes>> => {
      let item: UseRefItem<State<TArgs, TRes>>;
      const state: State<TArgs, TRes> = {
        fn,
        wrapper: function effectEventHandler(...args: TArgs): TRes {
          return item!.value.current!.fn(...args);
        },
      };

      item = {
        type: 'ref',
        value: { current: state },
      };
      return item;
    },
  );

  useLayoutEffect(() => {
    item.value.current!.fn = fn;
  }, [fn]);

  return item.value.current!.wrapper as (...TArgs: TArgs) => TRes;
}

type State<TArgs extends unknown[], TRes> = {
  fn: (...TArgs: TArgs) => TRes;
  wrapper: (...TArgs: TArgs) => TRes;
};
