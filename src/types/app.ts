import type { FiberNode, JsxSource } from './fiber';
import type { EffectMode } from './hooks';
import type { Queue } from 'faiwer-react/core/reconciliation/queue';

export type AppState =
  /** Waiting for updates */
  | 'idle'
  /**
   * At least one component has been invalidated. A new render cycle is
   * scheduled.
   **/
  | 'scheduled'
  /**
   * 1. Invalidates affected fiber nodes. It includes re-running components.
   * 2. Compares the old and the new fiber trees.
   * 3. Prepares a list of actions that would convert the old tree to the new
   *    one.
   *
   * It's a pure state. Its result may be dropped if needed. It doesn't update
   * any already existing fiber nodes, refs. It doesn't run any effects.
   */
  | 'render'
  /**
   * Applies the actions from the render phase to the DOM and the app fiber
   * tree. Some of the actions may schedule extra effects.
   */
  | 'commit'
  /**
   * The same as `refEffects`, but is executed one step earlier. It contains
   * calls to ref handlers.
   */
  | 'refEffects'
  /**
   * Runs scheduled normal effects. It's guaranteed that the browser didn't
   * update the UI since the render started. Effect handlers may update
   * components' state. In such a case the normal scheduled effects will be
   * applied immediately.
   */
  | 'layoutEffects'
  /**
   * Runs scheduled normal effects. At this point the browser could have updated
   * the UI. Such effects also may change component state.
   */
  | 'effects'
  /**
   * The app was destroyed.
   */
  | 'killed';

export type App = {
  /** Unique ID per app. */
  id: number;
  /** The root of the fiber tree. Never changes. */
  root: FiberNode;
  /** The current stage of the app rendering cycle. */
  state: AppState;
  /** The lists of pending effect handlers. */
  effects: Record<EffectMode, Array<() => void>>;
  /** The list of components to rerender. */
  invalidatedComponents: Queue;
  /** If `true`, extra validators are applied. */
  testMode: boolean;
  /** If given used to adjust JSX source to something else before adding them to
   * a ReactError instance. */
  transformSource?: (source: JsxSource) => JsxSource;
  /**
   * A special storage that contains invalidated context values. We need it to
   * keep the "render" phase pure (so we don't update the existing fibers) and
   * at the same time be able to run invalidated components with the fresh
   * context values.
   */
  tempContext: Map<number, unknown>;
};

export type AppOptions = {
  /**
   * If `true`, extra validators are applied.
   * Warning: It slows down the app.
   **/
  testMode?: boolean;
  /**
   * Provide a converter that accounts for nuances of your development
   * build. The purpose of this converter is to convert the file path from
   * JSX into something that browser dev tools can properly handle.
   */
  transformSource?: (source: JsxSource) => JsxSource;
};

export type AppRoot = {
  render: (element: JSX.Element) => void;
  unmount: () => void;
};
