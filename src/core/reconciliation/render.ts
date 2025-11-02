import type { App } from 'faiwer-react/types';
import { validateTree } from './validateTree';
import { getActions } from './getActions';
import { postCommit } from './postCommit';
import { applyActions } from './applyActions';

/**
 * Performs another rendering round. Once anything changes a component state
 * (invalidates it) a new render cycle is scheduled. The render consist of:
 *
 * 1. running components, collecting needed changes (actions), scheduling effects
 * 2. applying actions to the DOM- and Fiber-trees
 * 3. running scheduled effects, updating ref-handlers (postCommit)
 */
export function reactRender(app: App) {
  if (app.state === 'killed') {
    return;
  }

  if (app.testMode) validateTree(app.root);

  app.state = 'render';
  const actions = getActions(app);
  if (app.testMode) validateTree(app.root);

  applyActions(app, actions);
  if (app.testMode) validateTree(app.root);

  postCommit(app);
}
