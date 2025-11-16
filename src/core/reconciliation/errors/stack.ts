import type { FiberNode, TagFiberNode } from 'faiwer-react/types';

/**
 * Returns a list of labels of all parents of the given fiber node.
 * @example
 * ['<div.test/>', '<Label/>', '<App/>']
 */
export const captureStack = (fiber: FiberNode): string[] => {
  const result: string[] = [];

  while (fiber.parent.tag !== 'root') {
    result.push(getFiberLabel(fiber.parent));
    fiber = fiber.parent;
  }

  return result;
};

export const getFiberLabel = (fiber: FiberNode): string => {
  switch (fiber.type) {
    // <User/>
    case 'component':
      return '<' + fiber.component.name + '/>';
    // <div#root.user/>
    // portal(<div#portal/>)
    case 'tag':
      return fiber.role === 'portal'
        ? `portal(<${fiber.element?.tagName.toLowerCase()}${tagAttrs(fiber.element)}/>`
        : `<${fiber.tag}${tagAttrs(fiber)}/>`;
    // #hello world
    case 'text':
      return `#${shorten(fiber.props.text, 50)}`;
    // </>
    // <Fragment key="group"/>
    case 'fragment':
      return fiber.key ? `<Fragment key="${fiber.key}"/>` : '</>';
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

  if (!!src && 'key' in src) {
    list.push(` key="${src.key}"`);
  }

  return (props.id || props.className ? '' : ' ') + list.join(' ');
};

const shorten = (src: string, maxLen = 15) =>
  src.length > maxLen ? src.slice(0, maxLen) + `…` : src;
