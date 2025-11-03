import type { App, FiberNode } from 'faiwer-react/types';
import { nullthrows } from 'faiwer-react/utils';

const apps: Array<App | null> = [];

export const getAppByFiber = (fiber: FiberNode): App => {
  return nullthrows(apps[fiber.appId]);
};

export const registerApp = (fn: (id: number) => App): App => {
  apps.push(fn(apps.length));
  return apps.at(-1)!;
};

export const removeApp = (id: number): void => {
  const app = apps[id] as Record<string, unknown>;
  if (app) {
    apps[id] = null;
    // Help with garbage collection.
    app.root = app.tempContext = null;
    app.effects = { normal: [] };
    app.invalidatedComponents = { size: 0 };
  }
};
