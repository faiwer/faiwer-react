import type { ReactComponent } from './component';
import type { FiberNode } from './fiber';

export type ReactContextProvider<T = unknown> =
  // Fake. It's not callable. React fakes it too. JSX require each node
  // that can be done by <Capitalized/>-syntax to be a valid component.
  // prettier-ignore
  & ReactComponent<{ children: JSX.Element; value: T }>
  & { __ctx: ReactContext<T> };

export type ReactContextConsumer<T = unknown> = ReactComponent<{
  children: (value: T) => JSX.Element;
}>;

export type ReactContext<T = unknown> = {
  Provider: ReactContextProvider<T>;
  Consumer: ReactContextConsumer<T>;
  /**
   * Unique ID. We can't use `providerFiber.id` as a context ID because each
   * context might have multiple providers within the same app. Also, the same
   * context can be used in multiple apps simultaneously.
   */
  __id: number;
  __default: T;
};

/** `.data` of the `ContextFiberNode` */
export type ContextState<T = unknown> = {
  ctx: ReactContext<T>;
  consumers: Set<FiberNode>;
};
