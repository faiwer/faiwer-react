import type { ComponentState, ReactComponent } from './component';
import type { ContextState } from './context';
import type { UnknownProps, ReactKey } from './core';
import type { DomNode } from './dom';
import type { Ref, RefSetter } from './refs';

/**
 * A single node in the Fiber tree.
 */
export type FiberNode =
  | NullFiberNode
  | FragmentFiberNode
  | TextFiberNode
  | TagFiberNode
  | ComponentFiberNode
  | ContextFiberNode
  | PortalFiberNode;

type CommonFiber = {
  /** Unique (within the given app) ID of the fiber. */
  id: number;
  /** Since we support multiple apps simultaneously this is the ID of the map
   * this nodes belongs to. */
  appId: number;
  /**
   * The parent fiber node.
   * Note: For the root node it's null.
   */
  parent: FiberNode;
  /** Lazily calculated position within the fiber tree. */
  level: number | null;
  /**
   * A list of fiber-children. For simplicity every fiber has this field. Even
   * though text- & fragment-based fibers don't support children.
   *
   * Note: `children` for component fibers is not equal the component's
   * children-prop. A children-prop may be anything. It's used only to run the
   * component. `fiber.children` reflects only the rendered part of the fiber
   * tree. Not the fiber props.
   */
  children: FiberNode[];
};

/**
 * false, null, undefined.
 */
export type NullFiberNode = CommonFiber & {
  type: 'null';
  /** <!--r:null:id--> */
  element: Comment | null;
  key: ReactKey | null;
  // Unused fields.
  component: null;
  data: null;
  props: null;
  role: null;
  tag: null;
  ref: null;
};

/**
 * <Component/>
 */
export type ComponentFiberNode = CommonFiber & {
  type: 'component';
  component: ReactComponent<UnknownProps>;
  data: ComponentState;
  props: UnknownProps;
  /**
   * Since components can render everything we never know the element.
   *
   * Note: when component is rendered in the compact mode `element` refers to
   * the only rendered DOM-node of one of its child fiber-nodes.
   *
   * Note: when `element` refers to <!--r:end:id--> it means it renders a
   * fragment-like content (2+ DOM-nodes) that is clamped between
   * <!--r:begin:id--> and <!--r:end:id--> HTML-comment nodes.
   */
  element: DomNode | null;
  key: ReactKey | null;
  // Unused fields.
  role: null;
  tag: null;
  ref: null;
};

/**
 * - "text" in <div>text</div>.
 * - or `scalar` in <div>{scalar}</div> where scalar is a boolean, a number or a
 *   string.
 */
export type TextFiberNode = CommonFiber & {
  type: 'text';
  props: { text: string };
  key: ReactKey | null;
  element: Text | null;
  // Unused fields:
  role: null;
  component: null;
  tag: null;
  ref: null;
  data: null;
};

/**
 * createPortal(...);
 */
export type PortalFiberNode = CommonFiber & {
  type: 'tag';
  /** A target DOM-node. */
  data: HTMLElement;
  key: ReactKey | null;
  role: 'portal';
  element: HTMLElement | null;
  tag: string;
  // Unused fields:
  props: null;
  component: null;
  ref: null;
};

/**
 * - <></>
 * - <Fragment/>
 * - […]
 * - {array.map(() => …)}
 */
export type FragmentFiberNode = CommonFiber & {
  type: 'fragment';
  key: ReactKey | null;
  /** The same as in ComponentFiberNode. */
  element: Comment | null;
  // Unused fields:
  role: null;
  props: null;
  data: null;
  tag: null;
  component: null;
  ref: null;
};

/**
 * <ctx.Provider value={value}/>
 */
export type ContextFiberNode<T = unknown> = Omit<
  FragmentFiberNode,
  'role' | 'props' | 'data'
> & {
  role: 'context';
  props: { value: T };
  data: ContextState<T>;
};

export type TagState = {
  /**
   * To avoid running `(add|remove)EventListener` every render we wrap the given
   * event handlers and put the methods in this map. `null` mean the 1st render,
   * when the event handler is not yet set up but is presented in JSX.
   */
  events: Partial<
    Record<string, { wrapper: EventListener; handler: Function | null }>
  >;
};

/**
 * <div>content</div>, <div/>
 */
export type TagFiberNode<T = Element> = CommonFiber & {
  type: 'tag';
  tag: string;
  key: ReactKey | null;
  element: T | null;
  data: TagState;
  ref: RefSetter<T | null> | Ref<T | null> | null;
  props: Record<PropertyKey, unknown>;
  // Unused fields:
  role: null;
  component: null;
};

/**
 * A wrapper over a Fiber used to compare fibers with their position within the
 * same parent fiber node.
 */
export type AuxFiber<T extends FiberNode = FiberNode> = {
  order: number | null;
  fiber: T;
};
export type FiberMap = Map<ReactKey, AuxFiber>;
