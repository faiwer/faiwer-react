import { getAppByFiber } from 'faiwer-react/core/reconcile/app';
import {
  type FiberNode,
  type ReactContext,
  type UseContextItem,
  type ContextFiberNode,
  type ReactContextConsumer,
} from '../types';
import { getNextHookOrCreate } from './helpers';

/**
 * Creates a React context object that can be used to pass data through the
 * component tree without having to pass props down manually at every level.
 *
 * @example
 * // Create a theme context
 * const ThemeContext = createContext('light');
 *
 * // Use in a component tree
 * const App = () => (
 *   <ThemeContext.Provider value="dark">
 *     <UserInterface />
 *   </ThemeContext.Provider>
 * );
 *
 * const UserInterface = () => {
 *   const theme = useContext(ThemeContext); // 'dark'
 *   return <div className={theme}>Content</div>;
 * };
 */
export const createContext = <T>(
  /** The default value that will be used when a component consumes the context
   * but is not wrapped by a Provider */
  defaultValue: T,
): ReactContext<T> => {
  const id = ++idx; // Unique ID.
  const ctx: ReactContext<T> = {
    __id: id,
    __default: defaultValue,
    // @ts-ignore the real type is very different. But it's React way of typing.
    Provider: { __ctx: null as unknown as ReactContext<T> },
    Consumer: null as unknown as ReactContextConsumer<T>,
  };
  ctx.Provider.__ctx = ctx;
  ctx.Consumer = function ContextConsumer({ children }) {
    return children(useContext(ctx));
  };

  return ctx;
};

/**
 * A hook that allows you to consume context values from the nearest Provider up
 * the component tree. The component will re-render when the context value
 * changes. If context provider is not found the default context value is used.
 *
 * @example
 * const ThemeContext = createContext('light');
 *
 * const ThemedButton = () => {
 *   const theme = useContext(ThemeContext);
 *   return <button className={`btn-${theme}`}>Click me</button>
 * };
 */
export const useContext = <T>(
  /** The context object created by createContext. */
  ctx: ReactContext<T>,
): T => {
  const item = getNextHookOrCreate<UseContextItem<T>>('context', (fiber) => {
    const providerFiber = findProvider(fiber, ctx.__id);
    if (providerFiber) {
      // We can assume that the found provider never changes. Because when it
      // changes all its children die (including this component).
      providerFiber.data.consumers.add(fiber);
    }

    return {
      type: 'context',
      ctx,
      providerFiber,
      destructor: () => {
        providerFiber?.data.consumers.delete(fiber);
      },
    };
  });

  if (item.providerFiber) {
    const { tempContext } = getAppByFiber(item.providerFiber);
    const { id } = item.providerFiber;
    if (tempContext.has(id)) {
      // When we're here it means the provider's value was invalidated during
      // the active render.
      return tempContext.get(id) as T;
    }

    // Provider is given, its value wasn't updated in this cycle.
    return item.providerFiber.props.value as T;
  }

  // Provider has not found. Use the default value.
  return ctx.__default;
};

/**
 * Traverse through the given fiber's parent nodes and search for the propver
 * <cxt.Provider/>. Returns `null` if it is not found.
 */
const findProvider = (
  fiber: FiberNode,
  id: number,
): ContextFiberNode | null => {
  while (fiber.role !== 'context' || fiber.data.ctx.__id !== id) {
    fiber = fiber.parent;
    if (!fiber.parent) {
      return null;
    }
  }

  return fiber;
};

let idx = 0;
