import type { FiberNode, TagFiberNode } from 'faiwer-react/types';
import { getAppByFiber } from '../app';
import { isFiberDead } from '../fibers';

/**
 * Returns a list of labels of all parents of the given fiber node.
 * @example
 * ['<div.test/>', '<Label/>', '<App/>']
 */
export const captureStack = (fiber: FiberNode, skipRoot = true): string[] => {
  const result: string[] = skipRoot ? [] : [getFiberLabel(fiber)];

  while (fiber.parent && fiber.parent.tag !== 'root') {
    result.push(getFiberLabel(fiber.parent));
    fiber = fiber.parent;
  }

  return result;
};

export const getFiberLabel = (fiber: FiberNode): string => {
  if (isFiberDead(fiber)) {
    return `DEAD Fiber`;
  }

  switch (fiber.type) {
    // <User/>
    case 'component':
      return (
        '<' +
        (fiber.component.displayName || fiber.component.name) +
        '/>' +
        source(fiber)
      );
    // <div#root.user/>
    // portal(<div#portal/>)
    case 'tag':
      return fiber.role === 'portal'
        ? `portal(<${fiber.data?.tagName.toLowerCase()}${tagAttrs(fiber.data)}/>`
        : `<${fiber.tag}${tagAttrs(fiber)}/>${source(fiber)}`;
    // #hello world
    case 'text':
      return `#${shorten(fiber.props.text, 50)}`;
    // </>
    // <Fragment key="group"/>
    case 'fragment':
      return fiber.role === 'context'
        ? `context(` +
            (fiber.data.ctx.displayName || 'unnamed') +
            ')' +
            source(fiber)
        : (fiber.key ? `<Fragment key="${fiber.key}"/>` : '</>') +
            source(fiber);
    case 'null':
      return 'null';
  }
};

const tagAttrs = (src: HTMLElement | TagFiberNode | null): string => {
  const list: string[] = [];
  const props = src === null ? {} : src instanceof Element ? src : src.props;

  if (props.id) {
    list.push(`#${props.id}`);
  }

  if (props.className) {
    list.push(
      '.' +
        String(props.className)
          .split(/\s+/)
          .slice(0, 3)
          .map((l) => shorten(l, 30))
          .join('.'),
    );
  }

  if (!!src && 'key' in src && !!src.key) {
    list.push(`key="${src.key}"`);
  }

  return (props.id || props.className ? '' : ' ') + list.join(' ');
};

const shorten = (src: string, maxLen = 15) =>
  src.length > maxLen ? src.slice(0, maxLen) + `…` : src;

const source = (fiber: FiberNode): string => {
  const { source } = fiber;
  if (!source) return '';

  const { transformSource } = getAppByFiber(fiber);
  let { columnNumber, fileName, lineNumber } = transformSource
    ? transformSource(source)
    : source;
  return ` at ${fileName}:${lineNumber}:${columnNumber}`;
};
