import { type DomNode, type FiberNode } from '../types';
import { buildComment, buildCommentText } from './reconciliation/comments';

/**
 * Returns true if domNode is <!--r:begin:ID--> where ID is fiber.id
 */
export const isBeginOf = (
  domNode: ChildNode,
  fiber: FiberNode,
): domNode is Comment =>
  domNode instanceof Comment &&
  domNode.textContent === buildCommentText('begin', fiber.id);

/**
 * Returns true if domNode is <!--r:end:ID--> where ID is fiber.id
 */
const isEndOf = (domNode: ChildNode, fiber: FiberNode): domNode is Comment =>
  domNode instanceof Comment &&
  domNode.textContent === buildCommentText('end', fiber.id);

/**
 * Returns true if domNode is <!--r:empty:ID--> where ID is fiber.id
 */
const isEmptyOf = (domNode: ChildNode, fiber: FiberNode): domNode is Comment =>
  domNode instanceof Comment &&
  domNode.textContent === buildCommentText('empty', fiber.id);

/**
 * Returns true if the given `fiber` is in solo compact mode. This means it
 * doesn't have its own direct DOM element. Instead, its `element` refers to its
 * only child's `element`, avoiding the need for <!--brackets-->.
 */
export const isCompactSingleChild = (
  fiber: FiberNode,
): fiber is FiberNode & {
  element: DomNode;
} =>
  (fiber.type === 'fragment' || fiber.type === 'component') &&
  !isEndOf(fiber.element!, fiber) &&
  !isEmptyOf(fiber.element!, fiber);

/**
 * Returns true if the given `fiber` is in none compact mode. This means it
 * has no fiber children, and its element is <!--r:empty:id-->
 */
export const isCompactNone = (
  fiber: FiberNode,
): fiber is FiberNode & {
  element: DomNode;
} =>
  (fiber.type === 'fragment' || fiber.type === 'component') &&
  isEmptyOf(fiber.element!, fiber);

/**
 * If the given fiber node has <!--brackets-->, this function tries to apply one
 * of the "compact" optimizations:
 *
 * - If the node has no children, it replaces the brackets with
 *   <!--r:empty:id-->
 * - If the node has only one child, it removes the brackets and sets
 *   `fiber.element` to reference its only direct DOM child
 *
 * It also tries to recursively compact parent nodes when possible.
 */
export function tryToCompactNode(fiber: FiberNode): void {
  if (!isEndOf(fiber.element!, fiber)) {
    return; // Node is not a !--container or is already compact.
  }

  // By default each fragment or component is rendered with 3+ nodes:
  // <!--r:begin:id--> + …children + <!--r:end:id-->
  // This approach supports 0 or 2+ nodes without overly complex logic.
  // However, most cases have only one child or none. For these scenarios,
  // we support two different compact modes.

  const prev1 = fiber.element!.previousSibling;
  // Scenario 1: 0 children.
  if (prev1 && isBeginOf(prev1, fiber)) {
    const emptyNode = buildComment('empty', fiber.id);
    prev1.parentElement!.insertBefore(emptyNode, prev1);
    prev1.remove(); // !--begin
    fiber.element!.remove(); // !--end
    fiber.element = emptyNode;
    return;
    // <!--begin--><--end--> are replaced with <!--empty-->
  }

  const prev2 = prev1?.previousSibling;
  // Scenario 2: 1 children
  if (prev2 && isBeginOf(prev2, fiber)) {
    prev2.remove(); // !--begin
    fiber.element!.remove(); // !--end
    fiber.element = fiber.children[0].element;
    // <!--begin--><!--end--> are removed. Now `fiber.element` refers to its
    // only child node.
    tryToCompactNode(fiber.parent);
  }
}

/**
 * Converts <!--empty--> or the single compact container node into:
 * <!--begin-->...children...<!--end-->
 */
export const unwrapCompactFiber = (fiber: FiberNode): void => {
  const container = fiber.element!.parentElement!;
  let begin = buildComment('begin', fiber.id);
  let end = buildComment('end', fiber.id);

  if (isCompactSingleChild(fiber)) {
    // before: <container><child/></container>
    // after:  <container><!--begin--><child/><!--end--></container>
    container.insertBefore(begin, fiber.element!);
    container.insertBefore(end, fiber.element!.nextSibling);
    fiber.element = end;

    // Repeat the same with every single-compact ancestor:
    let parent = fiber.parent;
    while (isCompactSingleChild(parent)) {
      const pBegin = buildComment('begin', parent.id);
      const pEnd = buildComment('end', parent.id);
      container.insertBefore(pBegin, begin);
      container.insertBefore(pEnd, end.nextSibling);
      parent.element = pEnd;

      begin = pBegin;
      end = pEnd;
      parent = parent.parent;
    }
    return;
  }

  if (isCompactNone(fiber)) {
    // before: <container><!--empty--></container>
    // after:  <container><!--begin--><!--end--></container>
    container.insertBefore(begin, fiber.element!);
    container.insertBefore(end, fiber.element!.nextSibling);
    fiber.element.remove();
    fiber.element = end;
    return;
  }

  throw new Error(`Unsupported format of compact node`);
};
