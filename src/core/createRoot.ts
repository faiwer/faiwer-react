import type { AppOptions, AppRoot } from 'faiwer-react/types';
import { mount } from './reconcile/mount';

/**
 * Creates a new React app. The signature is the same as in React 18+.
 * @example
 * const { unmount } = createRoot(
 *   document.getElementById('root'),
 *   <App/>
 * );
 * // ...
 * unmount();
 */
export function createRoot(root: HTMLElement, options?: AppOptions): AppRoot {
  let created = false;
  let unmount: null | (() => void) = null;

  const api: AppRoot = {
    render: (element: JSX.Element): void => {
      if (created) {
        api.unmount();
      }

      unmount = mount(root, element, options ?? DEFAULT_OPTIONS);
      created = true;
    },
    unmount: () => {
      unmount?.();
      created = false;
    },
  };

  return api;
}

const DEFAULT_OPTIONS: AppOptions = {
  testMode: false,
};
