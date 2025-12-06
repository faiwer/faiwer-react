import { act } from 'faiwer-react/testing';
import { expectHtmlFull, mount, useStateX } from '../helpers';
import {
  ERR_HTML_ON_RERENDER,
  ErrorBoundaryX,
  expectDidCatchX,
  Throw,
} from './fixtures';

describe('Errors: Hierarchy', () => {
  it('catches errors caused by an own wrapped child', async () => {
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

    await act(() => error.set(true));
    expectHtmlFull(root).toBe(ERR_HTML_ON_RERENDER);
    await expectDidCatchX(root);
  });

  it('catches errors caused by a new own wrapped child', async () => {
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
    expectHtmlFull(root).toBe(ERR_HTML_ON_RERENDER);
    await expectDidCatchX(root);
  });
});
