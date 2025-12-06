import { Component, useEffect, useError, useState } from 'faiwer-react';
import { ReactError } from 'faiwer-react/core/reconciliation/errors/ReactError';
import { expectHtmlFull, mount, useStateX, waitFor } from '../helpers';
import {
  ERR_HTML_ON_MOUNT,
  ERR_HTML_ON_RERENDER,
  ErrorBoundaryX,
  expectDidCatchX,
  genSwitch,
  interceptConsole,
  Throw,
} from './fixtures';
import { act } from 'faiwer-react/testing';

describe('Errors: Errors happened in error handlers', () => {
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

      await expectDidCatchX(root);
      expect(onInnerError).toHaveBeenCalledTimes(1);
    });

    it(`handles errros happened in ${placement}: mode=rerender`, async () => {
      const [Switch, error] = genSwitch();
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
      await expectDidCatchX(root);
      expect(onInnerError).toHaveBeenCalledTimes(1);
    });

    it(`throws globally on uncaught error happened in ${placement}. mode=initial`, async () => {
      const console = interceptConsole();
      mount(
        <BadBoundary>
          <Throw />
        </BadBoundary>,
      );

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledTimes(1);
      });
      expect(onInnerError).toHaveBeenCalledTimes(1);
    });

    it(`throws globally on uncaught error happened in ${placement}. mode=rerender`, async () => {
      const [Switch, error] = genSwitch();
      const console = interceptConsole();

      const root = mount(
        <BadBoundary>
          <Switch />
        </BadBoundary>,
      );

      expectHtmlFull(root).toBe('okay');

      error.set(true);

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledTimes(1);
      });
      expect(onInnerError).toHaveBeenCalledTimes(1);
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

        const console = interceptConsole();

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
        expectHtmlFull(root).toBe(ERR_HTML_ON_MOUNT + `42`);

        if (mode === 'initial-nested') {
          await expectDidCatchX(root, `%42`);
          expect(onEffect).toHaveBeenCalledTimes(1);
          expect(console.error).toHaveBeenCalledTimes(0);
        } else {
          await waitFor(() => {
            expect(console.error).toHaveBeenCalledTimes(1);
          });
          expect(onEffect).toHaveBeenCalledTimes(0);
        }
        expect(onInnerError).toHaveBeenCalledTimes(1);
      });
    }
  }

  it(`throws if useError's handler didn't update the state of the error boundary. mode=rerender`, async () => {
    const onInnerError = jest.fn();
    const SilentBoundary = ({ children }: { children: JSX.Element }) => {
      useError(onInnerError);
      return children;
    };

    const [Switch, error] = genSwitch();
    const root = mount(
      <ErrorBoundaryX>
        <SilentBoundary>
          <Switch />
        </SilentBoundary>
      </ErrorBoundaryX>,
    );
    expectHtmlFull(root).toBe('okay');

    await act(() => error.set(true));
    expectHtmlFull(root).toBe(ERR_HTML_ON_RERENDER);

    await expectDidCatchX(root);
    expect(onInnerError).toHaveBeenCalledTimes(1);
  });

  it(`catches errors happened during an error boundary's rerender`, async () => {
    const showError = useStateX<boolean>();
    const onError = jest.fn();

    const Parent = () => {
      const showErrorValue = showError.use(false);

      const [error, setError] = useState<Error | null>(null);
      useError((error) => {
        onError(error);
        setError(error as ReactError);
      });

      if (error) {
        return <code id="inner">{error.name}</code>;
      }

      return <div>{showErrorValue ? <Throw /> : 'okay'}</div>;
    };

    const root = mount(<Parent />);
    expectHtmlFull(root).toBe(`<div>okay</div>`);

    await act(() => showError.set(true));
    expectHtmlFull(root).toBe(ERR_HTML_ON_RERENDER);

    await waitFor(() => {
      expect(onError.mock.calls).toEqual([[expect.any(ReactError)]]);
      expectHtmlFull(root).toBe(`<code id="inner">ReactError</code>`);
    });
  });
});
