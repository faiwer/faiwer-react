import { useState, Fragment, ReactComponent } from '~/index';
import { act } from '~/testing';
import { expectHtmlFull, mount } from '../helpers';

describe('Compact rendering', () => {
  for (const mode of ['fragment', 'component']) {
    it(`doesn't render !--brackets for a ${mode} with only one child`, () => {
      const Comp = () => 'child';
      const middle: JSX.Element = mode === 'fragment' ? ['child'] : <Comp />;
      const root = mount(['before|', middle, '|after']);
      expectHtmlFull(root).toBe('before|child|after');
    });

    it(`renders !--brackets for a ${mode} with multiple children`, () => {
      const Comp = (): JSX.Element => ['a', 'b'];
      const middle: JSX.Element = mode === 'fragment' ? ['a', 'b'] : <Comp />;
      const root = mount(['before|', middle, '|after']);
      expectHtmlFull(root).toBe(
        'before|<!--r:begin:1-->ab<!--r:end:1-->|after',
      );
    });

    for (const pos of ['last', 'only']) {
      it(`recovers !--:empty html-comment for a ${mode} when the ${pos} child is gone`, async () => {
        const content: JSX.Element = pos === 'last' ? ['a', 'b'] : 'only';
        const Comp: ReactComponent<{ empty: boolean }> = ({ empty }) =>
          empty ? [] : content;

        const middle: JSX.Element =
          mode === 'fragment' ? [content].flat() : <Comp empty={false} />;
        const middleEmpty: JSX.Element =
          mode === 'fragment' ? [] : <Comp empty={true} />;

        let showContent: () => void;
        let hideContent: () => void;
        const Wrapper = () => {
          const [show, setShow] = useState(true);
          showContent = () => setShow(true);
          hideContent = () => setShow(false);
          return <div>before!{show ? middle : middleEmpty}!after</div>;
        };

        const wrapperDomNode = mount(<Wrapper />).childNodes[0] as HTMLElement;
        const middleHtml =
          pos === 'last'
            ? '<!--r:begin:1-->ab<!--r:end:1-->' // !-- because [a,b].length > 0
            : 'only';
        expectHtmlFull(wrapperDomNode).toBe(`before!${middleHtml}!after`);

        await act(() => hideContent!());
        expectHtmlFull(wrapperDomNode).toBe(`before!<!--r:empty:1-->!after`);

        await act(() => showContent!());
        expectHtmlFull(wrapperDomNode).toBe(`before!${middleHtml}!after`);
      });
    }

    it(`renders an !--:empty html-comment for an empty ${mode}`, () => {
      const Empty = () => [];
      const middle =
        mode === 'fragment' ? <Fragment key="fragment" /> : <Empty />;
      const root = mount(['before!', middle, '!after']);
      expectHtmlFull(root).toBe('before!<!--r:empty:1-->!after');
    });
  }

  it(`doesn't render !--brackets for a tag with an array as children`, () => {
    expectHtmlFull(
      mount(
        <div>
          {[1, 2, 3].map((v) => (
            <span>{v}</span>
          ))}
        </div>,
      ),
    ).toBe('<div><span>1</span><span>2</span><span>3</span></div>');
  });

  it(`does render !--brackets for a tag with an array as children`, () => {
    expectHtmlFull(
      mount(
        <div>
          before!
          {[1, 2]}
          !after
        </div>,
      ),
    ).toBe('<div>before!<!--r:begin:1-->12<!--r:end:1-->!after</div>');
  });

  it(`doesn't render !--brackets for a regular component`, () => {
    const Comp = () => <div>test</div>;
    expectHtmlFull(mount(<Comp />)).toBe('<div>test</div>');
  });
});
