import { nullthrows } from '~/utils';
import {
  type HookStateItem,
  type FiberNode,
  type HookStore,
  type App,
  type ComponentFiberNode,
  type UnknownProps,
} from '../types';
import { getAppByFiber } from './reconciliation/app';
import { isFiberDead } from './reconciliation/fibers';
import {
  nullthrowsForFiber,
  ReactError,
} from './reconciliation/errors/ReactError';
import type { Action } from 'faiwer-react/types/actions';

/** Component that is rendered right now. */
let currentFiber: ComponentFiberNode | null;

/**
 * Returns the fiber of the component that is being rendered right now. Don't
 * run this function outside of the render phase.
 */
export const getCurrentComponentFiber = (): ComponentFiberNode =>
  nullthrows(currentFiber);

/**
 * The app of the component that is being rendered right now. Don't run this
 * function outside of the render phase.
 */
export const getCurrentApp = (): App => {
  const fiber = getCurrentComponentFiber();
  return nullthrowsForFiber(fiber, getAppByFiber(fiber));
};

let firstFiberRender = false;

/**
 * Returns true when it's the 1st render of currentFiber's component.
 */
export const isFirstFiberRender = (): boolean => firstFiberRender;

/**
 * Runs the functional component. Before running, it prepares everything that
 * is required to make hooks work. The result is JSX returned from the component
 * function & the list of actions that must be applied in the commit phase.
 */
export const runComponent = (
  fiber: FiberNode,
  /** Source of `.props`. If not given `fiber.props` are used. */
  props: UnknownProps | null,
): ReactError | [JSX.Element, Action[]] => {
  if (fiber.type !== 'component') {
    throw new ReactError(fiber, `Can't run ${fiber.type} as a component`);
  }
  if (isFiberDead(fiber)) {
    throw new ReactError(fiber, `Can't run a dead component`);
  }

  const app = getAppByFiber(fiber);
  app.preact?.invalidated.add(fiber.id);

  currentFiber = fiber;
  firstFiberRender = !fiber.data.hooks;
  fiber.data.hooks ??= [];
  hookIdx = -1;

  let jsxElement: JSX.Element;
  let actions: Action[] = [];
  try {
    const { remapped } = app.devTools;
    const component =
      // HMR, the freshest version
      remapped?.get(fiber.component) ??
      // Regular rendering
      fiber.component;
    jsxElement = component!(props ?? fiber.props);
    actions.push(...fiber.data.actions);
  } catch (error: unknown) {
    return new ReactError(
      fiber,
      error,
      `Error during rendering a component: %fiber%`,
    );
  } finally {
    fiber.data.actions = [];
  }

  if (!firstFiberRender && hookIdx !== fiber.data.hooks.length - 1) {
    throw new ReactError(
      fiber,
      `The hook order is violated. There were ${fiber.data.hooks.length} hooks in the previous render. Now only ${hookIdx + 1}`,
    );
  }

  currentFiber = null;
  firstFiberRender = false;

  return [jsxElement, actions];
};

let hookIdx = -1;

const getComponentHookStore = (fiberNode: ComponentFiberNode): HookStore => {
  if (!fiberNode.data.hooks) {
    throw new ReactError(fiberNode, `HookStore is empty.`);
  }

  return fiberNode.data.hooks;
};

/**
 * Switches to the next hook and returns its state.
 */
export const getNextFiberState = (): HookStateItem =>
  getComponentHookStore(getCurrentComponentFiber())[++hookIdx];

/**
 * Adds a new item to the current component's hook store
 */
export const registerStateItem = (item: {
  type: HookStateItem['type'];
}): void => {
  getComponentHookStore(getCurrentComponentFiber()).push(item as HookStateItem);
};
