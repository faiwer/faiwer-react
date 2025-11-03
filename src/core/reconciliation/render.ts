import type { App } from 'faiwer-react/types';
import { validateTree } from './validateTree';
import { collectActionsFromApp } from './collect/fromApp';
import { postCommit } from './postCommit';
import { applyActions } from './applyActions';

/**
 * Performs another rendering round. Once anything changes a component's state
 * (invalidates it), a new render cycle is scheduled. The render consists of:
 *
 * 1. running components, collecting needed changes (actions), scheduling effects
 * 2. applying actions to the DOM and fiber trees
 * 3. running scheduled effects, updating ref handlers (postCommit)
 */
export function reactRender(app: App, depth = 0) {
  if (depth > MAX_DEPTH) {
    throw new Error(`Maximum update depth exceeded`);
  }

  if (app.testMode && app.invalidatedComponents.size === 0) {
    throw new Error(`Unnecessary react render`);
  }

  if (app.state === 'killed') {
    return;
  }

  if (app.testMode) validateTree(app.root);

  app.state = 'render';
  const actions = collectActionsFromApp(app);
  if (app.testMode) validateTree(app.root);

  applyActions(app, actions);
  if (app.testMode) validateTree(app.root);

  postCommit(app, depth);
}

const MAX_DEPTH = 50; // Like in React.
