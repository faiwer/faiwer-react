import { createElement } from '~/index';
import { FRAGMENT_TAG } from './core/reconciliation/fibers';

/**
 * This file is used to get `jsx`, `jsxs` & `Fragment` to be used by the JSX | TSX
 * compiler to convert <tag/> or <Component/> into vNodes (ElementNode in this
 * library).
 */

/**
 * @example
 * <span/> ===
 *    jsx("span", {})
 * <span>A</span> ===
 *    jsx("span", { children: "A" })
 */
export const jsx = createElement;

/**
 * `createElement` with 2+ children
 * @example
 * <div><span>A</span><span>B</span></div> ===
 *   jsxs("div", { children: [
 *     jsx("span", { children: "A" }),
 *     jsx("span", { children: "B" })
 *   ]});
 */
export const jsxs = createElement;

/**
 * <>[1,2]</>
 *   === jsxs(FRAGMENT_TAG, { children: [1,2] })
 *   === jsxs('x-fragment', { children: [1,2] })
 */
export const Fragment = FRAGMENT_TAG;
