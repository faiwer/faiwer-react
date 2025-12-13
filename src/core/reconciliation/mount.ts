import type {
  App,
  AppOptions,
  FiberNode,
  TagFiberNode,
} from 'faiwer-react/types';
import { jsxElementToFiberNode } from '../reactNodeToFiberNode';
import { collectActionsFromNewFiber } from './collect/fromNewFiber';
import { validateApp } from './validateApp';
import { applyActions } from './applyActions';
import { postCommit } from './postCommit';
import { removeApp, registerApp } from './app';
import type { Action } from 'faiwer-react/types/actions';
import { createFiberNode, toFiberChildren } from './fibers';
import { Queue } from './queue';
import { ReactError } from './errors/ReactError';
import { createAppDevTools, prepareHMR } from './devTools';

/**
 * Mounts an app (`jsxElement`) to the given DOM node (`container`). Returns
 * a function that destroys the app and removes all of its DOM nodes.
 */
export const mount = (
  container: HTMLElement,
  jsxElement: JSX.Element,
  options: AppOptions,
): (() => void) => {
  container.innerHTML = '';

  const app: App = registerApp((appId) => ({
    id: appId,
    root: createRootFiber(appId),
    effects: {
      afterActions: [],
      refsMount: [],
      refsUnmount: [],
      layout: [],
      normal: [],
    },
    invalidatedComponents: new Queue(),
    state: 'render',
    testMode: !!options.testMode,
    transformSource: options.transformSource,
    tempContext: new Map(),
    devTools: createAppDevTools(),
  }));

  if (app.devTools.global) {
    try {
      prepareHMR(app);
    } catch (error: unknown) {
      console.error(error);
    }
  }

  const actions: Action[] = [];

  const mountX = jsxElementToFiberNode(jsxElement, app.root, true);
  if (mountX instanceof ReactError) {
    // Could not mount the app. No error boundary was found. Terminate the app.
    throw mountX;
  }

  const [content, mountActions] = mountX;
  actions.push(...mountActions);
  app.root.children = toFiberChildren(content);
  app.root.element = container;

  actions.push(...collectActionsFromNewFiber(app.root).flat());

  applyActions(app, actions);
  if (app.testMode) validateApp(app);

  postCommit(app, 0);

  return function destroyApp(): void {
    app.invalidatedComponents = new Queue();
    app.effects.afterActions = [];
    app.effects.refsMount = [];
    app.effects.refsUnmount = [];
    app.effects.layout = [];
    app.effects.normal = [];

    applyActions(app, [{ type: 'Remove', fiber: app.root, immediate: true }]);

    app.state = 'killed';
    removeApp(app.id);
  };
};

/**
 * A special fiber node - the only one that doesn't have a real parent fiber.
 * Used as the root of the fiber tree.
 */
const createRootFiber = (appId: number): TagFiberNode => ({
  ...createFiberNode({ appId } as unknown as FiberNode),
  type: 'tag',
  tag: 'root',
  level: 0,
  data: { events: {}, styles: null },
  props: {},
});
