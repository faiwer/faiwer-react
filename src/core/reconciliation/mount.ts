import type { App, AppOptions, FiberNode } from 'faiwer-react/types';
import { jsxElementToFiberNode } from '../reactNodeToFiberNode';
import { collectActionsFromNewFiber } from './collect/fromNewFiber';
import { validateTree } from './validateTree';
import { applyActions } from './applyActions';
import { postCommit } from './postCommit';
import { removeApp, registerApp } from './app';
import type { Action } from 'faiwer-react/types/actions';
import { createRootFiber, toFiberChildren } from './fibers';

/**
 * Mounts an app (`jsxElement`) to the given DOM-node (`container`). Returns
 * a function that destroys the app. It removes all app's DOM nodes.
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

  postCommit(app);

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
