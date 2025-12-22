import type {
  FiberNode,
  PortalFiberNode,
  ReactComponent,
  UnknownProps,
} from 'faiwer-react/types';
import {
  PreactVNodeFields as F,
  PreactFragmentComponent,
  type PreactCompContext,
  type PreactVNode,
} from './types';
import type { Context } from 'faiwer-react/types/react';
import { isRootFiber } from '../reconciliation/fibers';

const vnodesCache = new WeakMap<FiberNode, PreactVNode>();
/**
 * Converts the given fiber node to a Preact VNode.
 */
export const fiberToVNode = (
  fiber: FiberNode,
  /** Position of the node within its parent container. */
  idx: number,
  /** Provide true to skip the cache. */
  skipCache: boolean,
): PreactVNode => {
  let cached = !skipCache && vnodesCache.get(fiber);
  if (cached) {
    updateVNode(fiber, cached, idx);
    return cached;
  } else {
    const vnode = createVNode(fiber, idx);
    vnodesCache.set(fiber, vnode);
    return vnode;
  }
};

/**
 * Created a node Preact VNode from scratch based on the given fiber node.
 */
const createVNode = (fiber: FiberNode, idx: number): PreactVNode => {
  const props = getPreactProps(fiber);
  const component = getComponent(fiber);

  return {
    constructor: undefined,
    ref: undefined,
    key: fiber.key ?? undefined,
    props,
    type: component ?? fiber.tag,
    [F.parent]: null, // Filled in `./connect.ts`
    [F.diffIndicator]: 0, // Not used.
    [F.compContext]: component ? getCompContext(fiber, component, props) : null,
    [F.element]:
      fiber.role === 'portal'
        ? fiber.data
        : fiber.element instanceof Element || fiber.element instanceof Text
          ? fiber.element
          : // Comments are not supported
            undefined,
    [F.index]: isRootFiber(fiber) ? -1 : idx,
    [F.children]: [], // Filled in `./connect.ts`
    __o: null, // Not used.
    [F.flags]: 0, // Not used.
    [F.id]: fiber.id,
    __source: fiber.source ?? undefined,
    registered: false,
  };
};

const compCtxCache = new WeakMap<
  FiberNode,
  [fiberId: number, PreactCompContext]
>();
/**
 * Generates a __c object. It's not unique per component, but unique per fiber.
 * I.e., different versions of the same fiber node should have exactly the same
 * __c node.
 */
const getCompContext = (
  fiber: FiberNode,
  component: AnyReactComponent,
  props: UnknownProps,
): PreactCompContext => {
  let [fiberId, compCtx] = compCtxCache.get(fiber) ?? [];
  if (!compCtx || fiberId !== fiber.id) {
    compCtx = {
      render: component!,
      props,
      context: {},
      constructor: component!,
    };
    compCtxCache.set(fiber, [fiber.id, compCtx]);
  } else {
    compCtx.props = props;
  }

  return compCtx;
};

const updateVNode = (
  fiber: FiberNode,
  vnode: PreactVNode,
  idx: number,
): void => {
  vnode.props = getPreactProps(fiber);
  vnode[F.index] = idx;
  const compCtx = vnode[F.compContext];
  if (compCtx) {
    compCtx.props = getPreactProps(fiber);
  }
};

/**
 * Return `PreactVNode.type`. It has to be either a string (a tag name) or a
 * function. We generate pseudo component functions for portal and context nodes
 * because in such a case it's better visualized in the UI.
 */
const getComponent = (fiber: FiberNode): ReactComponent<any> | null => {
  if (fiber.role === 'portal') {
    // Generate a unique portal-component. Preact renders its own kind of
    // portals as separate root nodes named "Z". Not very handy, TBH. So this
    // tradeoff seems to be reasonable.
    return getPortalComp(fiber);
  }

  if (fiber.role === 'context') {
    // Generate a unique (per context kind) context-component.
    return getContextComp(fiber.data.ctx);
  }

  if (isRootFiber(fiber) || fiber.type === 'fragment') {
    // Critical: Preact DevTools expect here ONLY the fragment component.
    return PreactFragmentComponent;
  }

  return fiber.component ?? null;
};

/**
 * Returns `PreactVNode.props` + `__c.props`.
 */
export const getPreactProps = (fiber: FiberNode): UnknownProps => {
  if (fiber.role === 'context' || fiber.type === 'component') {
    return fiber.props;
  }

  if (fiber.role === 'portal') {
    const domNode = fiber.data;
    const tagName = domNode.tagName.toLowerCase();
    const classes = domNode.classList.length
      ? '.' + [...domNode.classList].join('.')
      : '';
    return {
      // Preact DevTools will show it as "<div/>"
      target: {
        [F.element]: fiber.data,
        type: tagName,
      },
      selector: `${tagName}${domNode.id ? `#${domNode.id}` : ''}${classes}`,
    };
  }

  // tag, null, fragment, text nodes. None of them is shown in the UI.
  return {};
};

const ctxCache = new WeakMap<Context<unknown>, AnyReactComponent>();
const getContextComp = (ctx: Context<unknown>): AnyReactComponent => {
  let component: AnyReactComponent | undefined = ctxCache.get(ctx);
  if (!component) {
    component = function FragmentDummy() { return null; }; // prettier-ignore
    component.displayName = (ctx.displayName || 'Provider') + '.Provider';
    ctxCache.set(ctx, component);
  }

  return component;
};

const portalCache = new WeakMap<PortalFiberNode, AnyReactComponent>();
const getPortalComp = (fiber: PortalFiberNode): AnyReactComponent => {
  let component: ReactComponent | undefined = portalCache.get(fiber);
  if (!component) {
    component = function PortalDummy() { return null; }; // prettier-ignore
    component.displayName = `Portal`;
    portalCache.set(fiber, component);
  }

  return component;
};

type AnyReactComponent = ReactComponent<any>;
