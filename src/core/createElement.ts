import type {
  ElementNode,
  ElementType,
  JsxSource,
  ReactContextProvider,
  ReactKey,
  UnknownProps,
} from 'faiwer-react/types';
import {
  convertClassComponentToFC,
  isComponentClass,
  type ComponentClass,
} from './classComponent';

/**
 * This method is used as the JSX resolver. Every <tag/> or <Component/> is a
 * call to this method.
 *
 * @example
 * <div key="key" className="a" /> ===
 *   createElement('div', { className: 'a' }, 'key');
 * <div>content</div> ===
 *   createElement('div', { children: 'content' });
 * <div>{[1, 2]}</div> ===
 *   createElement('div', children: [1, 2]);
 * <Message p1={1} p2={true} p3="p3" key="key">content</Message>
 *   createElement(
 *     Message,
 *     { p1: 1, p2: true, p3: 'p3', children: 'content' },
 *     key
 *   );
 */
export function createElementNew(
  /**
   * What to render. Can be a tag (string), a component (function),
   * or a portal target (HTMLElement).
   */
  // prettier-ignore
  type:
    // <ctx.Provider/>, basically an object like { __ctx: context }
    | ReactContextProvider
    // A tag-string or a component
    | ElementType
    // A target for a portal.
    | HTMLElement
    // A legacy class-based component
    | ComponentClass,
  propsRaw: Record<PropertyKey, unknown>,
  key: ReactKey | null | undefined,
  // The following arguments are provided only in the development mode.
  // TODO: Support them to show more informative warnings and errors.
  _isStaticChildren?: boolean,
  source: JsxSource | null = null,
  _self?: unknown,
): ElementNode {
  key ??= null; // Narrow the type for simplicity.

  if (isComponentClass(type)) {
    type = convertClassComponentToFC(type);
  }

  if (typeof type === 'function') {
    // Any component instance (<Message/>).
    return {
      type,
      props: propsRaw,
      key,
      // ComponentFiber doesn't support direct children since we don't know
      // what's inside until the component runs. Children are passed via `props`
      // instead.
      children: [],
      source,
    };
  }

  // Any tag instance (<div/>).

  let { children, ...propsWithoutChildren } = propsRaw as TagProps;

  if (!Array.isArray(children)) {
    // - Case 1: <div>1</div> (the only child)
    // - Case 2: <div/> | <div></div> (no children)
    children = children === undefined ? [] : [children];
  }

  return {
    type,
    props: propsWithoutChildren,
    key,
    children,
    source,
  };
}

type TagProps = UnknownProps & {
  children?: JSX.Element;
};

/**
 * Renders content into an external HTML node. Unlike React, this version
 * doesn't support interdimensional event bubbling.
 *
 * Following the React's approach, this library doesn't use <Portal target=?/>
 * syntax. Thus, it's a simple wrapper around `createElement` with `type ===
 * domNode`.
 */
export function createPortal(
  /** What to render. */
  children: JSX.Element,
  /** Where to render. */
  domNode: HTMLElement,
  /** Custom key if you need to conditionally recreate portals. */
  key?: string,
) {
  return createElementNew(domNode, { children }, key);
}

/**
 * @deprecated Legacy version of `createElement` for 3rd party libs that already
 * built with this signature.
 */
export function createElement(
  // prettier-ignore
  type: // <ctx.Provider/>, basically an object like { __ctx: context }
    | ReactContextProvider
    // A tag-string or a component
    | ElementType
    // A target for a portal.
    | HTMLElement,
  propsRaw: Record<PropertyKey, unknown>,
  ...children: JSX.Element[]
): ElementNode {
  const { key, ...props } = propsRaw ?? {};
  // Match React's legacy `createElement` normalization for rest-spread
  // children:
  // - 0: rest children → fall back to whatever was passed via `props.children`
  // - 1: rest child    → use that child directly (NOT wrapped in an array),
  //                     so consumers like `props.children()` (render props)
  //                     keep working.
  // - 2+: rest children → use the array as-is.
  const normalizedChildren =
    children.length === 0
      ? props.children
      : children.length === 1
        ? children[0]
        : children;
  return createElementNew(
    type,
    { ...props, children: normalizedChildren },
    key as ReactKey | undefined,
  );
}

const InvalidNode = () => null;

/**
 * Clones the given JSX.Element.
 */
export const cloneElement = (
  element: ElementNode,
  props?: UnknownProps,
  ...children: JSX.Element[]
): ElementNode => {
  if (Array.isArray(element) && element.length < 2) {
    // [] is a valid fragment in this library. Like in the original React. The
    // difference is that the original React supports and uses it occacionally.
    // E.g., here in cloneElement() for any []-array it returns an empty
    // Symbol(react.transitional.element) (as a fallback). It drops any content
    // (unless another content is given via arguments).
    //
    // We could do the same, but it would break some libraries, like antd. They
    // tend to blindly clone `props.children` as is. The original React often
    // treats a single child as is, not wrapping it in an array. Whereas we
    // always wrap it in an array (for simplicity). Thus, we get the difference:
    // clone(<A/>) vs clone([<A/>]) (our case).
    element = element[0];
  }

  if (!element || typeof element !== 'object') {
    // Original React doesn't throw an error here. It returns an invalidated
    // element. We don't have such a thing, thus we return a fake null component.
    return createElementNew(InvalidNode, {}, null, false, null, false);
  }

  const nextProps: UnknownProps = { ...element.props, ...props };
  if (children.length > 0) {
    // New children are provided. Use them as is.
    nextProps.children = children;
  } else if (
    // Not a component node (a tag node, a portal node or a context provider).
    typeof element.type !== 'function' &&
    // The caller had no intention to replace the children. Preserve as is.
    !Object.hasOwn(nextProps, 'children')
  ) {
    nextProps.children = [...element.children];
  }
  // else the `children` was given as a prop. Might be a function. Preserve as 
  // is. Otherwise it can break some libraries that tend to use cloneElement
  // for internal shenanigans.

  return createElementNew(
    element.type,
    nextProps,
    element.key,
    false,
    element.source,
    false,
  );
};
