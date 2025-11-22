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
  createPortal,
  ErrorHandler,
  Fragment,
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
  const ErrorBoundary = ({ children }: { children: JSX.Element }) => {
    useError(onError);
    return children;
  };
  const expectDidCatch = () =>
    waitFor(() => {
      expect(onError.mock.calls).toEqual([[expect.any(ReactError)]]);
    });

  it(`finds the closest error boundary`, () => {
    const root = mount(
      <article>
        <ErrorBoundary>
          <p>
            <ErrorBoundary>
              <span />
            </ErrorBoundary>
          </p>
        </ErrorBoundary>
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
          <ErrorBoundary>
            before-2
            <Wrapper>
              before-3
              <Throw />
              after-3
            </Wrapper>
            after-2
          </ErrorBoundary>
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
            <ErrorBoundary>
              before-2|
              <Wrapper>
                before-3|
                <Switch />
                !after-3
              </Wrapper>
              !after-2
            </ErrorBoundary>
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
      <ErrorBoundary>
        <Fragment key="before">
          <Before />
        </Fragment>
        <Switch />
        <Fragment key="after">
          <After />
        </Fragment>
      </ErrorBoundary>,
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
        <ErrorBoundary>
          before-2!
          {createPortal(
            <div>
              <Throw />
            </div>,
            target,
          )}
          !after-2
        </ErrorBoundary>
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
        <ErrorBoundary>
          before-2!
          {createPortal(
            <div>
              <Switch />
            </div>,
            target,
          )}
          !2-after
        </ErrorBoundary>
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
      <ErrorBoundary>
        <Parent />
      </ErrorBoundary>,
    );
    expectHtmlFull(root).toBe('<div>okay</div>');

    await act(() => {
      error.set(true);
    });
    await expectDidCatch();
    expectHtmlFull(root).toBe('<!--r:empty:1-->');
  });

  it('catches an error caused by a new own wrapped child ', async () => {
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
      <ErrorBoundary>
        <Parent />
      </ErrorBoundary>,
    );
    expectHtmlFull(root).toBe(`<b></b>`);

    await act(() => fork.set('comp'));
    await expectDidCatch();
  });
});
