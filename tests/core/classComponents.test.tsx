// oxlint-disable no-this-alias
import {
  Component,
  useState,
  type Ref,
  type StateSetter,
  type UnknownProps,
} from 'faiwer-react';
import { expectHtml, mount, waitFor } from '../helpers';
import type { ComponentClass } from 'faiwer-react/core/classComponent';

describe('Class components', () => {
  it('renders a class component', () => {
    class User extends Component {
      render() {
        return <div>I am a class component</div>;
      }
    }

    const root = mount(<User />);
    expectHtml(root).toBe('<div>I am a class component</div>');
  });

  it('supports props', () => {
    class User extends Component<{ name: string }> {
      render() {
        return <div>I am {this.props.name}</div>;
      }
    }

    const root = mount(<User name="legacy" />);
    expectHtml(root).toBe('<div>I am legacy</div>');
  });

  it('supports initial state', () => {
    class User extends Component<{}, { name: string }> {
      state = { name: 'legacy' };
      render() {
        return <div>I am {this.state.name}</div>;
      }
    }

    const root = mount(<User />);
    expectHtml(root).toBe('<div>I am legacy</div>');
  });

  const genWithRef = <Props extends UnknownProps, State extends UnknownProps>(
    initialState: State,
    Source: ComponentClass<Props, State>,
  ): [Ref<Component<Props, State>>, ComponentClass<Props, State>] => {
    let ref: Ref<Component<Props, State>> = {
      current: null as unknown as Component<Props, State>,
    };

    class WithRef extends Source {
      constructor(props: Props) {
        super(props);
        ref.current = this;
      }

      state = initialState;
    }

    return [ref, WithRef] as const;
  };

  it('can change the state', async () => {
    const [ref, User] = genWithRef(
      { name: 'legacy' },
      class User extends Component<{}, { name: string }> {
        render() {
          return <div>I am {this.state.name}</div>;
        }
      },
    );

    const root = mount(<User />);
    expectHtml(root).toBe('<div>I am legacy</div>');

    ref.current.setState({ name: 'a component' });
    // Can't use `await act()` because this pseudo class component always has effects.
    await waitFor(() => {
      expectHtml(root).toBe('<div>I am a component</div>');
    });
  });

  it('supports partial updates', async () => {
    const [ref, User] = genWithRef(
      { name: 'Legacy', age: 20 },
      class User extends Component<{}, { name: string; age: number }> {
        render() {
          return (
            <div>
              I am {this.state.name}, I'm {this.state.age} years old
            </div>
          );
        }
      },
    );

    const root = mount(<User />);
    expectHtml(root).toBe(`<div>I am Legacy, I'm 20 years old</div>`);

    ref.current.setState({ name: 'Erika' });
    await waitFor(() => {
      expectHtml(root).toBe(`<div>I am Erika, I'm 20 years old</div>`);
    });
  });

  it(`handles new props`, async () => {
    class User extends Component<{ age: number }> {
      render() {
        return <div>I'm {this.props.age} years old</div>;
      }
    }

    let updateAge: StateSetter<number>;
    const Wrapper = () => {
      const [age, setAge] = useState(75);
      updateAge = setAge;
      return <User age={age} />;
    };

    const root = mount(<Wrapper />);
    expectHtml(root).toBe(`<div>I'm 75 years old</div>`);

    updateAge!(34);
    await waitFor(() => {
      expectHtml(root).toBe(`<div>I'm 34 years old</div>`);
    });
  });

  it('supports defaultProps', () => {
    type Props = { age: number; name: string };
    class User extends Component<Props> {
      static defaultProps = { age: 21 };

      constructor(props: Props) {
        super(props);
        expect(props.age).toBe(21);
      }

      render(): JSX.Element {
        return (
          <div>
            {this.props.name}, age: {this.props.age}
          </div>
        );
      }
    }
    const root = mount(<User name="Peter" />);
    expectHtml(root).toBe(`<div>Peter, age: 21</div>`);
  });

  it('runs componentDidMount', async () => {
    const onMount = jest.fn();
    class User extends Component {
      componentDidMount(): void {
        onMount();
      }
      render() {
        return null;
      }
    }

    mount(<User />);
    expect(onMount).toHaveBeenCalledTimes(1);
  });

  it('runs componentWillUnmount', async () => {
    const onUnmount = jest.fn();
    class User extends Component {
      componentWillUnmount(): void {
        onUnmount();
      }
      render() {
        return 42;
      }
    }

    let updateShow: StateSetter<boolean>;
    const Wrapper = () => {
      const [show, setShow] = useState(true);
      updateShow = setShow;
      return show && <User />;
    };

    const root = mount(<Wrapper />);
    expectHtml(root).toBe('42');
    expect(onUnmount).toHaveBeenCalledTimes(0);

    updateShow!(false);
    await waitFor(() => {
      expect(onUnmount).toHaveBeenCalledTimes(1);
      expectHtml(root).toBe('');
    });
  });

  it('runs componentDidUpdate', async () => {
    const didUpdate = jest.fn();

    type Props = { id: number };
    type State = { age: number };
    const [ref, User] = genWithRef(
      { age: 20 },
      class User extends Component<Props, State> {
        override componentDidUpdate(prevProps: Props, prevState: State): void {
          didUpdate(prevProps, prevState);
        }
        render() {
          return (
            <>
              {this.props.id}, {this.state.age}
            </>
          );
        }
      },
    );

    let updateId: StateSetter<number>;
    const Wrapper = () => {
      const [id, setId] = useState(1);
      updateId = setId;
      return <User id={id} />;
    };

    const root = mount(<Wrapper />);
    expectHtml(root).toBe('1, 20');
    expect(didUpdate).toHaveBeenCalledTimes(0);

    ref.current.setState({ age: 21 });
    await waitFor(() => {
      expect(didUpdate).toHaveBeenCalledTimes(1);
    });
    expectHtml(root).toBe('1, 21');
    expect(didUpdate).toHaveBeenCalledWith({ id: 1 }, { age: 20 });

    updateId!(2);
    await waitFor(() => {
      expect(didUpdate).toHaveBeenCalledTimes(2);
    });
    expectHtml(root).toBe('2, 21');
    expect(didUpdate).toHaveBeenCalledWith({ id: 1 }, { age: 21 });
  });

  it.todo('shouldComponentUpdate');
  it.todo('contextType, context');
});
