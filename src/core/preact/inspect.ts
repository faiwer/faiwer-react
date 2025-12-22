import type {
  App,
  ComponentFiberNode,
  ContextFiberNode,
  FiberNode,
  HookStore,
  PortalFiberNode,
} from 'faiwer-react/types';
import {
  PREACT_VERSION,
  PreactVNodeType,
  type PreactHookInspection,
  type PreactInspection,
  type PreactRenderer,
} from './types';
import { findFiberById } from '../actions/helpers';
import { getPreactProps } from './toVNode';
import { nullthrows } from 'faiwer-react/utils';

/**
 * A custom version of `PreactRenderer.inspect`. It is simpler to write our own
 * implementation with the same signature and output shape than to support its
 * internal hook detection approach.
 */
export const patchedPreactRendererInspect = (
  app: App,
  renderer: PreactRenderer,
  devToolsId: number,
): PreactInspection => {
  const vnode = nullthrows(renderer.getVNodeById(devToolsId));
  // prettier-ignore
  const fiber = nullthrows(findFiberById(app.root, vnode.__v)) as
    // Preact DevTools renders only "components".
    | ComponentFiberNode
    | ContextFiberNode
    | PortalFiberNode;

  return {
    canSuspend: false,
    key: fiber.key,
    id: devToolsId,
    state: null, // This lib doesn't support class components directly.
    signals: null,
    suspended: false,
    props: getPreactProps(fiber),
    name: getFiberName(fiber),
    version: PREACT_VERSION,
    hooks: getHooksInfo(fiber),
    context: null, // Probably for class components.
    type: PreactVNodeType.FN_COMPONENT,
  };
};

const getFiberName = (
  fiber: ComponentFiberNode | ContextFiberNode | PortalFiberNode,
): string => {
  return fiber.component
    ? (fiber.component.displayName ?? fiber.component.name)
    : fiber.role === 'context'
      ? (fiber.data.ctx.displayName ?? 'Context')
      : fiber.role === 'portal'
        ? 'Portal'
        : 'unknown';
};

const getHooksInfo = (fiber: FiberNode): PreactHookInspection[] => {
  if (fiber.type !== 'component') {
    return [];
  }

  const hooks = fiber.data.hooks!.map(
    (hook, idx): PreactHookInspection => getHookInfo(fiber, hook, idx),
  );

  // Preact DevTools support capturing hooks as a tree. But it's too much hassle
  // to support it properly.
  return [
    {
      ...ROOT_HOOK,
      children: hooks.map((h) => h.id),
    },
    ...hooks,
  ];
};

const getHookInfo = (
  fiber: FiberNode,
  hook: HookStore[number],
  idx: number,
): PreactHookInspection => {
  const hookType =
    hook.type === 'effect' && hook.mode === 'layout'
      ? 'layoutEffect'
      : hook.type;
  const type = 'use' + hookType[0].toUpperCase() + hookType.slice(1);

  return {
    children: [],
    depth: 1,
    editable: false,
    id: `${fiber.id}:${idx}`,
    name: type,
    type: 'undefined', // For all internal hooks it's `undefined`.
    value: getHookValue(hook),
    index: idx,
    meta: { index: idx, type },
  };
};

const getHookValue = (hook: HookStore[number]): unknown => {
  switch (hook.type) {
    case 'state':
      return safeClone(hook.state);
    case 'memo':
      return safeClone(hook.value);
    case 'context':
      const closest = hook.providerFiber;
      return closest ? closest.props.value : hook.ctx.__default;
    case 'effect':
    case 'error':
      return { type: 'function', name: 'anonymous' };
    case 'ref': {
      const value = hook.value.current;
      return value instanceof Element
        ? { type: 'html', name: `<${value.tagName.toLowerCase()} />` }
        : safeClone(hook.value);
    }
  }
};

const safeClone = (data: unknown): unknown => {
  try {
    return JSON.parse(JSON.stringify(data));
  } catch {
    return { error: `Could not serialize data` };
  }
};

/**
 * Preact DevTools renders a tree of hooks/values where this node is the root
 * node.
 */
const ROOT_HOOK: PreactHookInspection = {
  children: [], // Should be filled later with other hook ids.
  depth: 0,
  editable: false,
  id: 'root',
  meta: null,
  name: 'root',
  type: 'object',
  value: null,
};
