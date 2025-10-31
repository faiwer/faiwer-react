import type { FiberNode } from 'faiwer-react/types';
import type { Action } from 'faiwer-react/types/actions';
import { createTagAction } from './createTag.action';
import { createTextAction } from './createText.action';
import { createCommentAction } from './createComment.action';
import { setPropsAction } from './setProps.action';
import { setRefAction } from './setRef.action';
import { setAttrAction } from './setAttr.action';
import { setTextAction } from './setText.action';
import { removeAction } from './remove.action';
import { replaceAction } from './replace.action';
import { relayoutAction } from './relayout.action';

/**
 * The commit phase of the rendering process contains two parts:
 * - Applying DOM changes
 * - Running effects
 *
 * DOM changes are described in actions. This function applies the given action
 * to the DOM and updates the bound fiber node accordingly.
 */
export const applyAction = (action: Action): void => {
  // @ts-ignore -- too complex type.
  actionHandlers[action.type](action.fiber, action as any);
};

const actionHandlers: {
  [Type in Action['type']]: (
    fiber: FiberNode,
    action: Action & { type: Type },
  ) => void;
} = {
  CreateTag: createTagAction,
  CreateText: createTextAction,
  CreateComment: createCommentAction,
  SetProps: setPropsAction,
  SetRef: setRefAction,
  SetAttr: setAttrAction,
  SetText: setTextAction,
  Remove: removeAction,
  Replace: replaceAction,
  Relayout: relayoutAction,
};
