// oxlint-disable-next-line triple-slash-reference -- required to import global types in ./dist
/// <reference path="./jsx.d.ts" />

export * from './types';
export * from './hooks/index';
export * from '~/core/createRoot';
export * from '~/core/createElement';
export { Component, Component as PureComponent } from '~/core/classComponent';
export * from './mocks';
export { isValidElement } from './core/reconciliation/typeGuards';
export { Children } from './core/Children';

export function memo<T>(Comp: T, isEq?: unknown): T {
  if (isEq) {
    throw new Error(`Custom "isEqual" for memo is not supported`);
  }

  return Comp; // Components are already memoized by default.
}

/** <Fragment/> */
export { FRAGMENT_TAG as Fragment } from '~/core/reconciliation/fibers';
