import { createRoot, useState, type StateSetter } from '~/index';

export const mount = (element: JSX.Element): HTMLElement => {
  const rootDomNode = document.createElement('root');
  createRoot(rootDomNode, { testMode: true }).render(element);
  return rootDomNode;
};

export const expectHtml = (node: HTMLElement) =>
  expect(stripComments(node.innerHTML));

/**
 * Prepares for the given node's a special HTML-string. IDs in !--comments are
 * incremental. So they are pretty random for each given test. This method
 * prepares such a string that assumes these IDs start from 1.
 */
export const expectHtmlFull = (node: HTMLElement) => {
  const match = node.innerHTML.matchAll(/!--r:\w+:(\d+)--/g);
  const idsSet = new Set([...match].map((m) => Number(m[1])));
  const map = new Map(
    [...idsSet].sort((a, b) => a - b).map((v, i) => [String(v), i + 1]),
  );
  const fixedHtml = node.innerHTML.replace(
    /!--r:(\w+):(\d+)--/g,
    (_, mode, idx) => `!--r:${mode}:${map.get(idx)}--`,
  );
  return expect(fixedHtml);
};

export const stripComments = (html: string): string =>
  html.replace(/<!--.*?-->/g, '');

export const wait = (delayMs = 0): Promise<void> =>
  new Promise<void>((resolve) => setTimeout(resolve, delayMs));

export const waitFor = async (
  fn: () => Promise<void> | void,
): Promise<void> => {
  for (let i = 0; i < 10; ++i) {
    try {
      await fn();
      return;
    } catch {
      await wait(1);
    }
  }

  fn();
};

export const useRerender = () => {
  const [, setState] = useState<object>({});
  return () => setState({});
};

type UseStateX<T> = {
  use: (init: T | (() => T)) => T;
  useState: (init: T | (() => T)) => [value: T, setter: StateSetter<T>];
  set: StateSetter<T>;
};

export const useStateX = <T>(): UseStateX<T> => {
  const result: UseStateX<T> = {
    useState: function useStateX(init: T | (() => T)) {
      const [state, setState] = useState(init);
      result.set = setState;
      return [state, setState];
    },
    use: (init: T | (() => T)) => result.useState(init)[0],
    set: () => { throw `setter is still empty`; }, // prettier-ignore
  };
  return result;
};

export const itRenders = (name: string, element: JSX.Element, html: string) =>
  it(name, () => {
    const root = mount(element);
    expectHtml(root).toBe(html);
  });
