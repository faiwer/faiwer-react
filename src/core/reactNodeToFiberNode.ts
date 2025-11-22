import type { Action } from 'faiwer-react/types/actions';
import {
  type RefObject,
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
  type ReactComponent,
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
): [FiberNode, Action[]] => {
  // []-based version of a fragment. Not a <Fragment/>.
  if (Array.isArray(jsxElement)) {
    jsxElement = {
      type: FRAGMENT_TAG,
      props: {},
      key: null,
      children: jsxElement,
      source: null,
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
    return [nullFiber, NO_ACTIONS];
  }

  // A text node (string, number or boolean).
  if (typeof jsxElement !== 'object') {
    const textFiber: TextFiberNode = {
      ...createFiberNode(parent),
      type: 'text',
      parent,
      props: { text: String(jsxElement) },
    };
    return [textFiber, NO_ACTIONS];
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
    const [children, childrenActions] = childrenToNodes(
      portalFiber,
      jsxElement.children,
      unwrapComponents,
    );
    portalFiber.children = children;
    return [portalFiber, childrenActions];
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
      source: jsxElement.source,
    };
    const [children, childrenActions] = childrenToNodes(
      contextFiber,
      jsxElement.children,
      unwrapComponents,
    );
    contextFiber.children = children;
    return [contextFiber, childrenActions];
  }

  // [], </> or <Fragment/>.
  if (jsxElement.type === FRAGMENT_TAG) {
    const fragmentFiber: FragmentFiberNode = {
      ...createFiberNode(parent),
      type: 'fragment',
      key,
      source: jsxElement.source,
    };
    const [children, childrenActions] = childrenToNodes(
      fragmentFiber,
      jsxElement.children,
      unwrapComponents,
    );
    fragmentFiber.children = children;
    return [fragmentFiber, childrenActions];
  }

  // A component node (<Message/>):
  if (typeof jsxElement.type === 'function') {
    const actions: Action[] = [];
    const fiber: ComponentFiberNode = {
      ...createFiberNode(parent),
      type: 'component',
      component: jsxElement.type as ReactComponent,
      key,
      props: jsxElement.props,
      data: { hooks: null, actions: [], isErrorBoundary: false },
      source: jsxElement.source,
    };
    if (unwrapComponents) {
      const [content, compActions] = runComponent(fiber, null);
      const [child, childrenActions] = jsxElementToFiberNode(
        content,
        fiber,
        unwrapComponents,
      );
      fiber.children = toFiberChildren(child);
      actions.push(...compActions, ...childrenActions);
    }
    return [fiber, actions];
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
      source: jsxElement.source,
    };
    const [children, childrenActions] = childrenToNodes(
      tagFiber,
      jsxElement.children,
      unwrapComponents,
    );
    tagFiber.children = children;
    return [tagFiber, childrenActions];
  }

  throw new Error(`Unknown format of JSX.Element (${jsxElement.type})`);
};

const childrenToNodes = (
  tagFiber: FiberNode,
  elements: JSX.Element[],
  unwrapComponents: boolean,
): [FiberNode[], Action[]] => {
  const children: FiberNode[] = [];
  const actions: Action[] = [];

  for (const childEl of elements) {
    const [node, childrenActions] = jsxElementToFiberNode(
      childEl,
      tagFiber,
      unwrapComponents,
    );
    children.push(node);
    actions.push(...childrenActions);
  }

  return [children, actions];
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
): asserts src is null | RefObject<T | null> | RefSetter<T | null> {
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

const NO_ACTIONS: Action[] = [];
