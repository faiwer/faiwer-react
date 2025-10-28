import { useRef } from './useRef';

let idx = 0;

export function useId(): string {
  const ref = useRef<number | null>(null);
  if (ref.current === null) {
    ref.current = ++idx;
  }

  return `_r_${ref.current}`;
}
