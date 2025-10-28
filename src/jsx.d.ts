import { ElementNode, type ScalarNode } from './types';

export {};

declare global {
  namespace JSX {
    type Element =
      // <div/> & <Component/>. Also it's the output type of `createElement`.
      | ElementNode
      // null, undefined, boolean, string, number
      | ScalarNode
      // <Fragment/> & []-fragment
      | Element[];

    interface IntrinsicElements {}
  }
}
