import type { FiberNode } from 'faiwer-react/types';
import { captureStack, getFiberLabel } from './stack';
import type { CatchErrorAction } from 'faiwer-react/types/actions';
import { findClosestErrorBoundary } from 'faiwer-react/hooks/useError';
import { traverseFiberTree } from 'faiwer-react/core/actions/helpers';
import { getAppByFiber } from '../app';

export class ReactError extends Error {
  fiber: FiberNode;

  constructor(fiber: FiberNode, error: unknown, prefix?: string) {
    let message = ((prefix ? `${prefix}. ` : '') + errToStr(error)).replace(
      '%fiber%',
      getFiberLabel(fiber),
    );

    super(message);
    this.fiber = fiber;
    this.name = 'ReactError';

    const stack = captureStack(fiber);
    this.message +=
      '\nReact stack:\n' + stack.map((line) => ` ├— ${line}`).join('\n');
  }

  /**
   * Finds the closest error boundary and prepares a CatchError action. If a
   * boundary wasn't found it returns null.
   */
  genCatchAction(): CatchErrorAction | null {
    const boundary = findClosestErrorBoundary(this.fiber);
    if (!boundary) return null;

    const app = getAppByFiber(this.fiber);
    // Remove from the whole app.invalidatedComponents all components that are
    // children from `fiber`?
    traverseFiberTree(boundary, (child) => {
      if (child.type === 'component') {
        app.invalidatedComponents.delete(child);
      }
    });

    return { type: 'CatchError', fiber: boundary, error: this };
  }

  catchActionArrOrPassThru(): CatchErrorAction[] | ReactError {
    const catchAction = this.genCatchAction();
    return catchAction ? [catchAction] : this;
  }
}

const errToStr = (error: unknown): string => {
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }

  return String(error) || 'Unknown error';
};

export const nullthrowsForFiber = <T>(
  fiber: FiberNode,
  val: T | null | undefined,
  label = 'given value',
): T => {
  if (val == null) {
    throw new ReactError(fiber, `${label} is null or undefined`);
  }

  return val;
};
