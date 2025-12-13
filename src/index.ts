export * from './types';
export * from './types/react';
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

import * as typesE from './types';
import * as reactTypesE from './types/react';
import * as hooksE from './hooks/index';
import * as createRootE from '~/core/createRoot';
import * as createElementE from '~/core/createElement';
import * as classComponentE from '~/core/classComponent';
import * as mocksE from './mocks';
import { isValidElement } from './core/reconciliation/typeGuards';
import { Children } from './core/Children';

// Some modular systems require this "default export".
export default {
  ...typesE,
  ...reactTypesE,
  ...hooksE,
  ...createRootE,
  ...createElementE,
  ...classComponentE,
  ...mocksE,
  isValidElement,
  Children,
  PureComponent: classComponentE.Component,
};
