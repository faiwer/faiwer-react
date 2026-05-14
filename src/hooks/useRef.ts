import {
  type UseRefItem,
  type RefObject,
  type UnknownProps,
  type Ref,
  type ReactComponent,
} from '../types';
import { getNextHookOrCreate } from './helpers';
import { useBaseEffect } from './useEffect';

export function useRef<T>(value: T): RefObject<T>;
export function useRef<T>(initialValue: T | null): RefObject<T | null>;
export function useRef<T>(
  initialValue: T | undefined,
): RefObject<T | undefined>;
export function useRef<T>(initialValue?: T): RefObject<T> {
  const item = getNextHookOrCreate(
    'ref',
    (): UseRefItem => ({
      type: 'ref',
      value: { current: initialValue },
    }),
  );

  return item.value as RefObject<T>;
}

/**
 * Class-component / outside-of-render ref factory. Mirrors React's `createRef`:
 * returns a fresh `{ current: null }` box that callers can mutate and pass into
 * `ref={…}`. Unlike `useRef` it does NOT preserve identity across renders —
 * each call returns a new object — so it's only appropriate for class
 * components, module-level refs, or imperative code paths (the AntD /
 * rc-component family uses it in a few places).
 */
export const createRef = <T = unknown>(): RefObject<T | null> => ({
  current: null,
});

export const forwardRef = <Props extends UnknownProps, R>(
  Component: ((props: Props, ref?: Ref<R>) => JSX.Element) & {
    displayName?: string;
  },
): ReactComponent<Props & { ref?: Ref<R> }> => {
  const ForwardRef: ReactComponent<Props & { ref?: Ref<R> }> = function ({
    ref,
    ...props
  }: Props & { ref?: Ref<R> }) {
    return Component(props as unknown as Props, ref);
  };
  ForwardRef.displayName = Component.displayName ?? Component.name;
  return ForwardRef;
};

export const useImperativeHandle = <T>(
  ref: Ref<T> | undefined,
  factory: () => T,
  deps?: unknown[],
): void => {
  useBaseEffect(
    'imperativeHandlesMount',
    () => {
      if (!ref) return;

      const handle = factory();
      if (typeof ref === 'function') {
        ref(handle);
      } else {
        ref.current = handle;
      }

      return () => {
        if (typeof ref === 'function') {
          ref(null);
        } else {
          ref.current = null;
        }
      };
    },
    deps ? [ref, ...deps] : undefined,
  );
};
