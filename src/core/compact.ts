import {
  containerSym,
  type Container,
  type DomNode,
  type FiberNode,
} from '../types';
import {
  getFiberDomNodes,
  getFirstContainerElement,
  getLastContainerElement,
} from './actions/helpers';
import { buildComment, buildCommentText } from './reconciliation/comments';
import { ReactError } from './reconciliation/errors/ReactError';

/**
 * Returns true if domNode is <!--r:begin:ID--> where ID is fiber.id
 */
export const isBeginOf = (
  domNode: Node | FiberNode['element'],
  fiberId: number,
): domNode is Comment =>
  domNode instanceof Comment &&
  domNode.textContent === buildCommentText('begin', fiberId);

// !--TODO: tsDoc
export const isEndComment = (
  domNode: Node | FiberNode['element'],
): domNode is Comment =>
  domNode instanceof Comment && domNode.textContent.startsWith(`r:end`);

export const getCommentId = (comment: Comment): number =>
  Number(comment.textContent.split(':', 3)[2]);

/**
 * Returns true if domNode is <!--r:end:ID--> where ID is fiber.id
 */
export const isEndOf = (
  domNode: Node | FiberNode['element'],
  fiberId: number,
): domNode is Comment =>
  domNode instanceof Comment &&
  domNode.textContent === buildCommentText('end', fiberId);

/**
 * Returns true if domNode is <!--r:empty:ID--> where ID is fiber.id
 */
const isEmptyOf = (
  domNode: Node | FiberNode['element'],
  fiber: FiberNode,
): domNode is Comment =>
  domNode instanceof Comment &&
  domNode.textContent === buildCommentText('empty', fiber.id);

// !--TODO: tsDoc.
export const isContainer = (
  fiber: FiberNode,
): fiber is FiberNode & { element: Container } =>
  fiber.element === containerSym;

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
  fiber.element !== containerSym &&
  (fiber.type === 'fragment' || fiber.type === 'component') &&
  !isEndOf(fiber.element!, fiber.id) &&
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
  if (!isEndOf(fiber.element!, fiber.id)) {
    return; // Node is not a !--container or is already compact.
  }

  // By default each fragment or component is rendered with 3+ nodes:
  // <!--r:begin:id--> + …children + <!--r:end:id-->
  // This approach supports 0 or 2+ nodes without overly complex logic.
  // However, most cases have only one child or none. For these scenarios,
  // we support two different compact modes.

  const prev1 = fiber.element!.previousSibling;
  // Scenario 1: 0 children.
  if (prev1 && isBeginOf(prev1, fiber.id)) {
    const emptyNode = buildComment('empty', fiber.id);
    prev1.parentElement!.insertBefore(emptyNode, prev1);
    prev1.remove(); // !--begin
    fiber.element!.remove(); // !--end
    fiber.element = emptyNode;
    return;
    // <!--begin--><--end--> are replaced with <!--empty-->
  }

  const prev2 = prev1?.previousSibling;
  // Scenario 2: 1 child
  if (prev2 && isBeginOf(prev2, fiber.id)) {
    prev2.remove(); // !--begin
    fiber.element!.remove(); // !--end
    fiber.element = fiber.children[0].element;
    // <!--begin--><!--end--> are removed. Now `fiber.element` refers to its
    // only child node.
    tryToCompactNode(fiber.parent);
    return;
  }

  // Scenario 3: 1 child, but it's <!--begin|end-->
  if (fiber.children.length === 1) {
    const [child] = fiber.children;
    if (child.type === 'fragment' || child.type === 'component') {
      getFiberDomNodes(fiber)[0].remove(); // !--begin
      fiber.element.remove(); // !--end
      fiber.element = child.element;
      // <!--begin--><!--end--> are removed. Now `fiber.element` refers to the
      // <!--end--> node of its only child node
      tryToCompactNode(fiber.parent);
    }
    return;
  }

  // Scenario 4: More than 1 children. Use the "container" wrapper.
  const first = getFirstContainerElement(fiber);
  const last = getLastContainerElement(fiber);
  first.previousSibling!.remove(); // remove !--begin
  last.nextSibling!.remove(); // remove !--end
  fiber.element = containerSym;
  // !<--begin--><!--end--> are removed. Now `fiber.element` is a `containerSym`.
  tryToCompactNode(fiber.parent);
}

/**
 * Converts <!--empty--> or the single compact container node into:
 * <!--begin-->...children...<!--end-->
 */
export const unwrapCompactFiber = (fiber: FiberNode): void => {
  if (fiber.element === containerSym) {
    let begin = buildComment('begin', fiber.id);
    let end = buildComment('end', fiber.id);

    const first = getFirstContainerElement(fiber);
    const last = getLastContainerElement(fiber);

    const container = first.parentElement!;
    container.insertBefore(begin, first);
    container.insertBefore(end, last.nextSibling);
    fiber.element = end;

    // No need to update parent nodes, because they couldn't be in a
    // single-child mode. Thus they are also `containerSym` or normal tags. We
    // shouldn't touch tags, and we don't have a reason to replace
    // `containerSym` with the newly added !--end, because these !--brackets
    // won't outlive this render anyway.
    return;
  }

  const container = fiber.element!.parentElement!;
  let begin = buildComment('begin', fiber.id);
  let end = buildComment('end', fiber.id);

  if (isCompactSingleChild(fiber)) {
    // before: <container><child/></container>
    // after:  <container><!--begin--><child/><!--end--></container>
    const [child] = fiber.children;
    const childNodes = getFiberDomNodes(child);
    container.insertBefore(begin, childNodes[0]!);
    container.insertBefore(end, childNodes.at(-1)!.nextSibling);
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

  throw new ReactError(fiber, `Unsupported format of compact node`);
};
