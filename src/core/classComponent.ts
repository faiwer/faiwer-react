import {
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'faiwer-react/hooks';
import type {
  ReactComponent,
  ReactContext,
  UnknownProps,
} from 'faiwer-react/types';
import { getCurrentComponentFiber } from './components';
import { ReactError } from './reconciliation/errors/ReactError';
import { useError } from 'faiwer-react/hooks/useError';

export const isComponentClass = (value: unknown): value is ComponentClass => {
  return (
    value != null &&
    typeof value === 'function' &&
    'prototype' in value &&
    value.prototype instanceof Component
  );
};

/**
 * A naive implementation of legacy class-based React components. Only the most
 * important methods are implemented. The implementation is very poor. Don't
 * rely on it.
 */
export class Component<
  Props extends UnknownProps = UnknownProps,
  State extends UnknownProps = UnknownProps,
> {
  props: Props;
  state!: State;
  context: unknown;
  static defaultProps?: object;
  static contextType?: ReactContext<any>;

  constructor(props: Props) {
    this.props = props;
  }

  // Overriden in `convertClassComponentToFC`.
  setState(_update: Partial<State>) {}

  // Could be overridden.
  componentDidMount(): void {}
  componentWillUnmount(): void {}

  forceUpdate(fn?: () => void) {
    this.setState({});
    if (fn) {
      Promise.resolve().then(fn);
    }
  }

  componentDidUpdate(_prevProps: Props, _prevState: State) {}

  shouldComponentUpdate(
    _nextProps: Props,
    _nextState: State,
    _nextContext?: unknown,
  ) {
    return true;
  }

  render(): JSX.Element {
    throw new ReactError(
      getCurrentComponentFiber(),
      `Render method must be overridden`,
    );
  }

  componentDidCatch(_error: unknown, _info: unknown): void {}

  getSnapshotBeforeUpdate(_prevProps: unknown, _prevState: unknown): unknown {
    throw new ReactError(getCurrentComponentFiber(), `Not implemented`);
  }

  static getDerivedStateFromProps(_props: any, _state: any): Partial<any> {
    return {};
  }
}

const ComponentPrototype = Component.prototype;

/**
 * Since we're running `convertClassComponentToFC` for the same component each
 * time its JSX.Element was created we need to cache the output wrapper
 * component. Otherwise every parent node's render will remount it.
 */
const cache = new Map<ComponentClass<any, any>, ReactComponent>();

/**
 * Since I'm too lazy to implement a proper support for this legacy stuff, but
 * some of the 3rd party libraries still rely on it, I've made this converter.
 * It immitate the class-based component's lifecycle using hooks.
 */
export const convertClassComponentToFC = <
  Props extends UnknownProps,
  State extends UnknownProps = UnknownProps,
>(
  Component: ComponentClass<Props, State>,
): ReactComponent<Props> => {
  if (cache.has(Component)) {
    return cache.get(Component)!;
  }

  let { defaultProps, contextType, getDerivedStateFromProps } =
    Component as unknown as {
      defaultProps?: Partial<Props>;
      contextType?: ReactContext<unknown>;
      getDerivedStateFromProps?: (props: Props, state: State) => Partial<State>;
    };
  if (
    getDerivedStateFromProps === Component.prototype.getDerivedStateFromProps
  ) {
    getDerivedStateFromProps = undefined;
  }

  function FromClassComponent(props: Props): JSX.Element {
    // Use the component class name as the component name to simplify debugging.
    (FromClassComponent as ReactComponent).displayName = Component.name;

    const { current: ref } = useRef<InternalState<Props, State>>({
      mounted: false,
      rendered: 0,
    });

    const instance = useMemo(
      () =>
        new Component({
          ...defaultProps,
          ...props,
        }),
      [],
    );

    let [state, setState] = useState<State>(
      () => instance.state! ?? ({} as State),
    );
    if (getDerivedStateFromProps) {
      // A dirty hack to update the state on the fly.
      const fiber = getCurrentComponentFiber();
      const hookState = fiber.data.hooks!.find((h) => h.type === 'state')!;
      state = hookState.state = {
        ...(hookState.state as State),
        ...getDerivedStateFromProps(props, hookState.state as State),
      };
    }

    if (!ref.mounted) {
      instance.setState = function classSetState(update) {
        setState((prev) => ({ ...prev, ...update }));
      };
    }

    useLayoutEffect(() => {
      ref.mounted = true;

      instance.componentDidMount();
      return () => {
        instance.componentWillUnmount();
        ref.mounted = false;
      };
    }, []);

    useEffect(() => {
      if (ref.prevProps) {
        instance.componentDidUpdate(ref.prevProps!, ref.prevState!);
      }

      ref.prevProps = instance.props;
      ref.prevState = instance.state;
    });

    if (contextType) {
      instance.context = useContext(contextType);
    }

    instance.props = {
      ...defaultProps,
      ...props,
    };
    instance.state = state;

    if (instance.componentDidCatch !== ComponentPrototype.componentDidCatch) {
      useError((error, info) => instance.componentDidCatch(error, info));
    }

    if (!ref.mounted || instance.shouldComponentUpdate(props, instance.state)) {
      ref.prevOutput = instance.render();
    }

    ++ref.rendered;
    return ref.prevOutput;
  }

  cache.set(Component, FromClassComponent as any);
  return FromClassComponent;
};

export type ComponentClass<
  Props extends UnknownProps = UnknownProps,
  State extends UnknownProps = UnknownProps,
> = new (props: Props) => Component<Props, State>;

interface InternalState<
  Props extends UnknownProps,
  State extends UnknownProps,
> {
  prevProps?: Props;
  prevState?: State;
  prevOutput?: JSX.Element | null;
  mounted: boolean;
  rendered: number;
}
