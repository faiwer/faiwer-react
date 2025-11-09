import type { Component } from './core/classComponent';
import type { FRAGMENT_TAG } from './core/reconciliation/fibers';
import {
  type JsxElement,
  type TagProps,
  type SvgTagProps,
  type SvgRootProps,
  type ReactKey,
  type ElementType as ET,
} from './types';

export {};

declare global {
  namespace JSX {
    type Element = JsxElement;
    type ElementType = ET;

    interface ElementClass extends Component<any, any> {
      render: () => JSX.Element;
    }

    interface IntrinsicAttributes {
      key?: ReactKey | null;
    }

    // Determines the `children` props name.
    // <div>… here …</div> (but not <div children={…}/>).
    interface ElementChildrenAttribute {
      children: {};
    }

    // To auto-detect props for class-based components via:
    // class User { props: T /* <- this */ }
    interface ElementAttributesProperty {
      props: {};
    }

    type LibraryManagedAttributes<Component, Props> = Component extends {
      defaultProps: infer Defaults;
    }
      ? Defaults extends Partial<Props>
        ? Partial<Pick<Props, keyof Defaults & keyof Props>> &
            Pick<Props, Exclude<keyof Props, keyof Defaults>>
        : Props
      : Props;

    interface IntrinsicElements {
      ['x-fragment']: IntrinsicAttributes & { children: JSX.Element };

      // Document structure
      html: TagProps<HTMLHtmlElement>;
      head: TagProps<HTMLHeadElement>;
      body: TagProps<HTMLBodyElement>;
      title: TagProps<HTMLTitleElement>;
      meta: TagProps<HTMLMetaElement>;
      link: TagProps<HTMLLinkElement>;
      script: TagProps<HTMLScriptElement>;
      style: TagProps<HTMLStyleElement>;

      // Content sectioning
      h1: TagProps<HTMLHeadingElement>;
      h2: TagProps<HTMLHeadingElement>;
      h3: TagProps<HTMLHeadingElement>;
      h4: TagProps<HTMLHeadingElement>;
      h5: TagProps<HTMLHeadingElement>;
      h6: TagProps<HTMLHeadingElement>;

      // Text content
      div: TagProps<HTMLDivElement>;
      p: TagProps<HTMLParagraphElement>;
      span: TagProps<HTMLSpanElement>;
      pre: TagProps<HTMLPreElement>;
      blockquote: TagProps<HTMLQuoteElement>;
      ul: TagProps<HTMLUListElement>;
      ol: TagProps<HTMLOListElement>;
      li: TagProps<HTMLLIElement>;
      dl: TagProps<HTMLDListElement>;
      dt: TagProps<HTMLElement>;
      dd: TagProps<HTMLElement>;
      hr: TagProps<HTMLHRElement>;
      br: TagProps<HTMLBRElement>;
      em: TagProps<HTMLElement>;
      i: TagProps<HTMLElement>;

      // Inline text semantics
      a: TagProps<HTMLAnchorElement>;
      q: TagProps<HTMLQuoteElement>;
      time: TagProps<HTMLTimeElement>;

      // Image and multimedia
      img: TagProps<HTMLImageElement>;
      video: TagProps<HTMLVideoElement>;
      audio: TagProps<HTMLAudioElement>;
      source: TagProps<HTMLSourceElement>;
      track: TagProps<HTMLTrackElement>;
      canvas: TagProps<HTMLCanvasElement>;

      // Embedded content
      iframe: TagProps<HTMLIFrameElement>;
      embed: TagProps<HTMLEmbedElement>;
      object: TagProps<HTMLObjectElement>;
      param: TagProps<HTMLParamElement>;

      // Forms
      form: TagProps<HTMLFormElement>;
      input: TagProps<HTMLInputElement>;
      button: TagProps<HTMLButtonElement>;
      select: TagProps<HTMLSelectElement>;
      option: TagProps<HTMLOptionElement>;
      optgroup: TagProps<HTMLOptGroupElement>;
      textarea: TagProps<HTMLTextAreaElement>;
      label: TagProps<HTMLLabelElement>;
      fieldset: TagProps<HTMLFieldSetElement>;
      legend: TagProps<HTMLLegendElement>;
      datalist: TagProps<HTMLDataListElement>;
      output: TagProps<HTMLOutputElement>;
      progress: TagProps<HTMLProgressElement>;
      meter: TagProps<HTMLMeterElement>;

      // Interactive elements
      details: TagProps<HTMLDetailsElement>;
      summary: TagProps<HTMLElement>;
      dialog: TagProps<HTMLDialogElement>;

      // Tables
      table: TagProps<HTMLTableElement>;
      thead: TagProps<HTMLTableSectionElement>;
      tbody: TagProps<HTMLTableSectionElement>;
      tfoot: TagProps<HTMLTableSectionElement>;
      tr: TagProps<HTMLTableRowElement>;
      td: TagProps<HTMLTableCellElement>;
      th: TagProps<HTMLTableCellElement>;
      caption: TagProps<HTMLTableCaptionElement>;
      colgroup: TagProps<HTMLTableColElement>;
      col: TagProps<HTMLTableColElement>;

      // SVG elements
      svg: SvgRootProps;
      circle: SvgTagProps;
      ellipse: SvgTagProps;
      line: SvgTagProps;
      path: SvgTagProps;
      polygon: SvgTagProps;
      polyline: SvgTagProps;
      rect: SvgTagProps;
      g: SvgTagProps;
      defs: SvgTagProps;
      clipPath: SvgTagProps;
      mask: SvgTagProps;
      pattern: SvgTagProps;
      image: SvgTagProps;
      text: SvgTagProps;
      tspan: SvgTagProps;
      use: SvgTagProps;
    }
  }
}
