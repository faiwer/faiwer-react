import { act } from 'faiwer-react/testing';
import {
  expectHtmlFull,
  mount,
  useRerender,
  useStateX,
  waitFor,
} from '../helpers';
import {
  ERR_HTML_ON_MOUNT,
  ERR_HTML_ON_RERENDER,
  ErrorBoundaryX,
  expectDidCatchX,
  genSwitch,
  goodie,
  interceptConsole,
  Throw,
} from './fixtures';
import { useEffect, useLayoutEffect, useState, type Ref } from 'faiwer-react';
import { useImperativeHandle } from 'faiwer-react/hooks/useRef';

describe('Errors: Effects', () => {
  it('drops effects on error on app mount', async () => {
    const fn = jest.fn();

    const Before = () => {
      useLayoutEffect(() => {
        fn();
        return fn();
      });
      useEffect(() => {
        fn();
        return fn();
      });
      return <div ref={fn}>before</div>;
    };

    const After = () => {
      fn();
      useLayoutEffect(() => {
        fn();
        return fn();
      });
      useEffect(() => {
        fn();
        return fn();
      });
      return <div ref={fn}>after</div>;
    };

    const root = mount(
      <ErrorBoundaryX>
        <Before />
        <Throw />
        <After />
      </ErrorBoundaryX>,
    );
    expectHtmlFull(root).toBe(ERR_HTML_ON_MOUNT);

    await expectDidCatchX(root);
    expect(fn).toHaveBeenCalledTimes(0);
  });

  it('drops effects on error on rerender', async () => {
    const beforeFn = jest.fn();
    const afterFn = jest.fn();
    let rerenderBefore: () => void;
    let rerenderAfter: () => void;

    const Before = () => {
      beforeFn('render');
      rerenderBefore = useRerender();

      useLayoutEffect(() => {
        beforeFn('layout:b');
        return () => beforeFn('layout:e');
      });

      useEffect(() => {
        beforeFn('normal:b');
        return () => beforeFn('normal:e');
      });

      return <div ref={(v) => beforeFn(`ref:${v ? 'b' : 'e'}`)}>before</div>;
    };

    const After = () => {
      afterFn('render');
      rerenderAfter = useRerender();

      useLayoutEffect(() => {
        afterFn('layout:b');
        return () => afterFn('layout:e');
      });

      useEffect(() => {
        afterFn('normal:b');
        return () => afterFn('normal:e');
      });

      return <div ref={(v) => afterFn(`ref:${v ? 'b' : 'e'}`)}>after</div>;
    };

    const [Switch, showErr] = genSwitch();
    const Comp = () => (
      <ErrorBoundaryX>
        <Before />
        <Switch />
        <After />
      </ErrorBoundaryX>
    );

    const root = mount(<Comp />);
    expectHtmlFull(root).toBe('<div>before</div>okay<div>after</div>');

    await waitFor(() => {
      for (const mock of [beforeFn, afterFn]) {
        expect(mock.mock.calls.map((c) => c[0]).join(',')).toEqual(
          `render,ref:b,layout:b,normal:b`,
        );
      }
    });

    await act(() => {
      beforeFn.mockReset();
      afterFn.mockReset();
      // In this order we have the next sequence: Before -> Switch -> After.
      showErr.set(true);
      rerenderAfter();
      rerenderBefore();
    });

    await expectDidCatchX(root);
    expect(beforeFn.mock.calls.map((c) => c[0]).join(',')).toEqual(
      `render,layout:e,normal:e,ref:e`,
    );
    expect(afterFn.mock.calls.map((c) => c[0]).join(',')).toEqual(
      `layout:e,normal:e,ref:e`,
    );
  });

  it(`catches errors in layout effects: mode=mount`, async () => {
    const Goodie = () => {
      useLayoutEffect(() => {
        goodie.layout.mount();
        return goodie.layout.unmount();
      });
      useEffect(() => {
        goodie.normal.mount();
        return goodie.normal.unmount;
      });
      return <br ref={(v) => goodie.ref[v ? 'mount' : 'unmount'](v)} />;
    };

    const Baddie = () => {
      useLayoutEffect(() => {
        throw new Error(`test`);
      });
      return 42;
    };

    const root = mount(
      <ErrorBoundaryX>
        <Goodie />
        <Baddie />
        <Goodie />
      </ErrorBoundaryX>,
    );
    expectHtmlFull(root).toBe(ERR_HTML_ON_RERENDER);

    await expectDidCatchX(root);

    expect(goodie.normal.mount).toHaveBeenCalledTimes(0);
    // No effects installed = no destructors run.
    expect(goodie.normal.unmount).toHaveBeenCalledTimes(0);

    // The 1st <Goodie/> manages to run its effect before <Baddie/> fails.
    expect(goodie.layout.mount).toHaveBeenCalledTimes(1);
    expect(goodie.layout.unmount).toHaveBeenCalledTimes(1);
    // Refs are called before layout hooks. So both <Goodie/>s get it.
    expect(goodie.ref.mount).toHaveBeenCalledTimes(2);
    expect(goodie.ref.unmount).toHaveBeenCalledTimes(2);
  });

  it(`catches errors in normal effects: mode=mount`, async () => {
    const Goodie = () => {
      useLayoutEffect(() => {
        goodie.layout.mount();
        return goodie.layout.unmount();
      });
      useEffect(() => {
        goodie.normal.mount();
        return goodie.normal.unmount;
      });
      return <br ref={(v) => goodie.ref[v ? 'mount' : 'unmount'](v)} />;
    };

    const Baddie = () => {
      useEffect(() => {
        throw new Error(`test`);
      });
      return 42;
    };

    const root = mount(
      <ErrorBoundaryX>
        <Goodie />
        <Baddie />
        <Goodie />
      </ErrorBoundaryX>,
    );
    expectHtmlFull(root).toBe('<br>42<br>');

    await expectDidCatchX(root);

    expect(goodie.normal.mount).toHaveBeenCalledTimes(1);
    // Only the 1st one manages to run the normal effect.
    expect(goodie.normal.unmount).toHaveBeenCalledTimes(1);

    // Since normal effects are run before normal effects both goodies did it.
    expect(goodie.layout.mount).toHaveBeenCalledTimes(2);
    expect(goodie.layout.unmount).toHaveBeenCalledTimes(2);
    // It's the same with refs.
    expect(goodie.ref.mount).toHaveBeenCalledTimes(2);
    expect(goodie.ref.unmount).toHaveBeenCalledTimes(2);
  });

  it(`catches errors in ref effects: mode=mount`, async () => {
    const Goodie = () => {
      useLayoutEffect(() => {
        goodie.layout.mount();
        return goodie.layout.unmount();
      });
      useEffect(() => {
        goodie.normal.mount();
        return goodie.normal.unmount;
      });
      return <br ref={(v) => goodie.ref[v ? 'mount' : 'unmount'](v)} />;
    };

    const Baddie = () => {
      useEffect(() => {
        throw new Error(`test`);
      });
      return (
        <div
          ref={() => {
            throw new Error('test');
          }}
        />
      );
    };

    const root = mount(
      <ErrorBoundaryX>
        <Goodie />
        <Baddie />
        <Goodie />
      </ErrorBoundaryX>,
    );
    expectHtmlFull(root).toBe(ERR_HTML_ON_RERENDER);
    await expectDidCatchX(root);

    // Since normal & layout effects are set after ref effects we have none.
    // Note: In origin React refs & layout effects might have random order.
    expect(goodie.normal.mount).toHaveBeenCalledTimes(0);
    expect(goodie.normal.unmount).toHaveBeenCalledTimes(0);
    expect(goodie.layout.mount).toHaveBeenCalledTimes(0);
    expect(goodie.layout.unmount).toHaveBeenCalledTimes(0);
    // the 1st <Goodie/> managed to get it.
    expect(goodie.ref.mount).toHaveBeenCalledTimes(1);
    // We call it for the 2nd <Goodie/> in vain, because it wasn't called with
    // the positive value before. But it's not a big deal. The origin React
    // runs even more effects in vain in this test.
    expect(goodie.ref.unmount.mock.calls.length).toBeGreaterThan(1);
  });

  for (const mode of ['normal', 'layout', 'ref']) {
    it(`catches errors in ${mode} effects: mode=rerender`, async () => {
      const rerender: Partial<Record<'before' | 'after', () => void>> = {};

      const Goodie = ({ pos }: { pos: keyof typeof rerender }) => {
        rerender[pos] = useRerender();
        goodie.render();
        useLayoutEffect(() => {
          goodie.layout.mount();
          return goodie.layout.unmount();
        });
        useEffect(() => {
          goodie.normal.mount();
          return goodie.normal.unmount;
        });
        return <br ref={(v) => goodie.ref[v ? 'mount' : 'unmount'](v)} />;
      };

      const throwErr = useStateX<boolean>();
      const Baddie = () => {
        const throwErrValue = throwErr.use(false);

        if (mode !== 'ref') {
          (mode === 'normal' ? useEffect : useLayoutEffect)(() => {
            if (throwErrValue) {
              throw new Error(`test`);
            }
          });
        }

        return (
          <div
            ref={
              mode === 'ref'
                ? () => {
                    if (throwErrValue) throw new Error('test');
                  }
                : undefined
            }
          />
        );
      };

      const root = mount(
        <ErrorBoundaryX>
          <Goodie pos="before" />
          <Baddie />
          <Goodie pos="after" />
        </ErrorBoundaryX>,
      );
      expectHtmlFull(root).toBe('<br><div></div><br>');

      await act(() => {
        throwErr.set(true);
        rerender.before!();
        rerender.after!();
      });
      await expectDidCatchX(root);
      expect(goodie.render).toHaveBeenCalledTimes(4); // two renders for both.

      if (mode === 'layout') {
        expect(goodie.normal.mount).toHaveBeenCalledTimes(2); // only 1st render
        expect(goodie.normal.unmount).toHaveBeenCalledTimes(2);

        expect(goodie.layout.mount).toHaveBeenCalledTimes(3); // Only 1 <Goodie/>
        expect(goodie.layout.unmount).toHaveBeenCalledTimes(3);
        // Refs are called before layout hooks. So both <Goodie/>s get it twice.
        expect(goodie.ref.mount).toHaveBeenCalledTimes(4);
        expect(goodie.ref.unmount).toHaveBeenCalledTimes(4);
      } else if (mode === 'normal') {
        expect(goodie.normal.mount).toHaveBeenCalledTimes(3); // only one <Goodie/>
        expect(goodie.normal.unmount).toHaveBeenCalledTimes(3);
        // Refs & layout effects are called before normal hooks.
        expect(goodie.layout.mount).toHaveBeenCalledTimes(4);
        expect(goodie.layout.unmount).toHaveBeenCalledTimes(4);
        expect(goodie.ref.mount).toHaveBeenCalledTimes(4);
        expect(goodie.ref.unmount).toHaveBeenCalledTimes(4);
      } else {
        expect(goodie.ref.mount).toHaveBeenCalledTimes(3); // Only for 1 <Goodie/>
        expect(goodie.ref.unmount.mock.calls.length).toBeGreaterThan(2);
        // layout & normal effects are set up after ref effects.
        expect(goodie.layout.mount).toHaveBeenCalledTimes(2);
        expect(goodie.layout.unmount).toHaveBeenCalledTimes(2);
        expect(goodie.normal.mount).toHaveBeenCalledTimes(2);
        expect(goodie.normal.unmount).toHaveBeenCalledTimes(2);
      }
    });
  }

  for (const mode of ['layout', 'normal', 'ref']) {
    it(`catches errors in the destructors of ${mode} effects: mode=rerender`, async () => {
      const rerender: Partial<Record<'before' | 'after', () => void>> = {};
      let globalThrow = false;

      const Goodie = ({ pos }: { pos: keyof typeof rerender }) => {
        rerender[pos] = useRerender();
        goodie.render();

        useLayoutEffect(() => {
          goodie.layout.mount();
          return goodie.layout.unmount();
        });

        useEffect(() => {
          goodie.normal.mount();
          return goodie.normal.unmount;
        });
        return <br ref={(v) => goodie.ref[v ? 'mount' : 'unmount'](v)} />;
      };

      let baddieRerender: () => void;
      const Baddie = () => {
        baddieRerender = useRerender();

        if (mode !== 'ref') {
          (mode === 'normal' ? useEffect : useLayoutEffect)(() => () => {
            if (globalThrow) {
              throw new Error(`test`);
            }
          });
        }

        return (
          <div
            ref={
              mode === 'ref'
                ? (v) => {
                    if (globalThrow && !v) throw new Error('test');
                  }
                : undefined
            }
          />
        );
      };

      const root = mount(
        <ErrorBoundaryX>
          <Goodie pos="before" />
          <Baddie />
          <Goodie pos="after" />
        </ErrorBoundaryX>,
      );
      expectHtmlFull(root).toBe('<br><div></div><br>');

      await act(() => {
        globalThrow = true;
        baddieRerender();
        rerender.before!();
        rerender.after!();
      });
      await expectDidCatchX(root);
      expect(goodie.render).toHaveBeenCalledTimes(4); // two renders for both.

      if (mode === 'layout') {
        expect(goodie.normal.mount).toHaveBeenCalledTimes(2); // only 1st render
        expect(goodie.normal.unmount).toHaveBeenCalledTimes(2);

        expect(goodie.layout.mount).toHaveBeenCalledTimes(3); // Only 1 <Goodie/>
        expect(goodie.layout.unmount).toHaveBeenCalledTimes(3);
        // Refs are called before layout hooks. So both <Goodie/>s get it twice.
        expect(goodie.ref.mount).toHaveBeenCalledTimes(4);
        expect(goodie.ref.unmount).toHaveBeenCalledTimes(4);
      } else if (mode === 'normal') {
        expect(goodie.normal.mount).toHaveBeenCalledTimes(3); // only one <Goodie/>
        expect(goodie.normal.unmount).toHaveBeenCalledTimes(3);
        // Refs & layout effects are called before normal hooks.
        expect(goodie.layout.mount).toHaveBeenCalledTimes(4);
        expect(goodie.layout.unmount).toHaveBeenCalledTimes(4);
        expect(goodie.ref.mount).toHaveBeenCalledTimes(4);
        expect(goodie.ref.unmount).toHaveBeenCalledTimes(4);
      } else {
        // We run unref-effects before ref-effects, so we don't run any set-ref
        // effects in the 2nd render.
        expect(goodie.ref.mount).toHaveBeenCalledTimes(2);
        // For both <Goodie/>s:
        expect(goodie.ref.unmount.mock.calls.length).toBeGreaterThan(2);
        // layout & normal effects are set up after ref effects.
        expect(goodie.layout.mount).toHaveBeenCalledTimes(2);
        expect(goodie.layout.unmount).toHaveBeenCalledTimes(2);
        expect(goodie.normal.mount).toHaveBeenCalledTimes(2);
        expect(goodie.normal.unmount).toHaveBeenCalledTimes(2);
      }
    });
  }

  for (const mode of ['mount', 'rerender']) {
    it(`catches errors in useImperativeHandle: ${mode}`, async () => {
      const ref = { current: null };
      const error = useStateX<boolean>();

      const Comp = ({ ref }: { ref?: Ref<unknown> }) => {
        const fail = error.use(mode === 'mount');

        useImperativeHandle(ref, () => {
          if (fail) {
            throw new Error('test');
          }
        }, [Math.random()]);
        return 42;
      };
      const root = mount(
        <ErrorBoundaryX>
          <Comp ref={ref} />
        </ErrorBoundaryX>,
      );

      if (mode === 'rerender') {
        expectHtmlFull(root).toBe('42');
        await act(() => error.set(true));
      } else {
        expectHtmlFull(root).toBe(ERR_HTML_ON_RERENDER);
      }

      await expectDidCatchX(root);
    });
  }

  it(`doesn't throw when "setState" is called in the ref-unmount handler`, async () => {
    const console = interceptConsole();

    const Inner = () => {
      const [st, setState] = useState<HTMLButtonElement | null>(null);
      return <button ref={setState}>{st?.tagName ?? 'n/a'}</button>;
    };

    const show = useStateX<boolean>();
    const Parent = () => show.use(true) && <Inner />;

    const root = mount(<Parent />);
    expectHtmlFull(root).toBe('<button>n/a</button>');
    await waitFor(() => {
      expectHtmlFull(root).toBe('<button>BUTTON</button>');
    });

    await act(() => show.set(false));
    expectHtmlFull(root).toBe(ERR_HTML_ON_MOUNT);

    expect(console.error).toHaveBeenCalledTimes(0);
    expect(console.warn).toHaveBeenCalledTimes(0);
  });
});
