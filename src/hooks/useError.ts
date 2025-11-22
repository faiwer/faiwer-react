import { getNextHookOrCreate } from './helpers';
import type {
  ComponentFiberNode,
  ErrorHandler,
  FiberNode,
  UseErrorItem,
} from 'faiwer-react/types';

export function useError(handler: ErrorHandler): void {
  const item = getNextHookOrCreate('error', (fiber): UseErrorItem => {
    fiber.data.isErrorBoundary = true;
    return {
      type: 'error',
      fn: handler,
    };
  });

  item.fn = handler;
}

export const isErrorBoundary = (
  fiber: FiberNode,
): fiber is ComponentFiberNode =>
  fiber.type === 'component' && fiber.data.isErrorBoundary;

export const findClosestErrorBoundary = (
  fiber: FiberNode,
): FiberNode | null => {
  while (fiber.parent && !isErrorBoundary(fiber.parent)) {
    fiber = fiber.parent;
  }

  return fiber.parent ?? null;
};
