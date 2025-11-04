// oxlint-disable no-this-alias
import {
  Component,
  useState,
  type Ref,
  type StateSetter,
  type UnknownProps,
} from 'faiwer-react';
import { expectHtml, mount, waitFor } from '../helpers';

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
    Source: new (props: Props) => Component<Props, State>,
  ): [
    Ref<Component<Props, State>>,
    new (props: Props) => Component<Props, State>,
  ] => {
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
});
