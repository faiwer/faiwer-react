import type { Component } from '../core/classComponent';
import type { ReactComponent } from './component';
import type { ReactContextProvider } from './context';

/**
 * Any unique string or number that can help the React engine to identify the
 * given node in the reconciliation algorithm. Also can be used to forcibly
 * recreate the given node by purpose.
 */
export type ReactKey = string | number;

/**
 * Generic type to reflect props that can be used for both <tag/>s and
 * <Component/>s.
 */
export type UnknownProps = Record<PropertyKey, unknown> & ElementCommonAttrs;

/**
 * The 1st argument of `createElement` function. Basically, this type reflects
 * everything that can be created in "<" & "/>" brackets: tags, components,
 * fragments, context providers.
 */
export type ElementType = string /* tag name */ | ReactComponent;

/**
 * JSX values that aren't passed to `createElement`. JSX keeps them intact.
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
};

/**
 * Common props for <tag/>s and <Component/>s.
 */
export type ElementCommonAttrs = { key?: ReactKey | null };

/**
 * An implementation for `JSX.Element`. For some reason in real React it's
 * called `ReactNode` and it's a little different from `JSX.Element`. It creates
 * type-issues, so I didn't repeat the same.
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
  // JSX: a fragment with 2+ child-nodes
  | 'begin'
  | 'end'
  // createPortal()
  | 'portal'
  // JSX: a fragment with 0 child-nodes
  | 'empty';
