import type { FiberNode } from 'faiwer-react/types';
import type { SetPropsAction } from 'faiwer-react/types/actions';

/**
 * Updates the set of props for:
 * - a component fiber
 * - or a context fragment fiber
 */
export function setPropsAction(fiber: FiberNode, { props }: SetPropsAction) {
  if (fiber.type !== 'component' && fiber.role !== 'context') {
    throw new Error(
      `setProps action is only applicable to component and context fiber nodes`,
    );
  }
  fiber.props = props;
}
