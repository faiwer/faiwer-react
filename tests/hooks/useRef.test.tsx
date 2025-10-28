import {
  useState,
  type RefSetter,
  type Ref,
  type StateSetter,
  useRef,
} from '~/index';
import { act } from '~/testing';

import { createToggler, useRerender, waitFor } from '../helpers';
import { expectHtml, mount } from '../helpers';

describe('Hooks: refs', () => {
  it('useRef always returns the same ref', async () => {
    let refs: unknown[] = [];
    let rerender: StateSetter<number>;
    const Comp = () => {
      refs.push(useRef());
      rerender = useRerender();
      return null;
    };

    mount(<Comp />);
    await act(() => rerender(1));
    expect(refs.length).toBe(2);
    expect(refs[0]).toBe(refs[1]);
  });

  it('sets the ref', async () => {
    let ref: Ref<HTMLDivElement | undefined>;
    const div = createToggler();

    const Comp = () => {
      ref = useRef<HTMLDivElement>();

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
    type State = [RefSetter<HTMLDivElement>, Ref<HTMLDivElement>];
    let updateOnRefs: StateSetter<State>;

    const toStr = (v: HTMLDivElement | null): string => v?.tagName ?? 'null';

    const logsFn: string[][] = [];
    const genOnRef = (): RefSetter<HTMLDivElement> => {
      const arr: string[] = [];
      logsFn.push(arr);
      return (v: HTMLDivElement | null): void => {
        arr.push(toStr(v));
      };
    };

    const logsRefs: string[][] = [];
    const genRef = () => {
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
});
