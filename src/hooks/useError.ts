import { getNextHookOrCreate } from './helpers';
import type { ErrorHandler, UseErrorItem } from 'faiwer-react/types';

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
