import type {
  App,
  ComponentFiberNode,
  ContextFiberNode,
  PortalFiberNode,
} from 'faiwer-react/types';
import type { PreactRenderer } from './types';
import { nullthrows } from 'faiwer-react/utils';
import { findFiberById } from '../actions/helpers';
import { invalidateFiber } from '../reconciliation/invalidateFiber';
import { ReactError } from '../reconciliation/errors/ReactError';

/**
 * Custom implementation for PreactRenderer.update. It's simpler to intercept
 * update messages at the top level, than to support it via `__c.forceUpdate()`.
 * Internally PreactDev Tools patches `vnode.__c.props` and calls
 * `forceUpdate()`. `__c.props` are not real props. We prettify them for
 * dev-tools. E.g.  we convert children JSX nodes into Preact VNodes. So we
 * cannot rely in the default behavior, it'll break components due to wrong type
 * of children JSX elements.
 */
export function patchedPreactRendererUpdate(
  app: App,
  renderer: PreactRenderer,
  devToolsNodeId: number,
  type: string,
  path: string[],
  value: unknown,
): void {
  const vnode = nullthrows(renderer.getVNodeById(devToolsNodeId));
  // prettier-ignore
  const fiber = nullthrows(findFiberById(app.root, vnode.__v)) as
    // Preact DevTools renders only "components".
    | ComponentFiberNode
    | ContextFiberNode
    | PortalFiberNode;

  if (fiber.type === 'tag') {
    throw new ReactError(fiber, `Updating portal props is not supported`);
  }

  if (type !== 'props') {
    // - `state` & `context`: only for class components, which are not directly
    //    supported. Instead they are presented as fn-component hooks.
    // - `signal`: signals are not supported.
    throw new ReactError(fiber, `Updating ${type} is not yet implemented`);
  }

  let root = fiber.props as ArbitraryObj;
  for (const k of path.slice(0, -1)) root = root[k] as ArbitraryObj;
  root[path.at(-1)!] = value;

  if (fiber.type === 'component') {
    invalidateFiber(fiber);
  } else {
    for (const consumer of fiber.data.consumers) {
      invalidateFiber(consumer);
    }
  }
}

type ArbitraryObj = Record<string, unknown>;
