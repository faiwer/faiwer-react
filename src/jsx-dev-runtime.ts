import { createElementNew } from '~/index';
import { FRAGMENT_TAG } from './core/reconciliation/fibers';

export const jsx = createElementNew;
export const jsxDEV = createElementNew;
export const jsxs = createElementNew;
export const Fragment = FRAGMENT_TAG;
