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

/** window.__PREACT_DEVTOOLS__ */
export type PreactDevTools = {
  /** A hook that should be called once per app. Automatically created a new
   * Preact-renderer and registers it. */
  attachPreact: (
    version: string, // "10.28.0"
    options: PreactOptions,
    rendererConfig: PreactRendererConfig,
  ) => number;
};

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
};

/** A middleware layer over the Preact DevTools API. */
export type PreactAPI = {
  afterRender: () => void;
  unmount: (fiber: FiberNode) => void;
};

type AnyReactComponent = ReactComponent<any>;
