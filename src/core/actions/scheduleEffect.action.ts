import { type FiberNode } from 'faiwer-react/types';
import type { ScheduleEffectAction } from 'faiwer-react/types/actions';
import { scheduleEffect } from '../reconciliation/effects';
import { getAppByFiber } from '../reconciliation/app';

/**
 * Adds the given effect to the appropriate effect queue.
 */
export function scheduleEffectAction(
  fiber: FiberNode,
  { fn, mode }: Pick<ScheduleEffectAction, 'fn' | 'mode'>,
) {
  scheduleEffect(getAppByFiber(fiber), fn, mode);
}
