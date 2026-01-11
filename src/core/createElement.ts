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
  return createElementNew(
    type,
    { ...props, children: children.length > 0 ? children : props.children },
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
  if (!element || typeof element !== 'object') {
    // Original React doesn't throw an error here. It returns an invalidated
    // element. We don't have such a thing, thus we return a fake null component.
    return createElementNew(InvalidNode, {}, null, false, null, false);
  }

  return createElementNew(
    element.type,
    {
      ...element.props,
      ...props,
      children:
        children.length > 0
          ? // New children are provided. Use them as is.
            children
          : // The `children` was given as a prop. Might be a function. Preserve
            // it as is.
            (element.props.children ??
              // Otherwise just shallowly clone the children array. React
              // doesn't run it recursively.
              [...element.children]),
    },
    element.key,
    false,
    element.source,
    false,
  );
};
