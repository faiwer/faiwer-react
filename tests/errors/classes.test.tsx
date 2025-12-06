import { Component } from 'faiwer-react';
import { expectHtmlFull, mount, waitFor } from '../helpers';
import {
  ClassBoundaryX,
  ERR_HTML_ON_MOUNT,
  expectDidCatchX,
  genSwitch,
  Throw,
} from './fixtures';
import { ReactError } from 'faiwer-react/core/reconciliation/errors/ReactError';

describe('Errors: Class components', () => {
  it('componentDidCatch catches errors on initial mount', async () => {
    const root = mount(
      <ClassBoundaryX>
        <Throw />
      </ClassBoundaryX>,
    );
    expectHtmlFull(root).toBe(ERR_HTML_ON_MOUNT);

    await expectDidCatchX(root);
  });

  it('componentDidCatch catches errors on rerender', async () => {
    const [Switch, error] = genSwitch();
    const root = mount(
      <ClassBoundaryX>
        <Switch />
      </ClassBoundaryX>,
    );
    expectHtmlFull(root).toBe('okay');

    error.set(true);
    await expectDidCatchX(root);
  });

  it(`class components doesn't catch errors if componentDidCatch is not given`, async () => {
    class Comp extends Component<{ children: JSX.Element }> {
      render = () => this.props.children;
    }

    const root = mount(
      <ClassBoundaryX>
        <Comp>
          <Throw />
        </Comp>
      </ClassBoundaryX>,
    );
    expectHtmlFull(root).toBe(ERR_HTML_ON_MOUNT);

    await expectDidCatchX(root);
  });

  it('getDerivedStateFromError derives state', async () => {
    type State = { errorName: string | null };
    class ErrBoundary extends Component<{ children: JSX.Element }> {
      state: State = { errorName: null };

      static getDerivedStateFromError(error: unknown): State {
        return {
          errorName: error instanceof ReactError ? error.name : 'unknown',
        };
      }

      render() {
        return this.state.errorName ? (
          <code>{this.state.errorName}</code>
        ) : (
          this.props.children
        );
      }
    }

    const root = mount(
      <ErrBoundary>
        <Throw />
      </ErrBoundary>,
    );
    await waitFor(() => {
      expectHtmlFull(root).toBe(`<code>ReactError</code>`);
    });
  });
});
