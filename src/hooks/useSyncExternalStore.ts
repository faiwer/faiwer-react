import { getCurrentApp } from '~/core/components';
import { useEffect, useLayoutEffect } from './useEffect';
import { useRef } from './useRef';
import { useState } from './useState';

let didWarnUncachedGetSnapshot = false;

/**
 * Subscribes to an external store and returns its snapshot.
 *
 * The snapshot is immutable. The store changes by replacing it and calling the
 * listeners. Mutating the current snapshot in place is not supported: nothing
 * will notice, because no listener runs and `Object.is` still sees the same
 * value.
 *
 * `getSnapshot` must return a cached value. `subscribe` is the only input that
 * tears the subscription down.
 *
 * @example
 * const count = useSyncExternalStore(store.subscribe, store.getSnapshot);
 */
export function useSyncExternalStore<S>(
  /** Registers `onStoreChange`. Returns an unsubscribe function. */
  subscribe: (onStoreChange: () => void) => () => void,
  /** Returns the current snapshot. In Redux/NgRx they are called selectors. The
   * method must return the same value, unless the store or component
   * props/contexts were changed. */
  getSnapshot: () => S,
  /** SSR is not supported. A stub. */
  _getServerSnapshot?: () => S,
): S {
  const value = getSnapshot();
  warnIfUncached(value, getSnapshot);

  const snapshotRef = useRef(value);
  const getSnapshotRef = useRef(getSnapshot);

  const [, rerender] = useState(0);

  useLayoutEffect(() => {
    snapshotRef.current = value;
    getSnapshotRef.current = getSnapshot;
  });

  const check = () => {
    try {
      const next = getSnapshotRef.current();
      // The store's root value might have changed, but the selector still
      // returns the same value. Skip the re-render.
      if (Object.is(snapshotRef.current, next)) return;
    } catch {
      // Stale props or a zombie child. getSnapshot might be a closure that
      // potentially reads stale props from the last render. So it can throw.
      // Such an error is expected and should be ignored. Since we don't know
      // if the getter (once it gets new set of props) will throw or not we
      // have to queue a re-render to be sure.
    }

    rerender((n) => n + 1);
  };

  // The subscription. Check every store update.
  useEffect(() => subscribe(check), [subscribe]);

  // Re-read after mount, resubscribe, or a new getter.
  // Catches a store change that happened before the listener existed.
  // It covers two scenarios:
  // 1. The very 1st render might be tricky. We read the 1st value during the
  //    initial render. But the store might have changed before the effect above
  //    subscribed to the store. Thus we have to re-check.
  // 2. We recevied a new selector, or a new store.
  useEffect(check, [subscribe, getSnapshot]);

  // Always return the latest read.
  return value;
}

const warnIfUncached = <S>(value: S, getSnapshot: () => S): void => {
  if (!getCurrentApp().testMode || didWarnUncachedGetSnapshot) return;
  if (Object.is(value, getSnapshot())) return;

  didWarnUncachedGetSnapshot = true;
  console.warn(
    'The result of getSnapshot should be cached to avoid an infinite loop',
  );
};
