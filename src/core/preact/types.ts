import type {
  FiberNode,
  ReactComponent,
  ReactContext,
  UnknownProps,
} from 'faiwer-react/types';

export const PreactVNodeFields = {
  parent: '__',
  element: '__e',
  children: '__k',
  id: '__v',
  compContext: '__c',
  diffIndicator: '__b',
  flags: '__u',
  index: '__i',
} as const;
const F = PreactVNodeFields;

// prettier-ignore
export function PreactFragmentComponent({ children }: { children: JSX.Element; }) {
  return children;
}

export type PreactCompContext = {
  constructor: AnyReactComponent;
  render: AnyReactComponent;
  props: UnknownProps;
  context: object;
  base?: Element | Comment;
  state?: object;
};

export type PreactVNode = {
  constructor: unknown | undefined;
  key: string | number | undefined;
  props:
    | UnknownProps // A component
    // A text node's text
    | string
    | number;
  ref: unknown | undefined;
  /** Component function or a tag name */
  type: string | AnyReactComponent | ReactContext<any> | null;
  /** A parent VNode. */
  [F.parent]: PreactVNode | null;
  /** Diff/patch flag/counter. */
  [F.diffIndicator]: number;
  /** An object describing the component and its state. */
  [F.compContext]: PreactCompContext | null;
  /** A DOM node. Refers to the 1st real child DOM element if doesn't have its own. */
  [F.element]: Element | Text | undefined;
  /** Index within the parent's children array. -1 for the root node. */
  [F.index]: number;
  /** Internal children list. */
  [F.children]: Array<PreactVNode | null>;
  /** Not used by dev tools. */
  __o: null;
  /** Hook state counter. */
  [F.flags]: number;
  /** VNode unique ID. */
  [F.id]: number;
  __self?: object;
  __source?: { columnNumber: number; fileName: string; lineNumber: number };
  /** Our fields. */
  registered: boolean;
};

/**
 * A special object that:
 * - A preact app creates it on its start up
 * - And then the Preact Dev Tools injected script fills this object with extra
 *   API hooks that must be called during the render cycle.
 */
export type PreactOptions = {
  /** Should be called once on app mount. vNode is `app.root.children[0].
   * `Element` is the DOM node where the app is mounted. */
  _root: (vNode: unknown, element: Element) => void;
  /** Called when a new VNode is created. */
  vnode: (vNode: unknown) => void;
  /** Called at the end of each render. */
  _commit: (vNode: PreactVNode, commitQueue: unknown[]) => void;
  /** Called before Preact handles a node. */
  _diff: (vNode: PreactVNode) => void;
  /** Called after Preact handled a node. */
  diffed: (vnode: PreactVNode) => void;
  /** Called when Preact render engine handle children of a container like node. */
  _render: (vNode: PreactVNode, parent?: PreactVNode) => void;
  /** Called when Preact removes a node. */
  unmount: (vnode: PreactVNode) => void;
};
export type PreactRendererConfig = {
  Fragment: typeof PreactFragmentComponent;
};

/** Preact DevTools support was build based on this Preact codebase version. */
export const PREACT_VERSION = '10.28.0';

/** window.__PREACT_DEVTOOLS__ */
export type PreactDevTools = {
  renderers: Map<number, PreactRenderer>;
  /** A hook that should be called once per app. Automatically created a new
   * Preact-renderer and registers it. */
  attachPreact: (
    version: typeof PREACT_VERSION,
    options: PreactOptions,
    rendererConfig: PreactRendererConfig,
  ) => number;
};

export type PreactRenderer = {
  getVNodeById: (id: number) => PreactVNode | null;
  /** Called on a tree node selection. */
  inspect: (id: number) => PreactInspection;
  /** Called on manual props/context/state changes for the selected tree node. */
  update: (id: number, type: string, path: string[], value: unknown) => void;
};

/** A hook representation. Or sub-value of a hook value. */
export interface PreactHookInspection {
  /** Unique ID. */
  id: string;
  /** IDs of subhooks. */
  children: string[];
  /** The hierarhcy level. */
  depth: number;
  /** Hook name to display. */
  name: unknown;
  /** When `true` the `.value` can be temporarily edited. */
  editable: boolean;
  /**
   * - `typeof` is it's a field of a hook's value.
   * - `undefined` for regular hooks.
   * - `object` for the root pseudo-hook
   */
  type: string;
  meta: null | { index: number; type: string };
  /** An order within the parent hook or the component. */
  index?: number;
  /** The value of the hook. May be null. */
  value: unknown;
}

/**
 * A component representation for the selected tree node.
 */
export interface PreactInspection {
  context: null;
  canSuspend: boolean;
  key: FiberNode['key'] | null;
  hooks: PreactHookInspection[];
  /** Long DevTools' ID, not VNode.id */
  id: number;
  name: string; // Not used.
  props: UnknownProps;
  state: null; // Probably for class components.
  signals: null;
  type: number;
  suspended: boolean;
  version: typeof PREACT_VERSION;
}

export enum PreactVNodeType {
  FN_COMPONENT = 3,
  // Since we don't use them it's better to comment them
  // MEMO = 5,
  // FORWARD_REF = 4,
  // SUSPENCE = 6,
  // PORTAL = 9,
  // ELEMENT = 1,
}

/**
 * App['preact']
 */
export type PreactAdapter = {
  /** A middleware layer over the Preact DevTools API. */
  api: PreactAPI;
  /** window.__PREACT_DEVTOOLS__ */
  global: PreactDevTools;
  /** Fiber IDs of nodes invalidated within the last render. */
  invalidated: Set<number>;
  /** createRoot().render(_this_). */
  userRootVNode: PreactVNode | null;
  /** A banch of helper methods on the page side created by the Preact DevTools
   * extension */
  renderer: PreactRenderer;
};

/** A middleware layer over the Preact DevTools API. */
export type PreactAPI = {
  afterRender: () => void;
  unmount: (fiber: FiberNode) => void;
};

type AnyReactComponent = ReactComponent<any>;
