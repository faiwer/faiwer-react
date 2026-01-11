import type { App } from 'faiwer-react/types';
import type { RDevToolsHook, RRenderer } from './types';
import { fiberToRFiber } from './toRFiber';

export const createAppDevTools = (): App['devTools'] | null => {
  const hooks = (window as { __REACT_DEVTOOLS_GLOBAL_HOOK__?: RDevToolsHook })
    .__REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (!hooks) return null;

  return {
    hooks,
    id: null,
    root: { current: null },
    renderer: createRRenderer(),
    remapped: null, // HMR Map<old comp, new comp>;
    onCommit,
  };
};

const REACT_VERSION = '18.3.1';

const createRRenderer = (): RRenderer => {
  return {
    version: REACT_VERSION,
    reconcilerVersion: REACT_VERSION,
    bundleType: 0 /* Prod */,
    rendererPackageName: 'react-dom',
    currentDispatcherRef: { current: null },
  };
};

const requestIdleCallback =
  globalThis.requestIdleCallback ??
  // for Jest test
  ((fn: () => void) => setTimeout(fn, 0));

const onCommit = (app: App): void => {
  const { devTools } = app;

  // `onCommitFiberRoot` is set not only by React DevTools, but also by the vite
  // HMR plugin.
  if (devTools?.hooks?.onCommitFiberRoot && !syncScheduled) {
    syncScheduled = true;
    devTools.root.current ??= fiberToRFiber(app.root, 0);

    // Since the sync process is quite slow — do it only on idle.
    requestIdleCallback(() => {
      syncScheduled = false;
      if (app.state === 'killed') return;

      devTools.hooks.onCommitFiberRoot!(
        devTools.id!,
        devTools.root,
        false,
        false,
      );
    });
  }
};

let syncScheduled = false;
