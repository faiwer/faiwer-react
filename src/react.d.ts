import * as ns from './types/react';
import * as local from './types/index';
import { UnknownProps } from './types/index';
import type { FRAGMENT_TAG } from './core/reconciliation/fibers';

export {};

declare global {
  namespace React {
    type FC<Props extends UnknownProps = UnknownProps> = ns.FC<Props>;
    type ComponentType<Props extends UnknownProps = UnknownProps> =
      local.ReactComponent<Props>;
    type ComponentProps<T> = local.ComponentProps<T>;
    type ForwardRefExoticComponent<Props extends UnknownProps = UnknownProps> =
      ns.ForwardRefExoticComponent<Props>;

    type ReactNode = ns.ReactNode;
    type Context<T> = ns.Context<T>;
    type CSSProperties = ns.CSSProperties;

    // Events
    type SyntheticEvent<T = Element, E = Event> = ns.SyntheticEvent<T, E>;
    type ClipboardEvent<T = Element> = ns.ClipboardEvent<T>;
    type FormEvent<T extends Element = Element> = ns.FormEvent<T>;
    type ChangeEvent<T extends Element = Element> = ns.ChangeEvent<T>;
    type ChangeEventHandler<T extends Element = Element> =
      ns.ChangeEventHandler<T>;
    type KeyboardEvent<T extends Element = Element> = ns.KeyboardEvent<T>;
    type ReactEventHandler<T extends Element = Element> =
      ns.ReactEventHandler<T>;
  }

  const React: { Fragment: typeof FRAGMENT_TAG };
}
