import type { FiberNode } from 'faiwer-react/types';
import { captureStack, getFiberLabel } from './stack';

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
