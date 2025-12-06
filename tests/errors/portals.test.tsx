import { createPortal } from 'faiwer-react';
import { expectHtmlFull, mount } from '../helpers';
import {
  ERR_HTML_ON_MOUNT,
  ERR_HTML_ON_RERENDER,
  ErrorBoundaryX,
  expectDidCatchX,
  genSwitch,
  Throw,
} from './fixtures';
import { act } from 'faiwer-react/testing';

describe('Errors: Portals', () => {
  it('errors are passed through a portal. mode=mount', async () => {
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

    expectHtmlFull(root).toBe(`before-1!${ERR_HTML_ON_MOUNT}!1-after`);
    expectHtmlFull(target).toBe('');
    await expectDidCatchX(root, `before-1!%!1-after`);
  });

  it('errors are passed through a portal. mode=rerender', async () => {
    const [Switch, error] = genSwitch();
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
    expectHtmlFull(root).toBe(`before-1!${ERR_HTML_ON_RERENDER}!1-after`);
    await expectDidCatchX(root, `before-1!%!1-after`);
  });
});
