import {
  findClosestErrorBoundary,
  useError,
} from 'faiwer-react/hooks/useError';
import {
  expectHtml,
  expectHtmlFull,
  mount,
  useRerender,
  useStateX,
  waitFor,
} from '../helpers';
import {
  Component,
  createPortal,
  ErrorHandler,
  Fragment,
  useEffect,
  useLayoutEffect,
  useState,
  type ComponentFiberNode,
} from 'faiwer-react';
import { act } from 'faiwer-react/testing';
import { ReactError } from 'faiwer-react/core/reconciliation/errors/ReactError';

describe('Error handling', () => {
  it('a component with useError is marked as error boundary', () => {
    const Comp = () => {
      useError(() => null);
      return 42;
    };

    const root = mount(<Comp />);
    const fiber = root.__fiber!.children[0];
    expect((fiber as ComponentFiberNode).data.isErrorBoundary).toBe(true);
  });

  it('a component without useError is not marked as error boundary', () => {
    const Comp = () => 42;
    const root = mount(<Comp />);
    const fiber = root.__fiber!.children[0];
    expect((fiber as ComponentFiberNode).data.isErrorBoundary).toBe(false);
  });

  it(`stores the given handler in the hook store`, async () => {
    const handler = useStateX<ErrorHandler>();
    const fn1 = () => 1;
    const fn2 = () => 2;

    const Comp = () => {
      useError(handler.use(() => fn1));
      return 42;
    };

    const root = mount(<Comp />);
    const fiber = root.__fiber!.children[0] as ComponentFiberNode;
    expect(fiber.data.hooks![1]).toMatchObject({ fn: fn1 });

    await act(() => handler.set(() => fn2));
    expect(fiber.data.hooks![1]).toMatchObject({ fn: fn2 });
  });

  const onError = jest.fn();
  const ErrorBoundaryX = ({ children }: { children: JSX.Element }) => {
    const [error, setError] = useState<ReactError | null>(null);
    useError((err) => {
      onError(err);
      setError(err as ReactError);
    });
    return error ? <code id="outer">{error.name}</code> : children;
  };
  const expectDidCatch = () =>
    waitFor(() => {
      expect(onError.mock.calls).toEqual([[expect.any(ReactError)]]);
    });

  it(`finds the closest error boundary`, () => {
    const root = mount(
      <article>
        <ErrorBoundaryX>
          <p>
            <ErrorBoundaryX>
              <span />
            </ErrorBoundaryX>
          </p>
        </ErrorBoundaryX>
      </article>,
    );
    expectHtml(root).toBe(`<article><p><span></span></p></article>`);

    const spanFiber = root.querySelector('span')!.__fiber!;
    const boundaryFiber = spanFiber.parent as ComponentFiberNode;
    expect(boundaryFiber.data.isErrorBoundary).toBe(true);
    expect(findClosestErrorBoundary(spanFiber)).toBe(boundaryFiber);
  });

  const Throw = () => {
    throw new Error('test');
  };
  const Okay = () => 'okay';

  it(`throws when it can't mount an app`, () => {
    expect(() => mount(<Throw />)).toThrow(expect.any(ReactError));
  });

  it(`throws when it can't rerender the app`, async () => {
    const error = useStateX<boolean>();
    const Switch = () => (error.use(false) ? <Throw /> : <Okay />);

    const root = mount(<Switch />);
    expectHtml(root).toBe('okay');

    const onError = jest.fn();
    window.addEventListener('error', (evt) => onError(evt.error), {
      once: true,
    });
    jest.spyOn(console, 'error').mockImplementationOnce(() => null);

    error.set(true);
  });

  const CompContainer = ({ children }: { children: JSX.Element }) => children;

  for (const wrapper of ['fragment', 'tag', 'component']) {
    const Wrapper =
      wrapper === 'tag'
        ? 'div'
        : wrapper === 'fragment'
          ? Fragment
          : CompContainer;

    it(`doesn't mount erroneous content. mode=${wrapper}`, async () => {
      const root = mount(
        <>
          before-1|
          <ErrorBoundaryX>
            before-2
            <Wrapper>
              before-3
              <Throw />
              after-3
            </Wrapper>
            after-2
          </ErrorBoundaryX>
          !after-1
        </>,
      );

      // It's !--null, not !--empty. Why? Because we don't an action type to
      // create an empty comment based from a fiber. The error happens during the
      // initial render, and we must create at least one DOM-node for the failed
      // fiber to keep the engine working.
      expectHtmlFull(root).toBe(`before-1|<!--r:null:1-->!after-1`);
      const boundaryFiber = root.__fiber!.children[1] as ComponentFiberNode;
      expect(boundaryFiber.data.isErrorBoundary).toBe(true);
      expect(boundaryFiber.children).toEqual([
        expect.objectContaining({ type: 'null' }),
      ]);
      await expectDidCatch();
    });

    it(`catches an error on rerender. mode=${wrapper}`, async () => {
      const error = useStateX<boolean>();
      const Switch = () => (error.use(false) ? <Throw /> : <Okay />);

      const Comp = () => {
        return (
          <>
            before-1|
            <ErrorBoundaryX>
              before-2|
              <Wrapper>
                before-3|
                <Switch />
                !after-3
              </Wrapper>
              !after-2
            </ErrorBoundaryX>
            !after-1
          </>
        );
      };

      const root = mount(<Comp />);
      const [open, close] = wrapper === 'tag' ? ['<div>', '</div>'] : ['', ''];
      expectHtmlFull(root).toBe(
        `before-1|before-2|${open}before-3|okay` +
          `!after-3${close}!after-2!after-1`,
      );

      error.set(true);
      await waitFor(() => {
        expectHtmlFull(root).toBe(`before-1|<!--r:empty:1-->!after-1`);
      });
      await expectDidCatch();
    });
  }

  it(`skip rendering for components that will be removed`, async () => {
    const onBeforeRender = jest.fn();
    let renderBefore: () => void;
    const Before = () => {
      onBeforeRender();
      renderBefore = useRerender();

      return 'before!';
    };

    const onAfterRender = jest.fn();
    let renderAfter: () => void;
    const After = () => {
      onAfterRender();
      renderAfter = useRerender();

      return '!after';
    };

    const error = useStateX<boolean>();
    const Switch = () => {
      if (error.use(false)) {
        throw new Error('test');
      }
      return 'okay';
    };

    const root = mount(
      <ErrorBoundaryX>
        <Fragment key="before">
          <Before />
        </Fragment>
        <Switch />
        <Fragment key="after">
          <After />
        </Fragment>
      </ErrorBoundaryX>,
    );
    expectHtmlFull(root).toBe(`before!okay!after`);
    expect(onBeforeRender).toHaveBeenCalledTimes(1);
    expect(onAfterRender).toHaveBeenCalledTimes(1);

    await act(() => {
      renderBefore();
      error.set(true);
      renderAfter();
    });

    await waitFor(() => {
      expectHtmlFull(root).toBe(`<!--r:empty:1-->`);
    });
    expect(onBeforeRender).toHaveBeenCalledTimes(1);
    expect(onAfterRender).toHaveBeenCalledTimes(1);
    await expectDidCatch();
  });

  it('errors are passed through a portal. mode=initial', async () => {
    const target = document.createElement('x-target');
    const root = mount(
      <>
        before-1!
        <ErrorBoundaryX>
          before-2!
          {createPortal(
            <div>
              <Throw />
            </div>,
            target,
          )}
          !after-2
        </ErrorBoundaryX>
        !1-after
      </>,
    );

    expectHtmlFull(root).toBe(`before-1!<!--r:null:1-->!1-after`);
    expectHtmlFull(target).toBe('');
    await expectDidCatch();
  });

  it('errors are passed through a portal. mode=sequential', async () => {
    const error = useStateX<boolean>();
    const Switch = () => {
      if (error.use(false)) {
        throw new Error('test');
      }
      return 'okay';
    };

    const target = document.createElement('x-target');
    const root = mount(
      <>
        before-1!
        <ErrorBoundaryX>
          before-2!
          {createPortal(
            <div>
              <Switch />
            </div>,
            target,
          )}
          !2-after
        </ErrorBoundaryX>
        !1-after
      </>,
    );

    expectHtmlFull(root).toBe(
      `before-1!before-2!<!--r:portal:1-->!2-after!1-after`,
    );
    expectHtmlFull(target).toBe(`<div>okay</div>`);

    await act(() => error.set(true));

    expectHtmlFull(root).toBe(`before-1!<!--r:empty:1-->!1-after`);
    await expectDidCatch();
  });

  it('catches an error caused by an own wrapped child', async () => {
    const error = useStateX<boolean>();
    const Parent = () => {
      // Don't remove the <div/> wrapper.
      return <div>{error.use(false) ? <Throw /> : 'okay'}</div>;
    };

    const root = mount(
      <ErrorBoundaryX>
        <Parent />
      </ErrorBoundaryX>,
    );
    expectHtmlFull(root).toBe('<div>okay</div>');

    await act(() => {
      error.set(true);
    });
    await expectDidCatch();
    expectHtmlFull(root).toBe('<!--r:empty:1-->');
  });

  it('catches an error caused by a new own wrapped child', async () => {
    const fork = useStateX<'tag' | 'comp'>();
    const Parent = () =>
      fork.use('tag') === 'tag' ? (
        <b />
      ) : (
        <div>
          <Throw />
        </div>
      );

    const root = mount(
      <ErrorBoundaryX>
        <Parent />
      </ErrorBoundaryX>,
    );
    expectHtmlFull(root).toBe(`<b></b>`);

    await act(() => fork.set('comp'));
    await expectDidCatch();
    expectHtmlFull(root).toBe(`<!--r:empty:1-->`);
  });

  it('catches errors in new error boundaries', async () => {
    const fork = useStateX<'tag' | 'comp'>();
    const Parent = () =>
      fork.use('tag') === 'tag' ? (
        <b />
      ) : (
        <div>
          <ErrorBoundaryX>
            <Throw />
          </ErrorBoundaryX>
        </div>
      );

    const root = mount(<Parent />);
    expectHtmlFull(root).toBe(`<b></b>`);

    await act(() => fork.set('comp'));
    await expectDidCatch();
    expectHtmlFull(root).toBe(`<div><!--r:null:1--></div>`);
  });

  it(`catches errors happening during an error boundary's rerender`, async () => {
    const showError = useStateX<boolean>();

    const Parent = () => {
      const showErrorValue = showError.use(false);

      const [error, setError] = useState<Error | null>(null);
      useError((error) => {
        onError(error);
        setError(error as ReactError);
      });

      if (error) {
        return <code>{error.name}</code>;
      }

      return <div>{showErrorValue ? <Throw /> : 'okay'}</div>;
    };

    const root = mount(<Parent />);
    expectHtmlFull(root).toBe(`<div>okay</div>`);

    await act(() => showError.set(true));
    expectHtmlFull(root).toBe(`<!--r:empty:1-->`);

    await expectDidCatch();
    await waitFor(() => {
      expectHtmlFull(root).toBe(`<code>ReactError</code>`);
    });
  });

  it('drops effects on error on mount', async () => {
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
    expectHtmlFull(root).toBe('<!--r:null:1-->');

    await waitFor(() =>
      expectHtmlFull(root).toBe('<code id="outer">ReactError</code>'),
    );
    expect(fn).toHaveBeenCalledTimes(0);
    await expectDidCatch();
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

    const showErr = useStateX<boolean>();
    const Switch = () => (showErr.use(false) ? <Throw /> : null);

    const Comp = () => (
      <ErrorBoundaryX>
        <Before />
        <Switch />
        <After />
      </ErrorBoundaryX>
    );

    const root = mount(<Comp />);
    expectHtmlFull(root).toBe(
      '<div>before</div><!--r:null:1--><div>after</div>',
    );

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

    await waitFor(() =>
      expectHtmlFull(root).toBe('<code id="outer">ReactError</code>'),
    );
    // expect(fn).toHaveBeenCalledTimes(0);
    await expectDidCatch();
    expect(beforeFn.mock.calls.map((c) => c[0]).join(',')).toEqual(
      `render,layout:e,normal:e,ref:e`,
    );
    expect(afterFn.mock.calls.map((c) => c[0]).join(',')).toEqual(
      `layout:e,normal:e,ref:e`,
    );
  });

  it(`doesn't reuse the same error boundary on repetitive error. mode="initial"`, async () => {
    const onOuterError = jest.fn();
    const onOuterRender = jest.fn();

    const OuterBoundary = ({ children }: { children: JSX.Element }) => {
      onOuterRender();
      const [error, setError] = useState<ReactError | null>(null);
      useError((err) => {
        onOuterError(err);
        setError(err as ReactError);
      });
      return error ? <code>{error.name}</code> : children;
    };

    const onInnerError = jest.fn();
    const onInnerRender = jest.fn();

    const InnerBoundary = ({ children }: { children: JSX.Element }) => {
      onInnerRender();
      const rerender = useRerender();
      useError((err) => {
        onInnerError(err);
        rerender();
      });
      return children;
    };

    const root = mount(
      <OuterBoundary>
        <InnerBoundary>
          <Throw />
        </InnerBoundary>
      </OuterBoundary>,
    );
    expectHtmlFull(root).toBe(`<!--r:null:1-->`);

    await waitFor(() => {
      expect(onInnerError.mock.calls).toEqual([[expect.any(ReactError)]]);
      expect(onInnerRender).toHaveBeenCalledTimes(2);
      expect(onOuterError).toHaveBeenCalledTimes(0);
      expect(onOuterRender).toHaveBeenCalledTimes(1); // only initial.
    });

    await waitFor(() => {
      expectHtmlFull(root).toBe('<code>ReactError</code>');
      expect(onInnerRender).toHaveBeenCalledTimes(2); // Still 2
      expect(onOuterError).toHaveBeenCalledTimes(1);
      expect(onOuterRender).toHaveBeenCalledTimes(2); // Got the 2nd error.
    });
  });

  it(`doesn't reuse the same error boundary on repetitive error. mode="rerender"`, async () => {
    const onOuterError = jest.fn();
    const onOuterRender = jest.fn();

    const OuterBoundary = ({ children }: { children: JSX.Element }) => {
      onOuterRender();
      const [error, setError] = useState<ReactError | null>(null);
      useError((err) => {
        onOuterError(err);
        setError(err as ReactError);
      });
      return error ? <code>{error.name}</code> : children;
    };

    const onInnerError = jest.fn();
    const onInnerRender = jest.fn();

    const InnerBoundary = ({ children }: { children: JSX.Element }) => {
      onInnerRender();
      const rerender = useRerender();
      useError((err) => {
        onInnerError(err);
        rerender();
      });
      return children;
    };

    const showError = useStateX<boolean>();
    let globalErr = false;
    const Switch = () =>
      showError.use(false) || globalErr ? <Throw /> : 'okay';

    const root = mount(
      <OuterBoundary>
        <InnerBoundary>
          <Switch />
        </InnerBoundary>
      </OuterBoundary>,
    );
    expectHtmlFull(root).toBe(`okay`);

    expect(onInnerRender).toHaveBeenCalledTimes(1);
    expect(onOuterRender).toHaveBeenCalledTimes(1);

    await act(() => {
      globalErr = true;
      showError.set(true);
    });
    expectHtmlFull(root).toBe(`<!--r:empty:1-->`);

    await waitFor(() => {
      expect(onInnerError.mock.calls).toEqual([[expect.any(ReactError)]]);
      expect(onInnerRender).toHaveBeenCalledTimes(2);
      expect(onOuterError).toHaveBeenCalledTimes(0);
      expect(onOuterRender).toHaveBeenCalledTimes(1); // only initial.
    });

    await waitFor(() => {
      expectHtmlFull(root).toBe('<code>ReactError</code>');
      expect(onInnerRender).toHaveBeenCalledTimes(2); // Still 2
      expect(onOuterError).toHaveBeenCalledTimes(1);
      expect(onOuterRender).toHaveBeenCalledTimes(2); // Got the 2nd error.
    });
  });

  it('gives an error boundary a 2nd chance', async () => {
    const InnerBoundary = ({ children }: { children: JSX.Element }) => {
      useError(useRerender()); // Just render it once more, hoping it won't fail again.
      return children;
    };

    const showError = useStateX<boolean>();
    // Each time <Switch/> is recreated it's off.
    const Switch = () => (showError.use(false) ? <Throw /> : 'okay');

    const root = mount(
      <ErrorBoundaryX>
        <InnerBoundary>
          <Switch />
        </InnerBoundary>
      </ErrorBoundaryX>,
    );
    expectHtmlFull(root).toBe(`okay`);

    // Break the <Switch/>.
    await act(() => showError.set(true));
    expectHtmlFull(root).toBe(`<!--r:empty:1-->`); // Step 1.
    await waitFor(() => expectHtmlFull(root).toBe(`okay`)); // Sucessful rerender.

    // Repeat this trick again.
    await act(() => showError.set(true));
    expectHtmlFull(root).toBe(`<!--r:empty:1-->`);
    await waitFor(() => expectHtmlFull(root).toBe(`okay`));
  });

  const goodie = {
    render: jest.fn(),
    layout: {
      mount: jest.fn(),
      unmount: jest.fn(),
    },
    normal: {
      mount: jest.fn(),
      unmount: jest.fn(),
    },
    ref: {
      mount: jest.fn(),
      unmount: jest.fn(),
    },
  };

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
    expectHtmlFull(root).toBe('<!--r:empty:1-->');
    await expectDidCatch();
    await waitFor(() => {
      expectHtmlFull(root).toBe(`<code id="outer">ReactError</code>`);
    });

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
    await expectDidCatch();
    await waitFor(() => {
      expectHtmlFull(root).toBe(`<code id="outer">ReactError</code>`);
    });

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
    expectHtmlFull(root).toBe('<!--r:empty:1-->');
    await expectDidCatch();
    await waitFor(() => {
      expectHtmlFull(root).toBe(`<code id="outer">ReactError</code>`);
    });

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
      await expectDidCatch();
      await waitFor(() => {
        expectHtmlFull(root).toBe(`<code id="outer">ReactError</code>`);
      });
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
      await expectDidCatch();
      await waitFor(() => {
        expectHtmlFull(root).toBe(`<code id="outer">ReactError</code>`);
      });
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

  class ClassBoundary extends Component<
    { children: JSX.Element },
    { error: ReactError | null }
  > {
    state: { error: ReactError | null } = { error: null };
    componentDidCatch(error: unknown): void {
      onError(error);
      this.setState({ error: error as ReactError });
    }
    render() {
      return this.state.error ? (
        <code>{this.state.error.name}</code>
      ) : (
        this.props.children
      );
    }
  }

  it('componentDidCatch catches errors on initial mount', async () => {
    const root = mount(
      <ClassBoundary>
        <Throw />
      </ClassBoundary>,
    );
    expectHtmlFull(root).toBe('<!--r:null:1-->');

    await waitFor(() => {
      expectHtmlFull(root).toBe('<code>ReactError</code>');
    });
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('componentDidCatch catches errors on rerender', async () => {
    const error = useStateX<boolean>();
    const Switch = () => (error.use(false) ? <Throw /> : <Okay />);

    const root = mount(
      <ClassBoundary>
        <Switch />
      </ClassBoundary>,
    );
    expectHtmlFull(root).toBe('okay');

    await act(() => error.set(true));

    await waitFor(() => {
      expectHtmlFull(root).toBe('<code>ReactError</code>');
    });
    expect(onError).toHaveBeenCalledTimes(1);
  });

  for (const placement of ['componentDidCatch', 'useError']) {
    const onInnerError = jest.fn();
    const BadBoundary =
      placement === 'componentDidCatch'
        ? class ClassBoundary extends Component<{ children: JSX.Element }> {
            componentDidCatch(error: ReactError): void {
              onInnerError(error);
              throw new Error('test');
            }
            render() {
              return this.props.children;
            }
          }
        : ({ children }: { children: JSX.Element }) => {
            useError((error) => {
              onInnerError(error);
              throw new Error('test');
            });
            return children;
          };

    it(`handles errros happened in ${placement}: mode=initial`, async () => {
      const root = mount(
        <ErrorBoundaryX>
          before!
          <BadBoundary>
            <Throw />
          </BadBoundary>
          !after
        </ErrorBoundaryX>,
      );
      expectHtmlFull(root).toBe('before!<!--r:null:1-->!after');

      await waitFor(() => {
        expectHtmlFull(root).toBe('<code id="outer">ReactError</code>');
      });
      expect(onError).toHaveBeenCalledTimes(1); // Outer
      expect(onInnerError).toHaveBeenCalledTimes(1);
    });

    it(`handles errros happened in ${placement}: mode=rerender`, async () => {
      const error = useStateX<boolean>();
      const Switch = () => (error.use(false) ? <Throw /> : <Okay />);

      const root = mount(
        <ErrorBoundaryX>
          before!
          <BadBoundary>
            <Switch />
          </BadBoundary>
          !after
        </ErrorBoundaryX>,
      );
      expectHtmlFull(root).toBe('before!okay!after');

      error.set(true);
      await waitFor(() => {
        expectHtmlFull(root).toBe('<code id="outer">ReactError</code>');
      });
      expect(onError).toHaveBeenCalledTimes(1); // Outer
      expect(onInnerError).toHaveBeenCalledTimes(1);
    });

    it(`throws globally on uncaught error happened in ${placement}. mode=initial`, async () => {
      const onGlobalError = jest.fn();
      window.addEventListener('error', (evt) => onGlobalError(evt.error), {
        once: true,
      });
      jest.spyOn(console, 'error').mockImplementationOnce(() => null);

      mount(
        <BadBoundary>
          <Throw />
        </BadBoundary>,
      );

      await waitFor(() => {
        expect(onGlobalError).toHaveBeenCalledTimes(1);
      });
      expect(onInnerError).toHaveBeenCalledTimes(1);
    });

    it(`throws globally on uncaught error happened in ${placement}. mode=rerender`, async () => {
      const error = useStateX<boolean>();
      const Switch = () => (error.use(false) ? <Throw /> : <Okay />);

      const onGlobalError = jest.fn();
      window.addEventListener('error', (evt) => onGlobalError(evt.error), {
        once: true,
      });
      jest.spyOn(console, 'error').mockImplementationOnce(() => null);

      const root = mount(
        <BadBoundary>
          <Switch />
        </BadBoundary>,
      );

      expectHtmlFull(root).toBe('okay');

      act(() => error.set(true));

      await waitFor(() => {
        expect(onGlobalError).toHaveBeenCalledTimes(1);
      });
      expect(onInnerError).toHaveBeenCalledTimes(1);
    });
  }

  it(`class components doen't catch errors if componentDidCatch is not given`, async () => {
    class Comp extends Component<{ children: JSX.Element }> {
      render = () => this.props.children;
    }

    const root = mount(
      <ClassBoundary>
        <Comp>
          <Throw />
        </Comp>
      </ClassBoundary>,
    );
    expectHtmlFull(root).toBe('<!--r:null:1-->');

    await waitFor(() => {
      expectHtmlFull(root).toBe('<code>ReactError</code>');
    });
    expect(onError).toHaveBeenCalledTimes(1);
  });

  for (const mode of ['initial', `initial-nested`]) {
    it(`throws if useError's handler didn't update the state of the error boundary. mode=${mode}`, async () => {
      const onInnerError = jest.fn();
      const SilentBoundary = ({ children }: { children: JSX.Element }) => {
        useError(onInnerError);
        return children;
      };

      const onEffect = jest.fn();
      const Effect = () => {
        useEffect(() => onEffect());
        return 42;
      };

      const onGlobalError = jest.fn();
      window.addEventListener('error', (evt) => onGlobalError(evt.error), {
        once: true,
      });
      jest.spyOn(console, 'error').mockImplementationOnce(() => null);

      const root = mount(
        <>
          {mode === 'initial' ? (
            <SilentBoundary>
              <Throw />
            </SilentBoundary>
          ) : (
            <ErrorBoundaryX>
              <SilentBoundary>
                <Throw />
              </SilentBoundary>
            </ErrorBoundaryX>
          )}
          <Effect />
        </>,
      );
      expectHtmlFull(root).toBe('<!--r:null:1-->42');

      if (mode === 'initial-nested') {
        await waitFor(() => {
          expectHtmlFull(root).toBe('<code id="outer">ReactError</code>42');
          expect(onEffect).toHaveBeenCalledTimes(1);
        });
        expect(onGlobalError).toHaveBeenCalledTimes(0);
      } else {
        await waitFor(() => {
          expect(onGlobalError).toHaveBeenCalledTimes(1);
        });
        expect(onEffect).toHaveBeenCalledTimes(0);
      }
      expect(onInnerError).toHaveBeenCalledTimes(1);
    });
  }

  it(`throws if useError's handler didn't update the state of the error boundary. mode=rerender`, async () => {
    const onInnerError = jest.fn();
    const SilentBoundary = ({ children }: { children: JSX.Element }) => {
      useError(onInnerError);
      return children;
    };

    const error = useStateX<boolean>();
    const Switch = () => (error.use(false) ? <Throw /> : <Okay />);

    const root = mount(
      <ErrorBoundaryX>
        <SilentBoundary>
          <Switch />
        </SilentBoundary>
      </ErrorBoundaryX>,
    );
    expectHtmlFull(root).toBe('okay');

    await act(() => error.set(true));
    expectHtmlFull(root).toBe('<!--r:empty:1-->');

    await waitFor(() => {
      expectHtmlFull(root).toBe('<code id="outer">ReactError</code>');
    });
    expect(onInnerError).toHaveBeenCalledTimes(1);
  });

  it.todo(`catch errors in useImperativeHandle`);
  it.todo(`doesn't throw on setState in ref destructors`);
  it.todo(`pass the info params`);
});
