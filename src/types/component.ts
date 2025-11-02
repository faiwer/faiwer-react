import type { ElementCommonAttrs, UnknownProps } from './core';
import type { HookStore } from './hooks';

export type ComponentState = {
  hooks: HookStore | null /* 1st render */;
};

export type ReactComponent<TProps extends UnknownProps = UnknownProps> = (
  props: TProps & ElementCommonAttrs,
) => JSX.Element;

export type PropsWithChildren<TProps extends UnknownProps = UnknownProps> =
  TProps & { children?: JSX.Element };

export type ReactComponentWithChildren<
  TProps extends UnknownProps = UnknownProps,
> = ReactComponent<PropsWithChildren<TProps>>;
