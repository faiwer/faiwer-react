/**
 * Mock implementation of React's startTransition. This engine doesn't support
 * concurrent features or update prioritization, so transitions are executed
 * immediately without deferring.
 */
export const startTransition = (fn: () => void) => {
  fn();
};

/**
 * Mock implementation of React's flushSync. Unlike React, this engine's
 * scheduler renders in the next JS tick, so this is a simplified version
 * that executes the callback but doesn't force synchronous rendering.
 *
 * Note: True flushSync behavior would require bypassing the scheduler
 * and rendering immediately, which is not currently implemented.
 */
export const flushSync = (fn: () => void) => {
  fn();
};

/**
 * Suspense is not supported and likely never will be, as it requires complex
 * async rendering capabilities. Throws an error when used.
 */
export const Suspense = () => {
  throw new Error(`Suspense is not supported`);
};
