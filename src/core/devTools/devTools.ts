import type { App } from 'faiwer-react/types';
import type { RDevToolsHook, RRenderer } from './types';

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
