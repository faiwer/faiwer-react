import { type UseRefItem, type Ref } from '../types';
import { getNextHookOrCreate } from './helpers';

export function useRef<T>(): Ref<T | undefined>;
export function useRef<T>(initialValue: T): Ref<T>;
export function useRef<T>(initialValue?: T): Ref<T> {
  const item = getNextHookOrCreate(
    'ref',
    (): UseRefItem => ({
      type: 'ref',
      value: { current: initialValue ?? undefined },
    }),
  );

  return item.value as Ref<T>;
}
