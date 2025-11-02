import { nullthrows } from '~/utils';
import {
  type HookStateItem,
  type ElementNode,
  type FiberNode,
  type ReactComponent,
  type HookStore,
  type App,
  type ComponentFiberNode,
  type UnknownProps,
} from '../types';
import { getAppByFiber } from './reconcile';

/** Component that is rendered right now. */
let currentFiber: ComponentFiberNode | null;

/**
 * Return the fiber of the component that is being rendered right now. Don't
 * run this function outside of the render phase.
 */
export const getCurrentComponentFiber = (): ComponentFiberNode =>
  nullthrows(currentFiber);

/**
 * The app of the component that is being rendered right now. Don't run this
 * function outside of the render phase.
 */
export const getCurrentApp = (): App =>
  nullthrows(getAppByFiber(getCurrentComponentFiber()));

let firstFiberRender = false;

/**
 * Returns true when it's the 1st render of currentFiber's component.
 */
export const isFirstFiberRender = (): boolean => firstFiberRender;

/**
 * It runs the functional component. Before running it prepares everything that
 * is required to make hooks work. The result is JSX returned from the component
 * function.
 */
export const runComponent = (
  fiber: FiberNode,
  /** Source of `.props`. If not given `fiber.props` are used. */
  propsSource: ElementNode | FiberNode | null,
): JSX.Element => {
  if (fiber.type !== 'component') {
    throw new Error(`Can't run ${fiber.type} as a component`);
  }

  currentFiber = fiber;
  firstFiberRender = !fiber.data.hooks;
  fiber.data.hooks ??= [];
  hookIdx = -1;

  let jsxElement: JSX.Element = isFiber(propsSource)
    ? fiber.component(propsSource.props as UnknownProps)
    : propsSource
      ? // 1st render, from the ElementNode:
        (propsSource.type as ReactComponent)(propsSource.props)
      : fiber.component!(fiber.props);

  currentFiber = null;
  firstFiberRender = false;

  return jsxElement;
};

const isFiber = (src: ElementNode | FiberNode | null): src is FiberNode => {
  const res: FiberNode | null = src ? ('id' in src ? src : null) : null;
  return res !== null;
};

let hookIdx = -1;

const getComponentHookStore = (fiberNode: ComponentFiberNode): HookStore => {
  if (!fiberNode.data.hooks) {
    throw new Error(`HookStore is empty.`);
  }

  return fiberNode.data.hooks;
};

/**
 * Switch to the next hook and returns its state.
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
