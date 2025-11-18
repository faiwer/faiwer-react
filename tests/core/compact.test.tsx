import { createPortal, Fragment, ReactComponent } from '~/index';
import { act } from '~/testing';
import { expectHtmlFull, mount, useStateX } from '../helpers';
import { getFiberDomNodes } from 'faiwer-react/core/actions/helpers';

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

        const show = useStateX<boolean>();
        const Wrapper = () => (
          <div>before!{show.use(true) ? middle : middleEmpty}!after</div>
        );

        const wrapperDomNode = mount(<Wrapper />).childNodes[0] as HTMLElement;
        const middleHtml =
          pos === 'last'
            ? '<!--r:begin:1-->ab<!--r:end:1-->' // !-- because [a,b].length > 0
            : 'only';
        expectHtmlFull(wrapperDomNode).toBe(`before!${middleHtml}!after`);

        await act(() => show.set(false));
        expectHtmlFull(wrapperDomNode).toBe(`before!<!--r:empty:1-->!after`);

        await act(() => show.set(true));
        expectHtmlFull(wrapperDomNode).toBe(`before!${middleHtml}!after`);
      });
    }

    it(`renders an !--:empty html-comment for an empty ${mode}`, () => {
      const Empty = () => [];
      const middle =
        mode === 'fragment' ? (
          // @ts-expect-error
          <Fragment key="fragment" />
        ) : (
          <Empty />
        );
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

  it(`doesn't render !-- brackets for a fragment with a single child`, () => {
    expectHtmlFull(
      mount(
        <div>
          <>content</>
        </div>,
      ),
    ).toBe(`<div>content</div>`);
  });

  it(`doesn't render !-- brackets for a fragment with a single child in a component`, () => {
    const Comp = () => <>content</>;
    expectHtmlFull(mount(<Comp />)).toBe(`content`);
  });

  it('correctly inserts more nodes to a fragment', async () => {
    const solo = useStateX<boolean>();
    const Child = () => null;

    const Parent = () => {
      return solo.use(true) ? (
        <Fragment key="fragment">
          <Child key="1" />
        </Fragment>
      ) : (
        <Fragment key="fragment">
          <Child key="1" />
          <Child key="2" />
        </Fragment>
      );
    };

    const root = mount(<Parent />);
    expectHtmlFull(root).toBe(`<!--r:null:1-->`);

    await act(() => solo.set(false));
    expectHtmlFull(root).toBe(
      `<!--r:begin:1-->` + // Parent
        `<!--r:begin:2-->` + // Fragment
        // Content
        `<!--r:null:3--><!--r:null:4-->` +
        `<!--r:end:2-->` + // Fragment
        `<!--r:end:1-->`, // Parent
    );
  });

  it('recursively re-compacts parent nodes when the only child is replaced', async () => {
    const key = useStateX<number>();
    const Child: ReactComponent<{ v: number }> = ({ v }) => v;

    const Parent = () => {
      const keyValue = key.use(1);
      return (
        <Fragment key="fragment">
          <Child key={keyValue} v={keyValue} />
        </Fragment>
      );
    };

    const root = mount(<Parent />);
    expectHtmlFull(root).toBe(`1`);

    await act(() => key.set(2));
    expectHtmlFull(root).toBe('2');
  });

  // There was a bug when the order of the !--wrappers was wrong because
  // `displaceFiber` didn't update the `fiber.id`. Thus `isEndOf` didn't work
  // because the fiber's `id` and !--IDs were different.
  it('properly handles replacing the only child with a fragment', async () => {
    const idx = useStateX<number>();

    const Child1 = () => 'a';
    const Child2 = () => ['b', 'c'];

    const Comp = () => (idx.use(1) === 1 ? <Child1 /> : <Child2 />);

    const root = mount(<Comp />);
    expectHtmlFull(root).toBe('a');

    await act(() => idx.set(2));

    expectHtmlFull(root).toBe(
      '<!--r:begin:1--><!--r:begin:2-->bc<!--r:end:2--><!--r:end:1-->',
    );

    await act(() => idx.set(1));
    expectHtmlFull(root).toBe('a');
  });

  it('can replace one !--empty fragment with another', async () => {
    const key = useStateX<string>();

    const Comp = () => (
      <div>
        {/* @ts-expect-error */}
        <Fragment key={key.use('first')} />
      </div>
    );

    const root = mount(<Comp />);
    expectHtmlFull(root).toBe('<div><!--r:empty:1--></div>');

    await act(() => key.set('second'));
    expectHtmlFull(root).toBe('<div><!--r:empty:1--></div>');
  });
});

describe('getFiberDomNodes', () => {
  it('a tag node', () => {
    const div = mount(<div>1</div>).childNodes[0] as HTMLElement;
    expect(div.outerHTML).toBe('<div>1</div>');
    expect(getFiberDomNodes(div.__fiber!)).toEqual([div]);
  });

  it('a text node', () => {
    const div = mount(<div>1</div>).childNodes[0] as HTMLElement;
    const text = div.childNodes[0] as Text;
    expect(text.textContent).toBe('1');
    expect(getFiberDomNodes(text.__fiber!)).toEqual([text]);
  });

  it('a null node', () => {
    const nullNode = mount(null).childNodes[0] as Comment;
    expect(nullNode.textContent).toMatch(/^r:null/);
    expect(getFiberDomNodes(nullNode.__fiber!)).toEqual([nullNode]);
  });

  it('an empty node', () => {
    const empty = mount(
      <div>
        1<></>
      </div>,
    ).childNodes[0].childNodes[1] as Comment;
    expect(empty.textContent).toMatch(/^r:empty/);
    expect(getFiberDomNodes(empty.__fiber!)).toEqual([empty]);
  });

  it('a portal node', () => {
    const target = document.createElement('target');
    const portal = mount(createPortal(<b />, target)).childNodes[0] as Comment;
    expect(portal.textContent).toMatch(/^r:portal/);
  });

  it('fragment with two children', () => {
    const root = mount(
      <Fragment key="fragment">
        {1}
        {2}
      </Fragment>,
    );
    const children = [...root.childNodes];
    const end = children.at(-1) as Comment;
    expect(end.textContent).toMatch(/^r:end/);
    expect(getFiberDomNodes(end.__fiber!)).toEqual(children);
  });
});
