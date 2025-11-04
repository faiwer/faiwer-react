export * from './types';
export * from './hooks/index';
export * from '~/core/createRoot';
export * from '~/core/createElement';
export { Component } from '~/core/classComponent';

export function memo<T>(Comp: T, isEq?: unknown): T {
  if (isEq) {
    throw new Error(`Custom "isEqual" for memo is not supported`);
  }

  return Comp; // Components are already memoized by default.
}

/** <Fragment/> */
export { FRAGMENT_TAG as Fragment } from '~/core/reconciliation/fibers';
