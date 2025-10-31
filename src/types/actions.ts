import type { CommentMode, UnknownProps } from './core';
import type { TagAttrValue } from './dom';
import type { FiberMap, FiberNode } from './fiber';
import type { Ref, RefSetter } from './refs';

type CommonAction = {
  fiber: FiberNode;
};

// Create actions
type CreateTagAction = CommonAction & { type: 'CreateTag' };
type CreateTextAction = CommonAction & { type: 'CreateText' };
export type CreateCommentAction = CommonAction & {
  type: 'CreateComment';
  mode: CommentMode;
};
type CreateAction = CreateTagAction | CreateTextAction | CreateCommentAction;

// Update actions
export type SetTextAction = CommonAction & { type: 'SetText'; text: string };
export type SetAttrAction = CommonAction & {
  type: 'SetAttr';
  name: string;
  value: TagAttrValue;
};
export type SetRefAction = CommonAction & {
  type: 'SetRef';
  ref: Ref<unknown> | RefSetter<unknown> | null;
  // We shouldn't empty refs on the 1st render.
  dontUnsetRef?: boolean;
};
export type SetPropsAction = CommonAction & {
  type: 'SetProps';
  props: UnknownProps;
};
type UpdateAction =
  | SetTextAction
  | SetAttrAction
  | SetPropsAction
  | SetRefAction;

// Remove actions
export type RemoveAction = CommonAction & {
  type: 'Remove';
  // `true` when the node removed in the "Replace" action. It causes a slightly
  // different behavior. E.g., it means that the parent won't be removed.
  replaced?: boolean;
};
export type RelayoutAction = CommonAction & {
  type: 'Relayout';
  before: FiberMap;
  after: FiberMap;
};
export type ReplaceAction = CommonAction & {
  type: 'Replace';
  newFiber: FiberNode;
};
type LayoutAction = RemoveAction | RelayoutAction | ReplaceAction;

export type Action = CreateAction | UpdateAction | LayoutAction;
