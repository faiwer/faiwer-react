import { useMemo } from './useMemo';

export function useCallback<TArgs extends unknown[], TRes>(
  fn: (...args: TArgs) => TRes,
  deps: unknown[],
) {
  return useMemo(() => fn, deps);
}
