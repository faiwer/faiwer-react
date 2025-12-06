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
  Fragment,
  useError,
  useState,
  type ComponentFiberNode,
  type ErrorHandler,
  type ErrorInfo,
} from 'faiwer-react';
import { act } from 'faiwer-react/testing';
import {
  ERR_HTML_ON_MOUNT,
  ERR_HTML_ON_RERENDER,
  ErrorBoundaryX,
  expectDidCatchX,
  genSwitch,
  interceptConsole,
  Throw,
} from './fixtures';
import { findClosestErrorBoundary } from 'faiwer-react/hooks/useError';
import { ReactError } from 'faiwer-react/core/reconciliation/errors/ReactError';

describe('Errors: Basics', () => {
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

  it(`throws when it can't mount an app`, () => {
    expect(() => mount(<Throw />)).toThrow(expect.any(ReactError));
  });

  it(`throws when it can't rerender the app`, async () => {
    const [Switch, error] = genSwitch();
    const console = interceptConsole();

    const root = mount(<Switch />);
    expectHtml(root).toBe('okay');

    error.set(true);
    await waitFor(() => {
      expect(console.error.mock.calls).toEqual([[expect.any(ReactError)]]);
    });
  });

  for (const wrapper of ['fragment', 'tag', 'component']) {
    const CompContainer = ({ children }: { children: JSX.Element }) => children;
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
      expectHtmlFull(root).toBe(`before-1|${ERR_HTML_ON_MOUNT}!after-1`);
      const boundaryFiber = root.__fiber!.children[1] as ComponentFiberNode;
      expect(boundaryFiber.data.isErrorBoundary).toBe(true);
      expect(boundaryFiber.children).toEqual([
        expect.objectContaining({ type: 'null' }),
      ]);
      await expectDidCatchX(root, 'before-1|%!after-1');
    });

    it(`catches an error on rerender. mode=${wrapper}`, async () => {
      const [Switch, error] = genSwitch();
      const Comp = () => {
        return (
          <>
            before-1|
            <ErrorBoundaryX>
              before-2|
              <Wrapper>
                before-3|
                <Switch />
                |after-3
              </Wrapper>
              |after-2
            </ErrorBoundaryX>
            |after-1
          </>
        );
      };

      const root = mount(<Comp />);
      const [open, close] = wrapper === 'tag' ? ['<div>', '</div>'] : ['', ''];
      expectHtmlFull(root).toBe(
        `before-1|before-2|${open}before-3|okay` +
          `|after-3${close}|after-2|after-1`,
      );

      error.set(true);
      await waitFor(() => {
        expectHtmlFull(root).toBe(`before-1|${ERR_HTML_ON_RERENDER}|after-1`);
      });
      await expectDidCatchX(root, `before-1|%|after-1`);
    });
  }

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
      return error ? <code id="outer">{error.name}</code> : children;
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
    expectHtmlFull(root).toBe(ERR_HTML_ON_MOUNT);

    await waitFor(() => {
      expect(onInnerError.mock.calls).toEqual([[expect.any(ReactError)]]);
      expect(onInnerRender).toHaveBeenCalledTimes(2);
      expect(onOuterError).toHaveBeenCalledTimes(0);
      expect(onOuterRender).toHaveBeenCalledTimes(1); // only initial.
    });

    await waitFor(() => {
      expectHtmlFull(root).toBe('<code id="outer">ReactError</code>');
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
      return error ? <code id="outer">{error.name}</code> : children;
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
    expectHtmlFull(root).toBe(ERR_HTML_ON_RERENDER);

    await waitFor(() => {
      expect(onInnerError.mock.calls).toEqual([[expect.any(ReactError)]]);
      expect(onInnerRender).toHaveBeenCalledTimes(2);
      expect(onOuterError).toHaveBeenCalledTimes(0);
      expect(onOuterRender).toHaveBeenCalledTimes(1); // only initial.
    });

    await waitFor(() => {
      expectHtmlFull(root).toBe('<code id="outer">ReactError</code>');
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

    const [Switch, showError] = genSwitch();
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
    expectHtmlFull(root).toBe(ERR_HTML_ON_RERENDER); // Step 1.
    await waitFor(() => expectHtmlFull(root).toBe(`okay`)); // Sucessful rerender.

    // Repeat this trick again.
    await act(() => showError.set(true));
    expectHtmlFull(root).toBe(ERR_HTML_ON_RERENDER);
    await waitFor(() => expectHtmlFull(root).toBe(`okay`));
  });

  for (const mode of ['mount', 'rerender']) {
    for (const placement of ['class component', 'useError hook']) {
      it(`passes an ErrorInfo object to the error handler in a ${placement}`, async () => {
        const ErrorBoundary =
          placement === 'class component'
            ? class Boundary extends Component<{
                children: JSX.Element;
              }> {
                state = { stackTrace: '' };

                componentDidCatch(_: unknown, info: ErrorInfo): void {
                  this.setState({ stackTrace: info.componentStack });
                }

                render() {
                  return this.state.stackTrace || this.props.children;
                }
              }
            : function Boundary({ children }: { children: JSX.Element }) {
                const [stackTrace, setStackTrace] = useState('');
                useError((_, info) => {
                  setStackTrace(info.componentStack);
                });
                return stackTrace || children;
              };

        const [Switch, error] = genSwitch();
        const root = mount(
          <ErrorBoundary>
            {mode === 'mount' ? <Throw /> : <Switch />}
          </ErrorBoundary>,
        );

        if (mode === 'mount') {
          expectHtmlFull(root).toBe(ERR_HTML_ON_MOUNT);
        } else {
          expectHtmlFull(root).toBe('okay');
          error.set(true);
        }

        await waitFor(() => {
          expect(root.outerHTML).toMatch(/(Switch|Throw).*\n.*Boundary/m);
        });
      });
    }
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

    expectHtmlFull(root).toBe(ERR_HTML_ON_RERENDER);
    expect(onBeforeRender).toHaveBeenCalledTimes(1);
    expect(onAfterRender).toHaveBeenCalledTimes(1);
    await expectDidCatchX(root);
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
    expectHtmlFull(root).toBe(`<div>${ERR_HTML_ON_MOUNT}</div>`);
    await expectDidCatchX(root, `<div>%</div>`);
  });
});
