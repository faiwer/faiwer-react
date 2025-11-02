import { createElement } from '~/index';
import { FRAGMENT_TAG } from './core/reconciliation/fibers';

export const jsx = createElement;
export const jsxDEV = createElement;
export const jsxs = createElement;
export const Fragment = FRAGMENT_TAG;
