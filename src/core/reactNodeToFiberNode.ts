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
import { ReactError } from './reconciliation/errors/ReactError';
import { isErrorBoundary } from 'faiwer-react/hooks/useError';

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
): ReactError | [FiberNode, Action[]] => {
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
    const childrenX = childrenToNodes(
      portalFiber,
      jsxElement.children,
      unwrapComponents,
    );
    // Portals cannot be error boundaries. Pass through.
    if (childrenX instanceof ReactError) return childrenX;

    const [children, childrenActions] = childrenX;
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

    const childrenX = childrenToNodes(
      contextFiber,
      jsxElement.children,
      unwrapComponents,
    );
    // Context providers cannot be error boundaries. Pass through.
    if (childrenX instanceof ReactError) return childrenX;

    const [children, childrenActions] = childrenX;
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

    const childrenX = childrenToNodes(
      fragmentFiber,
      jsxElement.children,
      unwrapComponents,
    );
    // Fragments cannot be error boundaries. Pass through.
    if (childrenX instanceof ReactError) return childrenX;

    const [children, childrenActions] = childrenX;
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
      data: {
        hooks: null,
        actions: [],
        isErrorBoundary: false,
        remount: false,
      },
      source: jsxElement.source,
    };
    if (unwrapComponents) {
      const compX = runComponent(fiber, null);
      // Component can't be its own error boundary, thus pass it through.
      if (compX instanceof ReactError) return compX;

      const [content, compActions] = compX;
      let childrenX = jsxElementToFiberNode(content, fiber, unwrapComponents);
      if (childrenX instanceof ReactError) {
        if (isErrorBoundary(fiber)) {
          // Since it's a brand new fiber we don't have any DOM nodes yet. But
          // it must have one. Create a new null nodes to make it an anchor for
          // the error boundary.
          const nullFiber: NullFiberNode = {
            ...createFiberNode(fiber),
            type: 'null',
            parent: fiber,
            props: null,
          };
          childrenX = [nullFiber, [childrenX.genCatchAction()!]];
        } else return childrenX;
      }

      const [child, childrenActions] = childrenX;
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

    const childrenX = childrenToNodes(
      tagFiber,
      jsxElement.children,
      unwrapComponents,
    );
    // Tags cannot be error boundaries. Pass through.
    if (childrenX instanceof ReactError) return childrenX;

    const [children, childrenActions] = childrenX;
    tagFiber.children = children;
    return [tagFiber, childrenActions];
  }

  throw new Error(`Unknown format of JSX.Element (${jsxElement.type})`);
};

const childrenToNodes = (
  fiber: PortalFiberNode | TagFiberNode | FragmentFiberNode | ContextFiberNode,
  elements: JSX.Element[],
  unwrapComponents: boolean,
): ReactError | [FiberNode[], Action[]] => {
  const children: FiberNode[] = [];
  const actions: Action[] = [];

  for (const childEl of elements) {
    const childX = jsxElementToFiberNode(childEl, fiber, unwrapComponents);
    // `fiber` can't be a component here, thus it can't be an error boundary.
    if (childX instanceof ReactError) return childX;

    const [node, childrenActions] = childX;
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
