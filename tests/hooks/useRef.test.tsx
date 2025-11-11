import {
  useState,
  type RefSetter,
  type RefObject,
  type StateSetter,
  useRef,
  useLayoutEffect,
  type Ref,
} from '~/index';
import { act } from '~/testing';

import {
  createToggler,
  createTogglerX,
  useRerender,
  waitFor,
} from '../helpers';
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
    const div = createToggler();

    const Comp = () => {
      ref = useRef<HTMLDivElement>(null);

      const [show, setShow] = useState(true);
      div.show = () => setShow(true);
      div.hide = () => setShow(false);

      return show && <div ref={ref}>1</div>;
    };

    const root = mount(<Comp />);
    expectHtml(root).toBe('<div>1</div>');
    expect(ref!.current?.tagName).toBe('DIV');
    expect(ref!.current?.parentElement?.tagName).toBe('ROOT');

    await act(() => div.hide!());
    expectHtml(root).toBe('');
    expect(ref!.current).toBe(null);

    await act(() => div.show!());
    expect(ref!.current?.tagName).toBe('DIV');
    expect(ref!.current?.parentElement?.tagName).toBe('ROOT');
  });

  it('calls the ref-handler', async () => {
    const div = createToggler();
    const onRef = jest.fn();

    const Comp = () => {
      const [show, setShow] = useState(true);
      div.show = () => setShow(true);
      div.hide = () => setShow(false);

      return show && <div ref={onRef}>1</div>;
    };

    const root = mount(<Comp />);
    expectHtml(root).toBe('<div>1</div>');
    expect(onRef).toHaveBeenCalledTimes(1);
    const [node1] = onRef.mock.calls.at(-1) as HTMLElement[];
    expect(node1!.tagName).toBe('DIV');
    expect(node1!.parentElement?.tagName).toBe('ROOT');

    await act(() => div.hide!());
    expectHtml(root).toBe('');
    expect(onRef).toHaveBeenCalledTimes(2);
    const [node2] = onRef.mock.calls.at(-1) as null[];
    expect(node2).toBe(null);

    await act(() => div.show!());
    expect(onRef).toHaveBeenCalledTimes(3);
    const [node3] = onRef.mock.calls.at(-1) as HTMLElement[];
    expect(node3!.tagName).toBe('DIV');
    expect(node3!.parentElement?.tagName).toBe('ROOT');
  });

  it('reassigns ref when the ref handlers are changed', async () => {
    type State = [RefSetter<HTMLDivElement>, RefObject<HTMLDivElement | null>];
    let updateOnRefs: StateSetter<State>;

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
      const [[fn, ref], setOnRefs] = useState<State>(() => [
        genOnRef(),
        genRef(),
      ]);
      updateOnRefs = setOnRefs;
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

    await act(() => updateOnRefs!([genOnRef(), genRef()]));
    // React runs the prev handler with the null value, even if the tag is intact.
    // Keeping this strange behavior for consistency.
    expect(snapshot(logsFn)).toBe('DIV-null|DIV');
    expect(snapshot(logsRefs)).toBe('DIV-null|DIV');
  });

  it('can reassign the same ref to a new node', async () => {
    let updateKey: StateSetter<number>;
    const values: Array<string | null> = [];
    const onRef = jest
      .fn()
      .mockImplementation((v) =>
        values.push(v instanceof HTMLElement ? v.textContent : null),
      );

    const Comp = () => {
      const [key, setKey] = useState(1);
      updateKey = setKey;
      return (
        <div key={key} ref={onRef}>
          {key}
        </div>
      );
    };

    mount(<Comp />);
    await act(() => updateKey!(2));
    await waitFor(() => {
      expect(values).toEqual(['1', null, '2']);
    });
  });

  for (const mode of ['remove node', 'remove ref', 'empty node']) {
    it(`runs ref-handlers before running layout effects. Mode: ${mode}`, async () => {
      const onRef = jest.fn();
      const onLayoutEffect = jest.fn();
      let updateShow: StateSetter<boolean>;

      const Comp = () => {
        const [show, setShow] = useState(true);
        updateShow = setShow;

        useLayoutEffect(onLayoutEffect);
        return mode === 'remove ref' || show ? (
          <div ref={show ? onRef : undefined} />
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

      await act(() => updateShow(false));
      check(2, null);

      await act(() => updateShow(true));
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

      let child = createTogglerX();
      const Parent = () => {
        ref = mode === 'fn' ? onRef : useRef<HTMLDivElement | null>(null);
        return child.useToggler() && <Child ref={ref} />;
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

      await act(() => child.hide!());
      check(false);

      await act(() => child.show!());
      check(true);
    });
  }
});
