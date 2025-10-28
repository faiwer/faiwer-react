import type { ReactComponent } from './component';

/**
 * Any unique string or number that can help the React engine to identify the
 * given node in the reconcilation algorithm. Also can be used to forcibly
 * recreate the given node by purpose.
 */
export type ReactKey = string | number;

/**
 * The 1st arguments of `createElement` function. Basically, this type reflects
 * everything that can be created in "<" & "/>" brackets: tags, components,
 * fragments, context providers.
 */
export type ElementType = string /* tag name */ | ReactComponent;

/**
 * JSX values that aren't passed to `createElement`. JSX keeps them intact.
 */
export type ScalarNode = string | number | boolean | null | undefined;

/**
 * The result type of thw `createElement` function. It's not used internally. We
 * have `FiberNode` for it.
 */
export type ElementNode = {
  children: JsxElement[];
};

/**
 * Common props for <tag/>s and <Component/>s.
 */
export type ElementCommonAttrs = { key?: ReactKey };

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
