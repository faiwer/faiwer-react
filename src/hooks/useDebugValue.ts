/**
 * No-op stub for React's `useDebugValue`.
 *
 * The real React hook attaches a label to a custom hook that is shown in
 * React DevTools. It has no runtime behavior in production. We have shallow
 * Preact / React DevTools support, but we don't expose hooks to it, so this
 * stub does nothing.
 */
export function useDebugValue<T>(_value: T, _format?: (value: T) => unknown): void {
  // intentionally empty
}
