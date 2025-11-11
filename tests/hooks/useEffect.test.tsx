import {
  useState,
  type EffectMode,
  type StateSetter,
  useEffect as useNormalEffect,
  useLayoutEffect,
} from '~/index';
import { act } from '~/testing';
import { useRerender, wait, waitFor, useStateX } from '../helpers';
import { expectHtml, mount, stripComments } from '../helpers';

for (const mode of ['normal', 'layout'] as EffectMode[]) {
  const useModeEffect = mode === 'layout' ? useLayoutEffect : useNormalEffect;

  describe(`Hooks: useEffect, mode: ${mode}`, () => {
    it('runs a simple effect', async () => {
      let count = 0;
      const Comp = () => {
        useModeEffect(() => {
          ++count;
        }, []);
        return null;
      };

      mount(<Comp />);
      expect(count).toBe(mode === 'layout' ? 1 : 0);

      await waitFor(() => expect(count).toBe(1));
    });

    it('runs a destructor', async () => {
      const onMountEffect = jest.fn();
      const onUnmountEffect = jest.fn();
      let rerender: () => void;

      const Comp = () => {
        rerender = useRerender();
        useModeEffect(() => {
          onMountEffect();
          return onUnmountEffect;
        });
        return null;
      };

      mount(<Comp />);
      expect(onMountEffect).toHaveBeenCalledTimes(mode === 'layout' ? 1 : 0);
      expect(onUnmountEffect).toHaveBeenCalledTimes(0);

      await waitFor(() => {
        expect(onMountEffect).toHaveBeenCalledTimes(1);
        expect(onUnmountEffect).toHaveBeenCalledTimes(0);
      });

      rerender!();
      await waitFor(() => {
        expect(onMountEffect).toHaveBeenCalledTimes(2);
        expect(onUnmountEffect).toHaveBeenCalledTimes(1);
      });

      rerender!();
      await waitFor(() => {
        expect(onMountEffect).toHaveBeenCalledTimes(3);
        expect(onUnmountEffect).toHaveBeenCalledTimes(2);
      });
    });

    it('runs a destructor when component is unmounted', async () => {
      const onEffectUnmount = jest.fn();
      const show = useStateX<boolean>();

      const Child = () => {
        useModeEffect(() => onEffectUnmount);
        return null;
      };

      const Parent = () => show.use(true) && <Child />;

      mount(<Parent />);

      await waitFor(() => expect(onEffectUnmount).toHaveBeenCalledTimes(0));

      await act(() => show.set(false));
      await waitFor(() => expect(onEffectUnmount).toHaveBeenCalledTimes(1));
    });

    it('provides a signal', async () => {
      const childEffectDep = useStateX<number>();
      const show = useStateX<boolean>();
      let signals: AbortSignal[] = [];
      let aborted = 0;

      const Child = () => {
        const state = childEffectDep.use(0);

        useModeEffect(
          async (signal) => {
            signals.push(signal);
            await Promise.resolve();
            signal.addEventListener('abort', () => ++aborted, { once: true });
            expect(signal.aborted).toBe(false);
          },
          [state],
        );

        return null;
      };

      const Parent = () => show.use(true) && <Child />;

      const getSnapshot = () => signals.map((s) => s.aborted).join('-');

      mount(<Parent />);
      await waitFor(() => {
        expect(getSnapshot()).toBe('false');
        expect(aborted).toBe(0);
      });

      childEffectDep.set(1);
      await waitFor(() => {
        expect(getSnapshot()).toBe('true-false');
        expect(aborted).toBe(1);
      });

      childEffectDep.set(2);
      await waitFor(() => {
        expect(getSnapshot()).toBe('true-true-false');
        expect(aborted).toBe(2);
      });

      show.set(false);
      await waitFor(() => {
        expect(getSnapshot()).toBe('true-true-true');
        expect(aborted).toBe(3);
      });
    });

    it('runs an effect without deps each render', async () => {
      const onEffectMount = jest.fn();
      const onEffectUnmount = jest.fn();
      let rerender: StateSetter<number>;

      const Comp = () => {
        rerender = useRerender();
        useModeEffect(() => {
          onEffectMount();
          return onEffectUnmount;
        });
        return null;
      };

      mount(<Comp />);
      await waitFor(() => {
        expect(onEffectMount).toHaveBeenCalledTimes(1);
        expect(onEffectUnmount).toHaveBeenCalledTimes(0);
      });

      rerender!(1);
      await waitFor(() => {
        expect(onEffectMount).toHaveBeenCalledTimes(2);
        expect(onEffectUnmount).toHaveBeenCalledTimes(1);
      });

      rerender!(2);
      await waitFor(() => {
        expect(onEffectMount).toHaveBeenCalledTimes(3);
        expect(onEffectUnmount).toHaveBeenCalledTimes(2);
      });
    });

    it('runs an []-effect only once', async () => {
      let renderChild: () => void;
      const show = useStateX<boolean>();
      let onEffectUnmount = jest.fn();
      let onEffectMount = jest.fn();

      const Child = () => {
        renderChild = useRerender();

        useModeEffect(() => {
          onEffectMount();
          return onEffectUnmount;
        }, []);

        return null;
      };

      const Parent = () => show.use(true) && <Child />;

      mount(<Parent />);

      for (let _ of [0, 1, 2, 3]) {
        renderChild!();
        await waitFor(() => {
          expect(onEffectMount).toHaveBeenCalledTimes(1);
          expect(onEffectUnmount).toHaveBeenCalledTimes(0);
        });
      }

      show.set(false);
      await waitFor(() => {
        expect(onEffectMount).toHaveBeenCalledTimes(1);
        expect(onEffectUnmount).toHaveBeenCalledTimes(1);
      });
    });

    // Uncomment it once error handling is implemented.
    // it.todo("throws when deps are inconsistent between renders");

    if (mode === 'layout') {
      it('immediately applies state-changes made in layout effects', async () => {
        const onCompRender = jest.fn();
        const onEffectMount = jest.fn();

        const Comp = () => {
          onCompRender();
          const [state, setState] = useState(1);
          useLayoutEffect(() => {
            onEffectMount();
            if (state < 3) {
              setState(state + 1);
            }
          });
          return state;
        };

        let after1st: string = '';
        queueMicrotask(() => (after1st = stripComments(root.innerHTML)));

        const root = mount(<Comp />);
        expect(onCompRender).toHaveBeenCalledTimes(1);

        let after2nd: string = '';
        queueMicrotask(() => (after2nd = stripComments(root.innerHTML)));

        await wait(0);

        expect(after1st).toBe('1');
        expect(after2nd).toBe('2');
        expectHtml(root).toBe('3');
        expect(onCompRender).toHaveBeenCalledTimes(3);
        expect(onEffectMount).toHaveBeenCalledTimes(3);
      });
    }

    if (mode === 'layout') {
      it('immediately applies useState changes when some state was changed in useLayoutEffect', async () => {
        let rendered: string[] = [];
        const onLayoutEffectMount = jest.fn();
        const onNormalEffectMount = jest.fn();

        const Comp = () => {
          const [state1, setState1] = useState(1);
          const [state2, setState2] = useState('0!');

          useLayoutEffect(() => {
            onLayoutEffectMount();
            if (state1 < 3) {
              setState1(state1 + 1);
            }
          }, [state1]);

          // Setting state in the effect above forces the effect below to be
          // pseudo-layout effect. Just to be able to re-run the layout effect
          // for the 2nd time only after all normal effects are called too.
          // Otherwise, it'll be inconsistent.
          useNormalEffect(() => {
            onNormalEffectMount();
            setState2(`${state1}!`);
          }, [state1, state2]);

          rendered.push(`${state1}:${state2}`);
          return rendered.at(-1);
        };

        let after1st: string = '';
        queueMicrotask(() => {
          expect(onLayoutEffectMount).toHaveBeenCalledTimes(1);
          expect(onNormalEffectMount).toHaveBeenCalledTimes(1);
          after1st = stripComments(root.innerHTML);
        });

        const root = mount(<Comp />);
        expect(rendered.join(' ')).toBe('1:0!');

        let after2nd: string = '';
        queueMicrotask(() => {
          expect(onLayoutEffectMount).toHaveBeenCalledTimes(2);
          expect(onNormalEffectMount).toHaveBeenCalledTimes(2);
          after2nd = stripComments(root.innerHTML);
        });

        await wait(0);

        expect(after1st).toBe('1:0!');
        expect(after2nd).toBe('2:1!');
        expectHtml(root).toBe('3:2!');
        await waitFor(() => {
          expect(rendered.join(' ')).toBe(`1:0! 2:1! 3:2! 3:3!`);
          expect(onLayoutEffectMount).toHaveBeenCalledTimes(3);
          expect(onNormalEffectMount).toHaveBeenCalledTimes(4);
        });
      });
    }

    if (mode === 'normal') {
      it("doesn't apply normal effects immediately", async () => {
        let rendered: number[] = [];
        const onEffectMount = jest.fn();

        const Comp = () => {
          const [state, setState] = useState(1);

          useNormalEffect(() => {
            onEffectMount();
            if (state < 3) {
              setState(state + 1);
            }
          }, [state]);

          rendered.push(state);
          return rendered.at(-1);
        };

        let after1st: string = '';
        queueMicrotask(() => (after1st = stripComments(root.innerHTML)));

        const root = mount(<Comp />);
        expect(rendered.join(' ')).toBe('1');

        let after2nd: string = '';
        queueMicrotask(() => (after2nd = stripComments(root.innerHTML)));

        await waitFor(() => {
          expectHtml(root).toBe('3');
          expect(rendered.join(' ')).toBe(`1 2 3`);
          expect(onEffectMount).toHaveBeenCalledTimes(3);

          expect(after1st).toBe('1');
          expect(after2nd).toBe('1');
        });
      });
    }
  });
}
