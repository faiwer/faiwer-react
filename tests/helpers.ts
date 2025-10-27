import { mount as reactMount } from '~/core/reconcile';
import { type ReactNode } from '~/index';

export const mount = (node: ReactNode): HTMLElement => {
  const root = document.createElement('root');
  reactMount(root, node, { testMode: true });
  return root;
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
