import { createRoot, useState, useSyncExternalStore } from '~/index';
import { act } from '~/testing';
import { expectHtml, mount, waitFor } from '../helpers';

type Store<T> = {
  subscribe: (onStoreChange: () => void) => () => void;
  get: () => T;
  set: (value: T) => void;
  listeners: number;
};

function createStore<T>(initial: T): Store<T> {
  let value = initial;
  const listeners = new Set<() => void>();

  return {
    subscribe: (onStoreChange) => {
      listeners.add(onStoreChange);
      return () => listeners.delete(onStoreChange);
    },
    get: () => value,
    set: (next) => {
      value = next;
      for (const listener of listeners) listener();
    },
    get listeners() {
      return listeners.size;
    },
  };
}

describe('Hooks: useSyncExternalStore', () => {
  it('renders the snapshot from the first read', () => {
    const store = createStore('Content');
    const Comp = () => useSyncExternalStore(store.subscribe, store.get);

    expectHtml(mount(<Comp />)).toBe('Content');
  });

  it('renders NaN', () => {
    const store = createStore(NaN);
    const Comp = () => useSyncExternalStore(store.subscribe, store.get);

    expectHtml(mount(<Comp />)).toBe('NaN');
  });

  it('re-renders when the store notifies with a new snapshot', async () => {
    const store = createStore(0);
    const Comp = () => useSyncExternalStore(store.subscribe, store.get);
    const root = mount(<Comp />);
    expectHtml(root).toBe('0');

    await waitFor(() => expect(store.listeners).toBe(1));
    await act(() => store.set(1));
    expectHtml(root).toBe('1');
  });

  it('does not re-render when the snapshot is Object.is to the previous one', async () => {
    const store = createStore(NaN);
    let renders = 0;
    const Comp = () => {
      renders += 1;
      return String(useSyncExternalStore(store.subscribe, store.get));
    };

    mount(<Comp />);
    await waitFor(() => expect(store.listeners).toBe(1));
    expect(renders).toBe(1);

    await act(() => store.set(NaN));
    expect(renders).toBe(1);
  });

  it('re-renders when the snapshot changes from 0 to -0', async () => {
    const store = createStore(0);
    const Comp = () => {
      const value = useSyncExternalStore(store.subscribe, store.get);
      return Object.is(value, -0) ? '-0' : String(value);
    };
    const root = mount(<Comp />);
    expectHtml(root).toBe('0');

    await waitFor(() => expect(store.listeners).toBe(1));
    await act(() => store.set(-0));
    expectHtml(root).toBe('-0');
  });

  it('unsubscribes on unmount', async () => {
    const store = createStore(1);
    const Comp = () => useSyncExternalStore(store.subscribe, store.get);
    const node = document.createElement('div');
    const root = createRoot(node, { testMode: true });
    root.render(<Comp />);

    await waitFor(() => expect(store.listeners).toBe(1));
    root.unmount();
    expect(store.listeners).toBe(0);
  });

  it('resubscribes when subscribe changes', async () => {
    const first = createStore(1);
    const second = createStore(2);
    let setStore: (store: Store<number>) => void;
    const Child = ({ store }: { store: Store<number> }) =>
      useSyncExternalStore(store.subscribe, store.get);
    const Parent = () => {
      const [store, setNext] = useState(first);
      setStore = setNext;
      return <Child store={store} />;
    };

    const root = mount(<Parent />);
    await waitFor(() => expect(first.listeners).toBe(1));
    expectHtml(root).toBe('1');

    await act(() => setStore(second));
    await waitFor(() => {
      expect(first.listeners).toBe(0);
      expect(second.listeners).toBe(1);
    });
    expectHtml(root).toBe('2');
  });

  it('picks up a store change that happens before the effect subscribes', async () => {
    const store = createStore(1);
    const Comp = () => useSyncExternalStore(store.subscribe, store.get);
    const root = mount(<Comp />);
    expectHtml(root).toBe('1');
    expect(store.listeners).toBe(0);

    store.set(2);
    await waitFor(() => expectHtml(root).toBe('2'));
  });

  it('throws when the first getSnapshot call throws', () => {
    const Comp = () => {
      useSyncExternalStore(
        () => () => {},
        () => {
          throw new Error('bad snapshot');
        },
      );
      return null;
    };

    expect(() => mount(<Comp />)).toThrow('bad snapshot');
  });

  it('recovers when getSnapshot throws in the listener and the parent passes fresh props', async () => {
    let selected = 'a';
    let throws = 0;
    const items: Record<string, string> = { a: 'A' };
    const store = createStore(0);
    const notify = () => store.set(store.get() + 1);

    const Child = ({ id }: { id: string }) => {
      const name = useSyncExternalStore(store.subscribe, () => {
        if (!(id in items)) {
          throws += 1;
          throw new Error(`missing ${id}`);
        }
        return items[id];
      });
      return name;
    };
    const Parent = () => {
      const id = useSyncExternalStore(store.subscribe, () => selected);
      return <Child id={id} />;
    };

    const root = mount(<Parent />);
    expectHtml(root).toBe('A');
    await waitFor(() => expect(store.listeners).toBe(2));

    delete items.a;
    items.b = 'B';
    selected = 'b';
    await act(() => notify());
    expect(throws).toBe(1);
    expectHtml(root).toBe('B');
  });

  it('does not render a child removed in the same store update when its getter throws', async () => {
    let showChild = true;
    const store = createStore(0);
    const notify = () => store.set(store.get() + 1);

    const Child = () => {
      const label = useSyncExternalStore(store.subscribe, () => {
        if (!showChild) throw new Error('zombie');
        return 'child';
      });
      return label;
    };
    const Parent = () => {
      const show = useSyncExternalStore(store.subscribe, () => showChild);
      return show ? <Child /> : 'gone';
    };

    const root = mount(<Parent />);
    expectHtml(root).toBe('child');
    await waitFor(() => expect(store.listeners).toBe(2));

    showChild = false;
    await act(() => notify());
    expectHtml(root).toBe('gone');
  });

  it('warns once when getSnapshot returns a new value on every call', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const store = createStore(0);
    const node = document.createElement('div');
    const Comp = () => {
      useSyncExternalStore(store.subscribe, () => ({}));
      return null;
    };

    const prod = createRoot(node);
    prod.render(<Comp />);
    expect(warn).not.toHaveBeenCalled();
    prod.unmount();

    const root = createRoot(node, { testMode: true });
    root.render(<Comp />);
    root.render(<Comp />);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      'The result of getSnapshot should be cached to avoid an infinite loop',
    );
    root.unmount();
  });
});
