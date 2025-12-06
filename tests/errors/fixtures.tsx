import { Component, useError, useState } from 'faiwer-react';
import { expectHtmlFull, useStateX, waitFor } from '../helpers';
import { ReactError } from 'faiwer-react/core/reconciliation/errors/ReactError';

// Error handler for ErrorBoundaryX & ClassBoundaryX.
export const onErrorX = jest.fn();

export const ErrorBoundaryX = ({ children }: { children: JSX.Element }) => {
  const [error, setError] = useState<ReactError | null>(null);
  useError((err) => {
    onErrorX(err);

    if (!(err instanceof ReactError)) {
      throw new Error(`Error is not ReactError instance`);
    }

    setError(err as ReactError);
  });

  return error ? <code id="outer">{error.name}</code> : children;
};

export class ClassBoundaryX extends Component<
  { children: JSX.Element },
  { error: ReactError | null }
> {
  state: { error: ReactError | null } = { error: null };

  componentDidCatch(error: unknown): void {
    if (!(error instanceof ReactError)) {
      throw new Error(`Error is not ReactError instance`);
    }

    onErrorX(error);
    this.setState({ error: error as ReactError });
  }

  render() {
    return this.state.error ? (
      <code id="outer">{this.state.error.name}</code>
    ) : (
      this.props.children
    );
  }
}

export const expectDidCatchX = async (
  root: HTMLElement,
  mask = '%',
): Promise<void> => {
  await waitFor(() => {
    expect(onErrorX.mock.calls).toEqual([[expect.any(ReactError)]]);
    expectHtmlFull(root).toBe(mask.replace('%', ERR_HTML_X));
  });
};

export const Throw = () => {
  throw new Error('test');
};
export const Okay = () => 'okay';

export const genSwitch = () => {
  const error = useStateX<boolean>();
  const Switch = () => (error.use(false) ? <Throw /> : <Okay />);

  return [Switch, error] as const;
};

export const interceptConsole = () => {
  const onError = jest.fn();
  window.addEventListener('error', (evt) => onError(evt.error), {
    once: true,
  });
  jest.spyOn(console, 'error').mockImplementationOnce(() => null);

  const onWarn = jest.fn();
  jest.spyOn(console, 'warn').mockImplementationOnce(() => null);

  return { error: onError, warn: onWarn };
};

export const goodie = {
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

export const ERR_HTML_ON_MOUNT = `<!--r:null:1-->`;
export const ERR_HTML_ON_RERENDER = `<!--r:empty:1-->`;
export const ERR_HTML_X = `<code id="outer">ReactError</code>`;
