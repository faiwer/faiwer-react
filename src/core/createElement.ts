import type {
  ElementNode,
  ElementType,
  ReactContextProvider,
  ReactKey,
  UnknownProps,
} from 'faiwer-react/types';

/**
 * This method is used as the JSX resolver. Every <tag/> or <Component/> is a
 * call to this methods.
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
export function createElement(
  /**
   * What to render. It can be a tag (a string node), a component (a function),
   * or a portal (HTMLElement).
   */
  // prettier-ignore
  type:
    // <ctx.Provider/>, basically an object like { __ctx: context }
    | ReactContextProvider
    // A tag-string or a component
    | ElementType
    // A target for a portal.
    | HTMLElement,
  propsRaw: Record<PropertyKey, unknown>,
  key: ReactKey | null | undefined,
  // The following arguments are provided only in the development mode.
  // TODO: Support them to show more informative warnings and errors.
  _isStaticChildren?: boolean,
  _source?: Source,
  _self?: unknown,
): ElementNode {
  key ??= null; // Narrow the type for simplicity.

  if (typeof type === 'function') {
    // Any component instance (<Message/>).
    return {
      type,
      props: propsRaw,
      key,
      // ComponentFiber doesn't support children. We never know what's inside
      // until we run the component. So `children` is a part of `props`.
      children: [],
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
  };
}

type Source = {
  fileName: string;
  lineNumber: number;
  columnNumber: number;
};

type TagProps = UnknownProps & {
  children?: JSX.Element;
};

/**
 * Use it to render the given content in some external HTML node. Unlike in the
 * original React this version doesn't support interdimentional event bubbling.
 *
 * For some React in original React it's not <Portal target=?/>. In this library
 * it's just a simple wrapper over `createElement` with `type === domNode`.
 */
export function createPortal(
  /** What to render. */
  children: JSX.Element,
  /** Where to render. */
  domNode: HTMLElement,
  /** Custom key if you need conditionally recreate portals. */
  key?: string,
) {
  return createElement(domNode, { children }, key);
}
