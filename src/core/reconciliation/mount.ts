import type {
  App,
  AppOptions,
  FiberNode,
  TagFiberNode,
} from 'faiwer-react/types';
import { jsxElementToFiberNode } from '../reactNodeToFiberNode';
import { collectActionsFromNewFiber } from './collect/fromNewFiber';
import { validateTree } from './validateTree';
import { applyActions } from './applyActions';
import { postCommit } from './postCommit';
import { removeApp, registerApp } from './app';
import type { Action } from 'faiwer-react/types/actions';
import { createFiberNode, toFiberChildren } from './fibers';

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
    effects: { refs: [], layout: [], normal: [] },
    invalidatedComponents: new Set(),
    state: 'render',
    testMode: !!options.testMode,
    tempContext: new Map(),
  }));

  const content: FiberNode = jsxElementToFiberNode(jsxElement, app.root, true);
  app.root.children = toFiberChildren(content);
  app.root.element = container;

  const actions: Action[] = collectActionsFromNewFiber(app.root).flat();

  applyActions(app, actions);
  if (app.testMode) validateTree(app.root);

  postCommit(app, 0);

  return function destroyApp() {
    app.invalidatedComponents.clear();
    app.effects.refs = [];
    app.effects.layout = [];
    app.effects.normal = [];

    applyActions(app, [{ type: 'Remove', fiber: app.root }]); // add a test?
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
