import type { Component } from 'faiwer-react/core/classComponent';
import type { ReactContextProvider } from './context';
import type { JsxSource } from './fiber';

/**
 * Unique identifier for a node, used by the reconciliation algorithm to
 * distinguish nodes. Changing the key will force React to recreate the node.
 */
export type ReactKey = string | number;

/**
 * Generic type to reflect props that can be used for both <tag/>s and
 * <Component/>s.
 */
export type UnknownProps = Record<PropertyKey, unknown> & ElementCommonAttrs;

/**
 * All possible types that can be used as the first argument to `createElement`:
 * - tag names
 * - function components
 * - class components
 * - fragments
 * - or context providers.
 */
export type ElementType =
  // Tag name
  | string
  // Functional component
  | ((props: any) => JsxElement)
  // Class component
  | (new (props: any) => Component<any, any>);

/**
 * Primitive values in JSX that are not passed to `createElement` and are
 * rendered as-is.
 */
export type ScalarNode = string | number | boolean | null | undefined;

/**
 * The result type of the `createElement` function. It's not used internally. We
 * have `FiberNode` for it.
 */
export type ElementNode = {
  type: ElementType | ReactContextProvider | HTMLElement;
  props: UnknownProps;
  key: ReactKey | null | undefined;
  children: JsxElement[];
  source: null | JsxSource;
};

/**
 * Common props for <tag/>s and <Component/>s.
 */
export type ElementCommonAttrs = { key?: ReactKey | null };

/**
 * Implementation of `JSX.Element` for this React version. Unlike React's
 * `ReactNode`, this type avoids type issues.
 */
export type JsxElement =
  // <div/> & <Component/>. Also it's the output type of `createElement`.
  | ElementNode
  // null, undefined, boolean, string, number
  | ScalarNode
  // <Fragment/> & []-fragment
  | JsxElement[];

/**
 * Available !--comment types.
 * E.g. <!--r:null:14-->
 */
export type CommentMode =
  // JSX: null, undefined, false
  | 'null'
  // createPortal()
  | 'portal'
  // JSX: a fragment with 0 child-nodes
  | 'empty';
