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
      value: { current: initialValue ?? undefined },
    }),
  );

  return item.value as RefObject<T>;
}

export const forwardRef = <Props extends UnknownProps, R>(
  Component: (props: Props, ref?: Ref<R>) => JSX.Element,
): ReactComponent<Props & { ref?: Ref<R> }> => {
  return function ForwardRef({ ref, ...props }: Props & { ref?: Ref<R> }) {
    return Component(props as unknown as Props, ref);
  };
};

export const useImperativeHandle = <T>(
  ref: Ref<T> | undefined,
  factory: () => T,
  deps?: unknown[],
): void => {
  useBaseEffect(
    'refs',
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
