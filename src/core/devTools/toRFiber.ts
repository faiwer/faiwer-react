import type { FiberNode } from 'faiwer-react/types';
import { isRootFiber } from '../reconciliation/fibers';
import { getAppByFiber } from '../reconciliation/app';
import { propsToRProps, ReactPortalDummy } from './toRJsx';
import {
  RCtxProviderSym,
  RFiberTag,
  type RElementType,
  type RFiber,
  type RFiberProps,
  type RStateNode,
} from './types';

/**
 * Converts FiberNode into RFiber. It's using cache internally.
 */
export const fiberToRFiber = (fiber: FiberNode, index: number): RFiber => {
  const isRoot = isRootFiber(fiber);
  const elementType: RElementType = getElementType(fiber, isRoot);
  const props = getProps(fiber, isRoot);

  const result: RFiber = {
    id: fiber.id,
    index,
    tag: getFiberTag(fiber, isRoot),
    key: fiber.key !== null ? String(fiber.key) : null,
    elementType,
    type: elementType,
    stateNode: getStateNode(fiber, isRoot),
    pendingProps: props,
    memoizedProps: props,
    ref: fiber.ref,
    memoizedState: null, // For root it's not empty, but it `null` works too.
    // Tree links
    return: null,
    child: null,
    sibling: null,
    alternate: null,
  };

  if (isRoot) {
    result.alternate = result;
  }

  Object.defineProperty(result, 'child', {
    get: () => {
      const [child] = fiber.children;
      return child ? fiberToRFiber(fiber.children[0], 0) : null;
    },
  });

  Object.defineProperty(result, 'sibling', {
    get: () => {
      const { parent } = fiber;
      const sibling = parent
        ? (parent.children[result.index + 1] ?? null)
        : null;
      return sibling ? fiberToRFiber(sibling, result.index + 1) : null;
    },
  });

  return result;
};

// React doesn't support null-nodes. The simplest bypass would be to map it to
// a fake text-node.
const nullDummyText = new Text('react-null-dummy');

const getFiberTag = (fiber: FiberNode, isRoot: boolean): RFiberTag => {
  if (isRoot) return RFiberTag.Root;
  switch (fiber.type) {
    case 'component':
      return RFiberTag.Component;
    case 'tag':
      return fiber.role === 'portal' ? RFiberTag.Component : RFiberTag.Tag;
    case 'text':
    case 'null':
      return RFiberTag.Text;
    case 'fragment':
      return fiber.role === 'context'
        ? RFiberTag.CtxProvider
        : RFiberTag.Fragment;
  }
};

const getElementType = (fiber: FiberNode, isRoot: boolean): RElementType => {
  if (isRoot) return null;
  switch (fiber.type) {
    case 'component':
      return fiber.component;
    case 'tag':
      return fiber.role === 'portal' ? ReactPortalDummy : fiber.tag;
    case 'text':
    case 'null':
      return null;
    case 'fragment':
      return fiber.role === 'context'
        ? {
            $$typeof: RCtxProviderSym,
            _context: fiber.data.ctx,
          }
        : null;
  }
};

const getStateNode = (fiber: FiberNode, isRoot: boolean): RStateNode => {
  if (isRoot) {
    return getAppByFiber(fiber).devTools!.root;
  }

  switch (fiber.type) {
    case 'tag':
      return fiber.role === 'portal' ? null : fiber.element!;
    case 'text':
      return fiber.element!;
    case 'component':
      return null;
    case 'fragment':
      return null;
    case 'null':
      return nullDummyText;
  }
};

const getProps = (fiber: FiberNode, isRoot: boolean): RFiberProps => {
  if (isRoot) return null;

  switch (fiber.type) {
    case 'component':
      return propsToRProps(fiber.props);
    case 'tag':
      return fiber.role === 'portal'
        ? { target: fiber.data }
        : propsToRProps({ children: fiber.children });
    case 'text':
      return fiber.props.text;
    case 'fragment':
      return fiber.role === 'context'
        ? propsToRProps({
            value: fiber.props.value,
            children: fiber.children,
          })
        : [];
    case 'null':
      return nullDummyText.textContent;
  }
};
