import {
  type Ref,
  type RefSetter,
  type FiberNode,
  type ContextFiberNode,
  type UnknownProps,
  type PortalFiberNode,
  type ComponentFiberNode,
  type TagFiberNode,
  type NullFiberNode,
  type TextFiberNode,
  type FragmentFiberNode,
  type FC,
} from '../types';
import { runComponent } from './components';
import {
  createFiberNode,
  FRAGMENT_TAG,
  toFiberChildren,
} from './reconciliation/fibers';
import { isContextProvider } from './reconciliation/typeGuards';

/**
 * Converts any possible JSX.Element to a FiberNode, that is used by the engine
 * everywhere. We don't use JSX.Elements outside of this function.
 * <div/> -> FiberNode.
 */
export const jsxElementToFiberNode = (
  jsxElement: JSX.Element,
  /** Every fiber node except the root must have a parent fiber node. */
  parent: FiberNode,
  /** Pass `true` on the 1st render for the given node to run internal
   * components recursively. By default it doesn't run any components. */
  unwrapComponents: boolean,
): FiberNode => {
  // []-based version of a fragment. Not a <Fragment/>.
  if (Array.isArray(jsxElement)) {
    jsxElement = {
      type: FRAGMENT_TAG,
      props: {},
      key: null,
      children: jsxElement,
    };
  }

  // Any null-like value, i.e. it doesn't render a tag or a text node.
  if (jsxElement === null || jsxElement === undefined || jsxElement === false) {
    const nullFiber: NullFiberNode = {
      ...createFiberNode(parent),
      type: 'null',
      parent,
      props: null,
    };
    return nullFiber;
  }

  // A text node (string, number or boolean).
  if (typeof jsxElement !== 'object') {
    const textFiber: TextFiberNode = {
      ...createFiberNode(parent),
      type: 'text',
      parent,
      props: { text: String(jsxElement) },
    };
    return textFiber;
  }

  const { key = null } = jsxElement;
  const { ref = null, ...props } = jsxElement.props;

  // createPortal(JSX.Element, domNode, key)
  if (jsxElement.type instanceof HTMLElement) {
    const portalFiber: PortalFiberNode = {
      ...createFiberNode(parent),
      type: 'tag',
      tag: 'x-portal',
      key,
      role: 'portal',
      data: jsxElement.type,
    };
    portalFiber.children = jsxElement.children.map(
      (n): FiberNode => jsxElementToFiberNode(n, portalFiber, unwrapComponents),
    );
    return portalFiber;
  }

  // <ctx.Provider value=?/>
  if (isContextProvider(jsxElement.type)) {
    validateContextProviderProps(props);
    const contextFiber: ContextFiberNode = {
      ...createFiberNode(parent),
      type: 'fragment',
      key,
      role: 'context',
      props,
      data: { ctx: jsxElement.type.__ctx, consumers: new Set() },
    };
    contextFiber.children = jsxElement.children.map(
      (n): FiberNode =>
        jsxElementToFiberNode(n, contextFiber, unwrapComponents),
    );
    return contextFiber;
  }

  // [], </> or <Fragment/>.
  if (jsxElement.type === FRAGMENT_TAG) {
    const fragmentFiber: FragmentFiberNode = {
      ...createFiberNode(parent),
      type: 'fragment',
      key,
    };
    fragmentFiber.children = jsxElement.children.map(
      (n): FiberNode =>
        jsxElementToFiberNode(n, fragmentFiber, unwrapComponents),
    );
    return fragmentFiber;
  }

  // A component node (<Message/>):
  if (typeof jsxElement.type === 'function') {
    const fiber: ComponentFiberNode = {
      ...createFiberNode(parent),
      type: 'component',
      component: jsxElement.type as FC,
      key,
      props,
      data: { hooks: null },
    };
    if (unwrapComponents) {
      const content: JSX.Element = runComponent(fiber, null);
      const child = jsxElementToFiberNode(content, fiber, unwrapComponents);
      fiber.children = toFiberChildren(child);
    }
    return fiber;
  }

  if (typeof jsxElement.type === 'string') {
    validateRef<Element>(ref);
    const tagFiber: TagFiberNode<Element> = {
      ...createFiberNode(parent),
      type: 'tag',
      key,
      props,
      tag: jsxElement.type,
      ref,
      data: { events: {}, styles: null },
    };
    tagFiber.children = jsxElement.children
      .map((n) => jsxElementToFiberNode(n, tagFiber, unwrapComponents))
      .flat();
    return tagFiber;
  }

  throw new Error(`Unknown format of JSX.Element (${jsxElement.type})`);
};

function validateContextProviderProps(
  props: UnknownProps,
): asserts props is { value: unknown } {
  if (!('value' in props)) {
    throw new Error(`Context provider value is not provided`);
  }
}

function validateRef<T = unknown>(
  src: unknown,
): asserts src is null | Ref<T | null> | RefSetter<T | null> {
  if (
    src === null ||
    // Unfortunately, there's no way to validate the function.
    typeof src === 'function' ||
    (!!src && typeof src === 'object' && 'current' in src)
  ) {
    return;
  }

  throw new Error(`Unsupported format of a ref or a ref handler`);
}
