import type { ReactComponent, UnknownProps } from './types';

/**
 * For now, it's not implemented. Later, it won't be needed because the `ref`
 * will be passed right into the given component as a regular prop.
 */
export const forwardRef = <T extends UnknownProps>(
  Component: ReactComponent<T>,
): typeof Component => Component;

/**
 * The engine doesn't support dropping parts of the updates on the fly. But to
 * mitigate the issue we can just run the given actions as is.
 */
export const startTransition = (fn: () => void) => {
  fn();
};

/**
 * Not supported. Runs the given action setters as is as a fallback.
 */
export const flushSync = (fn: () => void) => {
  fn();
};

/**
 * Not supported. Probable never will. There is no way to mock it.
 */
export const Suspense = () => {
  throw new Error(`Suspense is not supported`);
};
