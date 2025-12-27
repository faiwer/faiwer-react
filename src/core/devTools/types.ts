import type {
  ElementType,
  FiberNode,
  ReactComponent,
  ReactContext,
  ReactKey,
  UnknownProps,
} from 'faiwer-react/types';

/**
 * aka FiberRoot. React's createRoot()._internalRoot. Used in DevTools & HMR.
 * https://github.com/facebook/react/blob/65eec428c40d542d4d5a9c1af5c3f406aecf3440/packages/react-reconciler/src/ReactFiberRoot.js
 */
export type RAppRoot = {
  current: RFiber | null;
};

/**
 * A simple ref-like record that contains the freshest version of the given
 * component. HMR engines internally map both old and new components to such a
 * node.
 */
export type HMRFamily = {
  /** Always leads to the freshest version of the given component family. */
  current: ReactComponent<any>;
};

/**
 * Hooks in React Dev Tools renderer used to provide Hot Module Replacement.
 */
export type HMRRendererApi = {
  /**
   * HMR code calls this method before `scheduleRefresh`. The provided callback
   * is a way to get access to the HMR-family object of the given component
   * family. The only argument must be any of the component versions.
   */
  setRefreshHandler?: (fn: (type: ReactComponent) => HMRFamily | null) => void;
  /**
   * HMR code calls this method once it received component updates.
   */
  scheduleRefresh?: (
    appRoot: RAppRoot,
    update: {
      // Component families to remount.
      staleFamilies: Set<HMRFamily>;
      // … to rerender.
      updatedFamilies: Set<HMRFamily>;
    },
  ) => void;
};

/**
 * React Dev Tools extension in-page code.
 * __PREACT_DEVTOOLS__.renderers<K, here>
 */
export type RRenderer = HMRRendererApi & {
  //
  // Fields that are set up by React lib code
  //
  /** React & ReactDOM version. */
  version: string;
  /** The same as `version`. */
  reconcilerVersion: string;
  /** 0 — prod, 1 — dev. */
  bundleType: 0;
  rendererPackageName: 'react-dom';
  //
  // Fields that are set by the React Dev Tools extension
  //
  /** Should be called in the commit phase. */
  onCommitFiberRoot?: (
    rendererId: number,
    appRoot: RAppRoot,
    priorityLevel?: number,
  ) => void;
  /** Checked in hooks.inject. Should be presented to activate DevTools. */
  currentDispatcherRef: { current: null };
};

/** Type of the fiber. aka as WorkTag. */
export enum RFiberTag {
  Root = 3,
  /** aka as HostComponent. */
  Tag = 5,
  /** FunctionComponent */
  Component = 0,
  /** HostText */
  Text = 6,
  /** Fragment */
  Fragment = 7,
  /** ContextProvider */
  CtxProvider = 10,
}

type AnyReactComponent = ReactComponent<any>;

export type RElementType =
  // Tag name
  | string
  /** FN-component */
  | AnyReactComponent
  /** ContextProvider */
  | {
      $$typeof: typeof RCtxProviderSym;
      _context: ReactContext;
    }
  /** Root node */
  | null;

export type RStateNode =
  // For tag-based RFibers
  | Node
  // Only for the root fiber
  | RAppRoot
  // For everything else
  | null;

export type RFiberProps =
  | object
  // For text nodes.
  | string
  | null
  // For fragments.
  | unknown[];

/**
 * React's version of the FiberNode
 */
export type RFiber = {
  /** Not a real field. Added it to be able to map our `fiber` by id. */
  id: number;
  /** Order. */
  index: number;
  /** Type of the fiber. */
  tag: RFiberTag;
  /** Jsx.Element['key'] */
  key: string | null;
  /** A tag name, a component fn or a special symbol. */
  elementType: RElementType; // any === type?
  /** Seems to be an `elementType` dublicate */
  type: RElementType;
  stateNode: Node | null | RAppRoot;
  /** Like FiberNode['parent']. Is set up by the dev tools. */
  return: RFiber | null;
  /** Like FiberNode['children'][0] */
  child: RFiber | null;
  /** The RFiber that lies right after this one within its parent. */
  sibling: RFiber | null;
  alternate: RFiber | null;
  ref: unknown;
  pendingProps: RFiberProps;
  /** Props used in the last render. */
  memoizedProps: RFiberProps;
  // Not used fields
  memoizedState: null;
  // There are also updateQueue, dependencies, mode, flags, subtreeFlags,
  // deletions, lanes, childLanes fields. But they are not used by Dev Tools.
};

/**
 * `window.__REACT_DEVTOOLS_GLOBAL_HOOK__`.
 */
export type RDevToolsHook = {
  renderers: Map<number, RRenderer>;
  /**
   * Should be called by React during start up. `renderer` is not a fully
   * filled object. It should contain only some of the fields like `version`
   * or HMR hooks. The rest will be filled by the React DevTools extension.
   */
  inject?: (renderer: RRenderer) => number;
  /**
   * Should be called each time React runs the commit stage of the render.
   */
  onCommitFiberRoot?: (
    rendererId: number,
    appRoot: RAppRoot,
    maybePriorityLevel: false,
    didError: boolean,
  ) => void;
};

export const RElementSym: unique symbol = Symbol.for('react.element');
export const RCtxProviderSym: unique symbol = Symbol.for('react.provider');

/** React's JSX.ElementNode */
export type RJsxElementNode = {
  $$typeof: typeof RElementSym;
  key: ReactKey | null;
  type: ElementType | string | typeof RElementSym;
  props: UnknownProps;
  ref: FiberNode['ref'];
};

/** `App['devTools']` */
export type AppDevTools = {
  /** DevTools or HMR assigns a unique id (the return value from `hook.inject`) */
  id: number | null;
  /** window.__REACT_DEVTOOLS_GLOBAL_HOOK__. It's set by HMR or React DevTools */
  hooks: RDevToolsHook;
  /** Original React's `App` */
  root: RAppRoot;
  /** Map<old component, the freshest HMR version of it> */
  remapped: null | WeakMap<ReactComponent, ReactComponent>;
  /** The app's renderer object. Partly filled by us, partly by the Chrome extension. */
  renderer: RRenderer;
};
