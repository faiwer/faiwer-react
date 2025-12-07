import { act } from 'faiwer-react/testing';
import { expectHtml, mount } from '../helpers';
import { useReducer } from 'faiwer-react/hooks/useReducer';

describe('Hooks: useReducer', () => {
  it('uses the initial arg as initial state', () => {
    const Comp = () => useReducer<number, number>(() => 42, 43)[0];
    const root = mount(<Comp />);
    expectHtml(root).toBe('43');
  });

  it('uses the initializer to generate the initial state', () => {
    const Comp = () =>
      useReducer(
        () => 42,
        '43',
        (initialArg: string): number => Number(initialArg) + 1,
      )[0];
    const root = mount(<Comp />);
    expectHtml(root).toBe('44');
  });

  const numberReducer = (st: number, diff: number): number => st + diff;

  it('dispatch runs the reducer and updates the state', async () => {
    let dispatchFn: (v: number) => void;
    const Comp = () => {
      const [st, dispatch] = useReducer(numberReducer, 42);
      dispatchFn = dispatch;
      return st;
    };

    const root = mount(<Comp />);
    expectHtml(root).toBe('42');

    await act(() => dispatchFn(-4));
    expectHtml(root).toBe('38');

    await act(() => dispatchFn(5));
    expectHtml(root).toBe('43');
  });

  it('supports action-less reducers', async () => {
    let dispatchFn: () => void;
    const Comp = () => {
      const [st, dispatch] = useReducer((st: number) => st + 1, 42);
      dispatchFn = dispatch;
      return st;
    };

    const root = mount(<Comp />);
    expectHtml(root).toBe('42');

    await act(() => dispatchFn());
    expectHtml(root).toBe('43');

    await act(() => dispatchFn());
    expectHtml(root).toBe('44');
  });

  it('support regular reducers', async () => {
    type State = { v: number };
    type Action = { type: 'inc' | 'dec' };

    const reducer = (prevState: State, action: Action): State => ({
      v: action.type === 'inc' ? prevState.v + 1 : prevState.v - 1,
    });

    let dispatchFn: (action: Action) => void;
    const Comp = () => {
      const [value, dispatch] = useReducer(reducer, { v: 42 });
      dispatchFn = dispatch;
      return value.v;
    };

    const root = mount(<Comp />);
    expectHtml(root).toBe('42');

    await act(() => dispatchFn({ type: 'inc' }));
    expectHtml(root).toBe('43');

    await act(() => dispatchFn({ type: 'dec' }));
    expectHtml(root).toBe('42');
  });
});
