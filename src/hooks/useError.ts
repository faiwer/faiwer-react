import { getCurrentComponentFiber } from 'faiwer-react/core/components';

export function useError(_handler: () => void): void {
  getCurrentComponentFiber().data.isErrorBoundary = true;
}
