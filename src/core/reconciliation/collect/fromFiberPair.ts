import type {
  App,
  ContextFiberNode,
  FiberNode,
  TagAttrValue,
  TagFiberNode,
  UnknownProps,
} from 'faiwer-react/types';
import type { Action, SetRefAction } from 'faiwer-react/types/actions';
import { areFiberPropsEq } from '../../helpers';
import { collectActionsFromChildrenPair } from './fromChildrenPair';
import { collectActionsFromComponent } from './fromComponent';

/**
 * `l` & `r` are the same node. But `r` may have some updates. This method
 * collects a list of actions that has to be applied to convert `l` to `r`.
 * It doesn't including removing or replacing the existing `l` node.
 */
export const collectActionsFromFiberPair = (
  app: App,
  l: FiberNode,
  r: FiberNode,
): Action[] => {
  const actions: Action[] = [];
  const eqProps = areFiberPropsEq(l, r);

  // Check if <context.Provider/>.value changed
  if (l.role === 'context') {
    const rr = r as ContextFiberNode;
    if (l.props.value !== rr.props.value) {
      invalidateContextValue(app, l, rr);
    }
  }

  if (l.type === 'tag' || l.type === 'fragment') {
    actions.push(...collectActionsFromChildrenPair(l, r.children));
  }

  if (
    eqProps &&
    // Component may have the same props, but changed internal state
    !app.invalidatedComponents.has(l)
  ) {
    return actions; // No updates needed.
  }

  // Everything below assume changes in props
  switch (r.type) {
    case 'text':
      actions.push({
        type: 'SetText',
        fiber: l,
        text: r.props.text, // It's the only TextFiberNode props
      });
      break;

    case 'tag':
      actions.push({
        type: 'SetProps', // just l.props = r.props
        fiber: l,
        props: r.props as UnknownProps,
      });
      actions.push(
        ...collectActionsFromTagAttrs(l as TagFiberNode, r as TagFiberNode),
      );
      break;

    case 'component':
      // One of the l-component props was updates -> run the component.
      app.invalidatedComponents.add(l);
      if (!eqProps) {
        actions.push({
          type: 'SetProps', // just l.props = r.props
          fiber: l,
          props: r.props,
        });
      }
      actions.push(
        ...collectActionsFromComponent(
          app,
          l,
          r, // use r's version of props to run the component
        ),
      );
      break;

    case 'fragment': {
      if (r.role === 'context') {
        actions.push({
          type: 'SetProps',
          fiber: l,
          props: r.props,
        });
        break;
      }

      throw new Error(`Unsupported fragment props format. Role: ${l.role}`);
    }

    default:
      throw new Error(`${l.type} is not supported in updateActions`);
  }

  return actions;
};

/**
 * Returns a list of actions needed to sync `r` & `l` tag attributes, refs, and
 * event handlers.
 */
const collectActionsFromTagAttrs = (
  l: TagFiberNode,
  r: TagFiberNode,
): Action[] => {
  const actions: Action[] = [];
  const lProps = l.props;
  const rProps = r.props;

  for (const [k, rv] of Object.entries(rProps)) {
    const lv = lProps[k];

    if (lv !== rv) {
      actions.push({
        type: 'SetAttr',
        fiber: l,
        name: k,
        value: rv as TagAttrValue,
      });
    }
  }

  for (const k of Object.keys(lProps)) {
    if (!(k in rProps)) {
      actions.push({
        type: 'SetAttr',
        fiber: l,
        name: k,
        value: undefined,
      });
    }
  }

  if (l.ref !== r.ref) {
    actions.push({
      type: 'SetRef',
      fiber: l,
      ref: r.ref as SetRefAction['ref'],
    });
  }

  return actions;
};

/**
 * The given context provider got an update for its `value` props. We have to
 * traverse through all of its context-consumers and invalidate them.
 */
const invalidateContextValue = (
  app: App,
  l: ContextFiberNode,
  r: ContextFiberNode,
) => {
  // When we render child components we can't reach `r.fiber.props`. Whereas
  // `l.fiber.props` are obsolete until we call `SetProps` later in
  // `applyActions`. Thus, save it in a temporary storage.
  app.tempContext.set(l.id, r.props.value);
  // Since we can't guarantee that all provider-consumers will be invalidated
  // naturally, we must invalidate them manually:
  for (const childCompFiber of l.data.consumers) {
    app.invalidatedComponents.add(childCompFiber);
  }
};
