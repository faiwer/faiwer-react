import {
  containerSym,
  type App,
  type ElementNode,
  type FiberNode,
} from 'faiwer-react/types';
import {
  PreactVNodeFields as F,
  PreactFragmentComponent,
  type PreactAdapter,
  type PreactAPI,
  type PreactDevTools,
  type PreactOptions,
  type PreactVNode,
} from './types';
import { fiberToVNode } from './toVNode';
import { isContainerFiber } from '../reconciliation/typeGuards';

export const tryConnectPreactDevTools = (app: App): void => {
  const globalHook =
    (window as { __PREACT_DEVTOOLS__?: PreactDevTools }).__PREACT_DEVTOOLS__ ??
    null;
  if (!globalHook) return;

  if (!hooks._commit) {
    globalHook.attachPreact('10.28.0', hooks, {
      Fragment: PreactFragmentComponent,
      // It's also possible to pass the Component class here, but since the lib
      // doesn't support components directly it doesn't make sense.
    });
  }

  const invalidated = new Set([app.root.id]);
  app.preact = {
    global: globalHook,
    api: {} as unknown as PreactAPI,
    invalidated,
    userRootVNode: null,
  };
  createPreactApi(app, invalidated);
};

const createPreactApi = (app: App, invalidated: Set<number>): void => {
  Object.assign(app.preact!.api, {
    afterRender: afterRenderHook.bind(null, app.preact!, app.root, invalidated),
    unmount: unmountHook,
  });
};

const afterRenderHook = (
  adapter: PreactAdapter,
  rootFiber: FiberNode,
  invalidated: Set<number>,
) => {
  if (!adapter.userRootVNode) {
    adapter.userRootVNode = fiberToVNode(rootFiber.children[0], 0, false);
    hooks._root(adapter.userRootVNode, rootFiber.element as Element);
  }

  /** Root of what have been rerendered. On the 1st render is the root node. */
  const topNodes = new Set<PreactVNode>();

  // Traverse the whole fiber tree from the root. Consider every node to be
  // intact unless `invalidated` has it or one of its parents.
  iteratee(invalidated, topNodes, adapter.userRootVNode, rootFiber, 0, true);

  // Top nodes is filled with the top-level rerendered nodes. Inform Preact
  // DevTools about them. It'll traverse through the vnode tree and send a
  // message to the Chrome DevTools app.
  for (const vnode of topNodes) {
    hooks._commit(vnode, []);
  }
  invalidated.clear();
};

const unmountHook = (fiber: FiberNode): void => {
  hooks.unmount(fiberToVNode(fiber, 0, false));
};

/** Handle a single fiber node. */
const iteratee = (
  // Generic arguments
  invalidated: Set<number>,
  topNodes: Set<PreactVNode>,
  userRootVNode: PreactVNode,
  // Fiber arguments
  fiber: FiberNode,
  idx: number,
  /** If true we shouldn't care much about this node. Only about its invalidated
   * children if it has any. */
  skip: boolean,
): PreactVNode | null => {
  if (fiber.type === 'null') {
    // Unlike React Preact doesn't create a vnode object for the null values.
    // It uses `null` instead.
    return null;
  }

  // It might be a new node or the previously created node depending on the context.
  const vnode =
    fiber.id === userRootVNode[F.id]
      ? // It's createRoot().render(userRootVNode). So it never changes. It's
        // cached after `hooks._root` call on the dev tools side. Thus we'd better
        // cache it too.
        userRootVNode
      : fiberToVNode(fiber, idx, !skip);
  // Container-nodes must refer to their 1st real DOM child.
  vnode[F.element] ??= find1stDomElement(fiber);

  const isInvalidated = invalidated.has(fiber.id);
  if (skip && isInvalidated) {
    // We found a node that was invalidated in the previous render, whereas its
    // parent nodes were intact. Thus we override `skip` to treat its children
    // as changed too.
    skip = false;
    topNodes.add(vnode); // Run `_commit` for this node.
  }

  if (!skip) {
    if (!vnode.registered) {
      hooks.vnode(vnode);
      vnode.registered = true;
    }
    hooks._diff(vnode);
  }

  if (isContainerFiber(fiber)) {
    if (!skip) {
      hooks._render(vnode);
    }
    vnode[F.children].length = 0;

    for (const [idx, childFiber] of fiber.children.entries()) {
      const childVNode: PreactVNode | null = iteratee(
        invalidated,
        topNodes,
        userRootVNode,
        childFiber,
        idx,
        skip,
      );
      vnode[F.children].push(childVNode);
      if (childVNode) {
        childVNode[F.parent] = vnode;
      }
    }

    if (fiber.type === 'component') {
      // After this hack the children nodes in props are shown as <Child/> & <div/>.
      tryConvertComponentChildren(vnode);
    }
  }

  if (!skip) {
    hooks.diffed(vnode);
  }
  return vnode;
};

const find1stDomElement = (fiber: FiberNode): Element | Text | undefined => {
  if (fiber.element instanceof Comment) {
    return undefined; // Preact doesn't use HTML comments.
  }

  const [first] = fiber.children;
  return first.element === containerSym
    ? find1stDomElement(first)
    : first.element instanceof Comment
      ? undefined
      : (first.element ?? undefined);
};

/**
 * Preact shows `props.children` in a neat way when they are vnodes.
 */
const tryConvertComponentChildren = (vnode: PreactVNode): void => {
  const { props } = vnode;
  if (!props || typeof props !== 'object' || !('children' in props)) {
    return;
  }

  const children: unknown[] = Array.isArray(props.children)
    ? [...props.children]
    : [props.children];
  let replaced = false;

  for (const [idx, child] of children.entries()) {
    if (isJsxElementNode(child)) {
      replaced = true;
      children[idx] = {
        // Minimal subset of PreactNode needed for preview in the props panel.
        [F.element]: vnode[F.element],
        type: child.type as string,
      };
    }
  }

  if (replaced) {
    props.children = Array.isArray(props.children) ? children : children[0];
  }
};

const isJsxElementNode = (node: unknown): node is ElementNode =>
  !!node &&
  typeof node === 'object' &&
  'type' in node &&
  typeof node.type === 'string';

/** Preact hooks. Preact fills this object with methods in the `attachPreact` call. */
const hooks = {} as unknown as PreactOptions;
