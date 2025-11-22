import type { CommentMode, UnknownProps } from './core';
import type { TagAttrValue } from './dom';
import type { FiberMap, FiberNode } from './fiber';
import type { EffectMode } from './hooks';
import type { RefObject, RefSetter } from './refs';

type CommonAction = {
  fiber: FiberNode;
};

// Create actions
export type CreateTagAction = CommonAction & {
  type: 'CreateTag';
  attrs: null | Record<string, TagAttrValue>;
  ref: SetRefAction['ref'];
};
type CreateTextAction = CommonAction & { type: 'CreateText' };
export type CreateCommentAction = CommonAction & {
  type: 'CreateComment';
  mode: CommentMode;
};
export type CreateContainer = CommonAction & { type: 'CreateContainer' };
type CreateAction =
  | CreateTagAction
  | CreateTextAction
  | CreateCommentAction
  | CreateContainer;

// Update actions
export type SetTextAction = CommonAction & { type: 'SetText'; text: string };
export type SetAttrAction = CommonAction & {
  type: 'SetAttr';
  name: string;
  value: TagAttrValue;
  creation?: boolean;
};
export type SetRefAction = CommonAction & {
  type: 'SetRef';
  ref: RefObject<unknown> | RefSetter<unknown> | null;
  // We shouldn't clear refs on the first render.
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
  immediate?: boolean;
  last?: boolean;
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

// Other kind of actions
export type ScheduleEffectAction = CommonAction & {
  type: 'ScheduleEffect';
  fn: () => void;
  mode: EffectMode;
};

export type Action =
  | CreateAction
  | UpdateAction
  | LayoutAction
  | ScheduleEffectAction;
