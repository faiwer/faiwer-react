import {
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'faiwer-react/hooks';
import type {
  ReactComponent,
  ReactContext,
  UnknownProps,
} from 'faiwer-react/types';

/**
 * A naive implementation of legacy class-based React components. Only the most
 * important methods are implemented. The implementation is very poor. Don't
 * rely on it.
 */
export class Component<
  Props extends UnknownProps,
  State extends UnknownProps = UnknownProps,
> {
  props: Props;
  state!: State;
  context: unknown;
  static defaultProps?: object;
  static contextType?: ReactContext<unknown>;

  constructor(props: Props) {
    this.props = props;
  }

  // Overriden in `convertClassComponentToFC`.
  setState(_update: Partial<Props>) {}

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
    throw new Error(`Render method must be overridden`);
  }

  componentDidCatch(_error: unknown, _info: unknown): void {
    throw new Error(`Not implemented`);
  }

  static getSnapshotBeforeUpdate(
    _prevProps: unknown,
    _prevState: unknown,
  ): unknown {
    throw new Error(`Not implemented`);
  }
}

/**
 * Since I'm too lazy to implement a proper support for this legacy stuff, but
 * some of the 3rd party libraries still rely on it, I've made this converter.
 * It immitate the class-based component's lifecycle using hooks.
 */
export const convertClassComponentToFC = <
  Props extends UnknownProps,
  State extends UnknownProps = UnknownProps,
>(
  Component: new (props: Props) => Component<Props, State>,
): ReactComponent<Props> =>
  function FromClassComponent(props: Props): JSX.Element {
    const { current: ref } = useRef<InternalState<Props>>({ mounted: false });

    const instance = useMemo(
      () =>
        new Component({
          ...(Component as { defaultProps?: Partial<Props> }).defaultProps,
          ...props,
        }),
      [],
    );

    const [state, setState] = useState<State>(
      () => instance.state! ?? ({} as State),
    );

    useEffect(() => {
      ref.mounted = true;

      instance.setState = (update) => {
        setState((prev) => ({
          ...prev,
          ...update,
        }));
      };

      instance.componentDidMount?.();
      return () => {
        instance.componentWillUnmount?.();
        ref.mounted = false;
      };
    }, []);

    useEffect(() => {
      if (ref.mounted) {
        instance.componentDidUpdate(ref.prevProps!, instance.state);
      }
    });

    if ((Component as { contextType?: ReactContext<unknown> }).contextType) {
      instance.context = useContext(
        (Component as unknown as { contextType: ReactContext<unknown> })
          .contextType,
      );
    }

    if (ref.mounted) {
      ref.prevProps = instance.props;
    }
    instance.props = props;
    instance.state = state;

    if (
      !ref.mounted ||
      instance.shouldComponentUpdate(props, instance.state)
    ) {
      ref.prevOutput = instance.render();
    }

    return ref.prevOutput;
  };

interface InternalState<Props extends UnknownProps> {
  prevProps?: Props;
  prevOutput?: JSX.Element | null;
  mounted: boolean;
}

export const isComponentClass = (
  value: unknown,
): value is new (props: UnknownProps) => Component<UnknownProps> => {
  return (
    value != null &&
    typeof value === 'function' &&
    'prototype' in value &&
    value.prototype instanceof Component
  );
};
