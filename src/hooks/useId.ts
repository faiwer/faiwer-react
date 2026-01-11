import { useRef } from './useRef';

let idx = 0;

export function useId(): string {
  const ref = useRef<string | null>(null);
  if (ref.current == null) {
    ref.current = `_r_${++idx}`;
  }

  return ref.current!;
}
