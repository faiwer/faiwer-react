import type { CommentMode, UnknownProps } from './core';
import type { TagAttrValue } from './dom';
import type { FiberMap, FiberNode } from './fiber';
import type { Ref, RefSetter } from './refs';

type CommonAction = {
  fiber: FiberNode;
};

// Create actions
type CreateTag = CommonAction & { type: 'CreateTag' };
type CreateText = CommonAction & { type: 'CreateText' };
type CreateComment = CommonAction & {
  type: 'CreateComment';
  mode: CommentMode;
};
type CreateAction = CreateTag | CreateText | CreateComment;

// Update actions
type SetText = CommonAction & { type: 'SetText'; text: string };
type SetAttr = CommonAction & {
  type: 'SetAttr';
  name: string;
  value: TagAttrValue;
};
type SetRef = CommonAction & {
  type: 'SetRef';
  ref: Ref<unknown> | RefSetter<unknown> | null;
  // We shouldn't empty refs on the 1st render.
  dontUnsetRef?: boolean;
};
type SetProps = CommonAction & { type: 'SetProps'; props: UnknownProps };
type UpdateAction = SetText | SetAttr | SetProps | SetRef;

// Remove actions
type Remove = CommonAction & {
  type: 'Remove';
  // `true` when the node removed in the "Replace" action. It causes a slightly
  // different behavior. E.g., it means that the parent won't be removed.
  replaced?: boolean;
};
type Relayout = CommonAction & {
  type: 'Relayout';
  before: FiberMap;
  after: FiberMap;
};
type Replace = CommonAction & {
  type: 'Replace';
  newFiber: FiberNode;
};
type LayoutAction = Remove | Relayout | Replace;

export type Action = CreateAction | UpdateAction | LayoutAction;
