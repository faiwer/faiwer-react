import type {
  App,
  ComponentFiberNode,
  ContextFiberNode,
  FiberNode,
  HookStore,
  PortalFiberNode,
  UnknownProps,
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
import { marshall } from './helpers';
import { isJsxElementNode } from '../reconciliation/fibers';

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
    props: marshall(getPreactProps(fiber)) as UnknownProps,
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

  const hooks = fiber.data.hooks!.flatMap((hook, idx): PreactHookInspection[] =>
    getHookInfo(fiber, hook, idx),
  );

  // Preact DevTools support capturing hooks as a tree. But it's too much hassle
  // to support it properly.
  return [
    {
      ...ROOT_HOOK,
      children: hooks.filter((h) => h.depth === 1).map((h) => h.id),
    },
    ...hooks,
  ];
};

const getHookInfo = (
  fiber: FiberNode,
  hook: HookStore[number],
  idx: number,
): PreactHookInspection[] => {
  const hookType =
    hook.type === 'effect' && hook.mode === 'layout'
      ? 'layoutEffect'
      : hook.type;
  const type = 'use' + hookType[0].toUpperCase() + hookType.slice(1);
  const id = `${fiber.id}:${idx}`;
  const [value, subItems] = getHookValue(id, hook);

  return [
    {
      children: subItems.map((si) => si.id),
      depth: 1,
      editable: false,
      id,
      name: type,
      type: 'undefined', // For all internal hooks it's `undefined`.
      value,
      index: idx,
      meta: { index: idx, type },
    },
    ...subItems,
  ];
};

const getHookValue = (
  id: string,
  hook: HookStore[number],
): [unknown, PreactHookInspection[]] => {
  switch (hook.type) {
    case 'state':
      return valueToHooks(id, hook.state);
    case 'memo':
      return valueToHooks(id, hook.value);
    case 'context':
      const closest = hook.providerFiber;
      return valueToHooks(
        id,
        closest ? closest.props.value : hook.ctx.__default,
      );
    case 'effect':
    case 'error':
      return [{ type: 'function', name: 'anonymous' }, []];
    case 'ref': {
      const value = hook.value.current;
      return value instanceof Node
        ? [marshall(value), []]
        : valueToHooks(id, value);
    }
  }
};

const valueToHooks = (
  parentId: string,
  data: unknown,
): [unknown, PreactHookInspection[]] => {
  if (typeof data !== 'object' || data === null) {
    return [marshall(data), []];
  }

  const path: string[] = [parentId];

  const iteratee = (value: object): PreactHookInspection[] => {
    const objHookId = path.join('|');
    const objHook: PreactHookInspection = {
      ...SCALAR_HOOK,
      id: objHookId,
      depth: path.length + 1,
      type: Array.isArray(value) ? 'array' : 'object',
      name: path.at(-1)!,
      value: marshall(value), // Not used
    };

    const children: PreactHookInspection[] = [];
    for (const [k, v] of Array.isArray(value)
      ? value.entries()
      : Object.entries(value)) {
      if (
        typeof v === 'object' &&
        v &&
        !(v instanceof Node) &&
        !isJsxElementNode(v) &&
        path.length <= MAX_OBJ_DEPTH
      ) {
        path.push(String(k));
        children.push(...iteratee(v as object));
        path.pop();
      } else {
        children.push({
          ...SCALAR_HOOK,
          id: `${objHookId}|${k}`,
          depth: path.length + 2,
          type: typeof v,
          name: k,
          value: marshall(v),
        });
      }
    }

    objHook.children = children
      .filter((c) => c.depth === objHook.depth + 1)
      .map((c) => c.id);
    return [objHook, ...children];
  };

  const subhooks = iteratee(data)
    // Skip the base hook.
    .slice(1);

  return [marshall(data), subhooks];
};

const MAX_OBJ_DEPTH = 4;

// A dummy node to extend with custom values.
const SCALAR_HOOK: PreactHookInspection = {
  children: [],
  depth: -1,
  editable: false,
  id: '',
  meta: null,
  name: '',
  type: '',
  value: null,
};

/**
 * Preact DevTools renders a tree of hooks/values where this node is the root
 * node.
 */
const ROOT_HOOK: PreactHookInspection = {
  ...SCALAR_HOOK,
  depth: 0,
  id: 'root',
  name: 'root',
  type: 'object',
};
