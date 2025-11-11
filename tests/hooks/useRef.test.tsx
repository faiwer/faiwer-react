import {
  type RefSetter,
  type RefObject,
  type StateSetter,
  useRef,
  useLayoutEffect,
  type Ref,
  forwardRef,
} from '~/index';
import { act } from '~/testing';

import { useRerender, useStateX, waitFor } from '../helpers';
import { expectHtml, mount } from '../helpers';

describe('Hooks: refs', () => {
  it('useRef always returns the same ref', async () => {
    let refs: unknown[] = [];
    let rerender: StateSetter<number>;
    const Comp = () => {
      refs.push(useRef(null));
      rerender = useRerender();
      return null;
    };

    mount(<Comp />);
    await act(() => rerender(1));
    expect(refs.length).toBe(2);
    expect(refs[0]).toBe(refs[1]);
  });

  it('sets the ref', async () => {
    let ref: RefObject<HTMLDivElement | null>;
    const show = useStateX<boolean>();

    const Comp = () => {
      ref = useRef<HTMLDivElement>(null);
      return show.use(true) && <div ref={ref}>1</div>;
    };

    const root = mount(<Comp />);
    expectHtml(root).toBe('<div>1</div>');
    expect(ref!.current?.tagName).toBe('DIV');
    expect(ref!.current?.parentElement?.tagName).toBe('ROOT');

    await act(() => show.set(false));
    expectHtml(root).toBe('');
    expect(ref!.current).toBe(null);

    await act(() => show.set(true));
    expect(ref!.current?.tagName).toBe('DIV');
    expect(ref!.current?.parentElement?.tagName).toBe('ROOT');
  });

  it('calls the ref-handler', async () => {
    const onRef = jest.fn();
    const show = useStateX<boolean>();

    const Comp = () => show.use(true) && <div ref={onRef}>1</div>;

    const root = mount(<Comp />);
    expectHtml(root).toBe('<div>1</div>');
    expect(onRef).toHaveBeenCalledTimes(1);
    const [node1] = onRef.mock.calls.at(-1) as HTMLElement[];
    expect(node1!.tagName).toBe('DIV');
    expect(node1!.parentElement?.tagName).toBe('ROOT');

    await act(() => show.set(false));
    expectHtml(root).toBe('');
    expect(onRef).toHaveBeenCalledTimes(2);
    const [node2] = onRef.mock.calls.at(-1) as null[];
    expect(node2).toBe(null);

    await act(() => show.set(true));
    expect(onRef).toHaveBeenCalledTimes(3);
    const [node3] = onRef.mock.calls.at(-1) as HTMLElement[];
    expect(node3!.tagName).toBe('DIV');
    expect(node3!.parentElement?.tagName).toBe('ROOT');
  });

  it('reassigns ref when the ref handlers are changed', async () => {
    type State = [RefSetter<HTMLDivElement>, RefObject<HTMLDivElement | null>];
    const onRefs = useStateX<State>();
    // let updateOnRefs: StateSetter<State>;

    const toStr = (v: HTMLDivElement | null): string => v?.tagName ?? 'null';

    const logsFn: string[][] = [];
    const genOnRef = (): RefSetter<HTMLDivElement | null> => {
      const arr: string[] = [];
      logsFn.push(arr);
      return (v: HTMLDivElement | null): void => {
        arr.push(toStr(v));
      };
    };

    const logsRefs: string[][] = [];
    const genRef = (): RefObject<HTMLDivElement | null> => {
      const arr: string[] = [];
      logsRefs.push(arr);
      return {
        set current(v: HTMLDivElement | null) {
          arr.push(toStr(v));
        },
      };
    };

    const Comp = () => {
      const [fn, ref] = onRefs.use(() => [genOnRef(), genRef()]);
      return (
        <div>
          <div ref={fn} />
          <div ref={ref} />
        </div>
      );
    };

    const snapshot = (v: unknown[][]): string =>
      v.map((i) => i.join('-')).join('|');

    mount(<Comp />);
    expect(snapshot(logsFn)).toBe('DIV');
    expect(snapshot(logsRefs)).toBe('DIV');

    await act(() => onRefs.set([genOnRef(), genRef()]));
    // React runs the prev handler with the null value, even if the tag is intact.
    // Keeping this strange behavior for consistency.
    expect(snapshot(logsFn)).toBe('DIV-null|DIV');
    expect(snapshot(logsRefs)).toBe('DIV-null|DIV');
  });

  it('can reassign the same ref to a new node', async () => {
    const key = useStateX<number>();
    const values: Array<string | null> = [];
    const onRef = jest
      .fn()
      .mockImplementation((v) =>
        values.push(v instanceof HTMLElement ? v.textContent : null),
      );

    const Comp = () => {
      const currentKey = key.use(1);
      return (
        <div key={currentKey} ref={onRef}>
          {currentKey}
        </div>
      );
    };

    mount(<Comp />);
    await act(() => key.set(2));
    await waitFor(() => {
      expect(values).toEqual(['1', null, '2']);
    });
  });

  for (const mode of ['remove node', 'remove ref', 'empty node']) {
    it(`runs ref-handlers before running layout effects. Mode: ${mode}`, async () => {
      const onRef = jest.fn();
      const onLayoutEffect = jest.fn();
      const show = useStateX<boolean>();

      const Comp = () => {
        const isShowing = show.use(true);

        useLayoutEffect(onLayoutEffect);
        return mode === 'remove ref' || isShowing ? (
          <div ref={isShowing ? onRef : undefined} />
        ) : mode === 'empty node' ? (
          []
        ) : null;
      };

      mount(<Comp />);

      const check = (idx: number, tagName: string | null) => {
        expect(onLayoutEffect).toHaveBeenCalledTimes(idx);
        expect(onRef).toHaveBeenCalledTimes(idx);
        expect(onRef.mock.invocationCallOrder[idx - 1]).toBeLessThan(
          onLayoutEffect.mock.invocationCallOrder[idx - 1],
        );
        expect(onRef.mock.lastCall[0]?.tagName ?? null).toBe(tagName);
      };

      check(1, 'DIV');

      await act(() => show.set(false));
      check(2, null);

      await act(() => show.set(true));
      check(3, 'DIV');
    });
  }

  for (const mode of ['object', 'fn']) {
    it(`supports components ${mode} refs`, async () => {
      const Child = ({ ref }: { ref: Ref<HTMLDivElement> }) => (
        <div ref={ref} />
      );

      let ref: Ref<HTMLDivElement>;
      const onRef = jest.fn();
      const div = expect.objectContaining({ tagName: 'DIV' });

      const child = useStateX<boolean>();
      const Parent = () => {
        ref = mode === 'fn' ? onRef : useRef<HTMLDivElement | null>(null);
        return child.use(true) && <Child ref={ref} />;
      };

      mount(<Parent />);
      await Promise.resolve();

      const check = (defined: boolean): void => {
        if (mode === 'fn') {
          expect(onRef.mock.lastCall).toEqual(defined ? [div] : [null]);
        } else {
          expect((ref as RefObject<any>).current).toEqual(defined ? div : null);
        }
      };

      check(true);

      await act(() => child.set(false));
      check(false);

      await act(() => child.set(true));
      check(true);
    });

    it('forwardRef: passes the ref inside', async () => {
      const Child = forwardRef((_props: {}, ref?: Ref<number>) => {
        if (typeof ref === 'function') {
          useLayoutEffect(() => ref(42), [ref]);
        } else if (ref) {
          ref.current = 42;
        }
        return null;
      });

      const onRef = jest.fn();
      const ref: RefObject<number | null> = { current: null };

      const show = useStateX<boolean>();
      const Parent = () =>
        show.use(true) && <Child ref={mode === 'fn' ? onRef : ref} />;

      mount(<Parent />);
      expect(mode === 'fn' ? onRef.mock.lastCall?.[0] : ref.current).toBe(42);

      await act(() => show.set(false));
      // No effect destructors.
      expect(mode === 'fn' ? onRef.mock.lastCall?.[0] : ref.current).toBe(42);
    });
  }
});
