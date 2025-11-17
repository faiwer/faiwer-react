import type { Component } from './core/classComponent';
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

      // HTML Elements
      html: TagProps<HTMLHtmlElement>;
      head: TagProps<HTMLHeadElement>;
      body: TagProps<HTMLBodyElement>;
      title: TagProps<HTMLTitleElement>;
      meta: TagProps<HTMLMetaElement>;
      link: TagProps<HTMLLinkElement>;
      script: TagProps<HTMLScriptElement>;
      style: TagProps<HTMLStyleElement>;
      article: TagProps<HTMLElement>;
      h1: TagProps<HTMLHeadingElement>;
      h2: TagProps<HTMLHeadingElement>;
      h3: TagProps<HTMLHeadingElement>;
      h4: TagProps<HTMLHeadingElement>;
      h5: TagProps<HTMLHeadingElement>;
      h6: TagProps<HTMLHeadingElement>;
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
      b: TagProps<HTMLElement>;
      a: TagProps<HTMLAnchorElement>;
      q: TagProps<HTMLQuoteElement>;
      time: TagProps<HTMLTimeElement>;
      img: TagProps<HTMLImageElement>;
      video: TagProps<HTMLVideoElement>;
      audio: TagProps<HTMLAudioElement>;
      source: TagProps<HTMLSourceElement>;
      track: TagProps<HTMLTrackElement>;
      canvas: TagProps<HTMLCanvasElement>;
      iframe: TagProps<HTMLIFrameElement>;
      embed: TagProps<HTMLEmbedElement>;
      object: TagProps<HTMLObjectElement>;
      param: TagProps<HTMLParamElement>;
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
      details: TagProps<HTMLDetailsElement>;
      summary: TagProps<HTMLElement>;
      dialog: TagProps<HTMLDialogElement>;
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
      area: TagProps<HTMLAreaElement>;
      base: TagProps<HTMLBaseElement>;
      data: TagProps<HTMLDataElement>;
      menu: TagProps<HTMLMenuElement>;
      picture: TagProps<HTMLPictureElement>;
      slot: TagProps<HTMLSlotElement>;
      template: TagProps<HTMLTemplateElement>;
      font: TagProps<HTMLFontElement>;
      frame: TagProps<HTMLFrameElement>;
      marquee: TagProps<HTMLMarqueeElement>;
      map: TagProps<HTMLMapElement>;
      del: TagProps<HTMLModElement>;
      ins: TagProps<HTMLModElement>;
      dir: TagProps<HTMLDirectoryElement>;
      frameset: TagProps<HTMLFrameSetElement>;
      // No custom DOM constructor:
      abbr: TagProps<HTMLElement>;
      acronym: TagProps<HTMLElement>;
      address: TagProps<HTMLElement>;
      aside: TagProps<HTMLElement>;
      bdi: TagProps<HTMLElement>;
      bdo: TagProps<HTMLElement>;
      big: TagProps<HTMLElement>;
      center: TagProps<HTMLElement>;
      cite: TagProps<HTMLElement>;
      code: TagProps<HTMLElement>;
      dfn: TagProps<HTMLElement>;
      fencedframe: TagProps<HTMLElement>;
      figcaption: TagProps<HTMLElement>;
      figure: TagProps<HTMLElement>;
      footer: TagProps<HTMLElement>;
      header: TagProps<HTMLElement>;
      hgroup: TagProps<HTMLElement>;
      type: TagProps<HTMLElement>;
      kbd: TagProps<HTMLElement>;
      main: TagProps<HTMLElement>;
      mark: TagProps<HTMLElement>;
      nav: TagProps<HTMLElement>;
      nobr: TagProps<HTMLElement>;
      noembed: TagProps<HTMLElement>;
      noframes: TagProps<HTMLElement>;
      noscript: TagProps<HTMLElement>;
      plaintext: TagProps<HTMLElement>;
      portal: TagProps<HTMLElement>;
      rb: TagProps<HTMLElement>;
      rp: TagProps<HTMLElement>;
      rt: TagProps<HTMLElement>;
      rtc: TagProps<HTMLElement>;
      ruby: TagProps<HTMLElement>;
      s: TagProps<HTMLElement>;
      samp: TagProps<HTMLElement>;
      search: TagProps<HTMLElement>;
      section: TagProps<HTMLElement>;
      small: TagProps<HTMLElement>;
      strike: TagProps<HTMLElement>;
      strong: TagProps<HTMLElement>;
      sub: TagProps<HTMLElement>;
      sup: TagProps<HTMLElement>;
      tt: TagProps<HTMLElement>;
      u: TagProps<HTMLElement>;
      var: TagProps<HTMLElement>;
      wbr: TagProps<HTMLElement>;
      xmp: TagProps<HTMLElement>;

      // SVG elements
      svg: SvgRootProps;
      polygon: SvgTagProps<SVGPolygonElement>;
      circle: SvgTagProps<SVGCircleElement>;
      clipPath: SvgTagProps<SVGClipPathElement>;
      defs: SvgTagProps<SVGDefsElement>;
      ellipse: SvgTagProps<SVGEllipseElement>;
      g: SvgTagProps<SVGGElement>;
      line: SvgTagProps<SVGLineElement>;
      image: SvgTagProps<SVGImageElement>;
      mask: SvgTagProps<SVGMaskElement>;
      path: SvgTagProps<SVGPathElement>;
      pattern: SvgTagProps<SVGPatternElement>;
      polyline: SvgTagProps<SVGPolylineElement>;
      rect: SvgTagProps<SVGRectElement>;
      text: SvgTagProps<SVGTextElement>;
      use: SvgTagProps<SVGUseElement>;
      animate: SvgTagProps<SVGAnimateElement>;
      animateMotion: SvgTagProps<SVGAnimateMotionElement>;
      animateTransform: SvgTagProps<SVGAnimateTransformElement>;
      set: SvgTagProps<SVGSetElement>;
      desc: SvgTagProps<SVGDescElement>;
      filter: SvgTagProps<SVGFilterElement>;
      marker: SvgTagProps<SVGMarkerElement>;
      foreignObject: SvgTagProps<SVGForeignObjectElement>;
      linearGradient: SvgTagProps<SVGLinearGradientElement>;
      radialGradient: SvgTagProps<SVGRadialGradientElement>;
      gradient: SvgTagProps<SVGGradientElement>;
      metadata: SvgTagProps<SVGMetadataElement>;
      stop: SvgTagProps<SVGStopElement>;
      switch: SvgTagProps<SVGSwitchElement>;
      symbol: SvgTagProps<SVGSymbolElement>;
      textPath: SvgTagProps<SVGTextPathElement>;
      view: SvgTagProps<SVGViewElement>;
      tspan: SvgTagProps<SVGTextContentElement>;
      // No custom element
      feBlend: SvgTagProps;
      feColorMatrix: SvgTagProps;
      feComponentTransfer: SvgTagProps;
      feComposite: SvgTagProps;
      feConvolveMatrix: SvgTagProps;
      feDiffuseLighting: SvgTagProps;
      feDisplacementMap: SvgTagProps;
      feDistantLight: SvgTagProps;
      feDropShadow: SvgTagProps;
      feFlood: SvgTagProps;
      feFuncA: SvgTagProps;
      feFuncB: SvgTagProps;
      feFuncG: SvgTagProps;
      feFuncR: SvgTagProps;
      feGaussianBlur: SvgTagProps;
      feImage: SvgTagProps;
      feMerge: SvgTagProps;
      feMergeNode: SvgTagProps;
      feMorphology: SvgTagProps;
      feOffset: SvgTagProps;
      fePointLight: SvgTagProps;
      feSpecularLighting: SvgTagProps;
      feSpotLight: SvgTagProps;
      feTile: SvgTagProps;
      feTurbulence: SvgTagProps;
      mpath: SvgTagProps;
    }
  }
}
