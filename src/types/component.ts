import type { Action } from './actions';
import type { ElementCommonAttrs, UnknownProps } from './core';
import type { HookStore } from './hooks';

export type ComponentState = {
  hooks: HookStore | null /* null on first render */;
  /** A temporary storage for actions that must be applied after the component's
   * render. */
  actions: Action[];
  /** True when a component contains at least one useError handler. */
  isErrorBoundary: boolean;
};

export type ReactComponent<TProps extends UnknownProps = UnknownProps> = {
  (props: TProps & ElementCommonAttrs): JSX.Element;
  displayName?: string;
};

export type PropsWithChildren<TProps extends UnknownProps = UnknownProps> =
  TProps & { children?: JSX.Element };

export type ReactComponentWithChildren<
  TProps extends UnknownProps = UnknownProps,
> = ReactComponent<PropsWithChildren<TProps>>;

export type ComponentProps<T> = T extends (props: infer Props) => JSX.Element
  ? Props
  : never;
