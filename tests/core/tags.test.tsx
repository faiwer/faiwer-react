import { act } from 'faiwer-react/testing';
import { expectHtml, itRenders, mount, useStateX } from '../helpers';
import { createRoot } from 'faiwer-react';

describe('Tags', () => {
  it('cleans the root before mounting', () => {
    const root = document.createElement('root');
    root.innerHTML = 'before';
    createRoot(root, { testMode: true }).render(<div>Content</div>);
    expect(root.innerHTML).toBe('<div>Content</div>');
  });

  itRenders('mounts a simple <div/>', <div>Content</div>, '<div>Content</div>');

  itRenders(
    `moutns an SVG`,
    <svg xmlns="http://www.w3.org/2000/svg" width={64} height={64}>
      <circle cx={30} cy="30" r="30" fill="black" />
    </svg>,
    `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><circle cx="30" cy="30" r="30" fill="black"></circle></svg>`,
  );

  itRenders(
    'sets html-attributes',
    <div className="cls">Content</div>,
    `<div class="cls">Content</div>`,
  );

  itRenders(
    'mounts a tree of tags',
    <div>
      <div>1</div>2<div>3</div>
    </div>,
    '<div><div>1</div>2<div>3</div></div>',
  );

  itRenders(
    'key is not rendered',
    <div key="key">Content</div>,
    '<div>Content</div>',
  );

  // It's can be critical when assinging a value causes some effects.
  it(`doesn't reassign an attribute when its stringified value is intact`, async () => {
    const tabIndex = useStateX<string | number>();

    const Comp = () => <div tabIndex={tabIndex.use(42) as number} />;

    const root = mount(<Comp />);
    expectHtml(root).toBe('<div tabindex="42"></div>');

    const div = root.querySelector('div')!;
    const spy = jest.spyOn(div, 'setAttribute');

    await act(() => tabIndex.set('42'));
    expectHtml(root).toBe('<div tabindex="42"></div>');
    expect(spy).toHaveBeenCalledTimes(0);

    await act(() => tabIndex.set(24));
    expectHtml(root).toBe('<div tabindex="24"></div>');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  itRenders(
    'remaps camelCased attributes',
    <input autoFocus />,
    '<input autofocus="">',
  );

  it(`doesn't treat "value" as an attribute`, () => {
    const root = mount(<input value="42" />);
    expectHtml(root).toBe('<input>');
    expect(root.querySelector('input')?.value).toBe('42');
  });

  it('renders SVG tags as SVGElements', () => {
    const ns = jest.spyOn(document, 'createElementNS');
    const root = mount(
      <svg>
        <path />
      </svg>,
    );
    expect(root.querySelector('svg')).toBeInstanceOf(SVGElement);
    expect(root.querySelector('path')).toBeInstanceOf(SVGElement);
    expect(ns).toHaveBeenCalledTimes(2);
    expectHtml(root).toBe('<svg><path></path></svg>');
  });

  it('sets SVG attributes properly', () => {
    const root = mount(
      <svg viewBox="0 0 10 10">
        <path strokeWidth={2} markerWidth={8} />
      </svg>,
    );
    expectHtml(root).toBe(
      '<svg viewBox="0 0 10 10">' +
        `<path stroke-width="2" markerWidth="8"></path>` +
        '</svg>',
    );
  });

  itRenders(
    `doesn't put "true" to boolean fields`,
    <input disabled={true} />,
    `<input disabled="">`,
  );

  itRenders(
    `doesn't put "false" to boolean fields`,
    <input disabled={false} />,
    `<input>`,
  );

  it(`dangerouslySetInnerHTML sets arbitrary HTML`, async () => {
    const html = useStateX<string>();
    const Comp = () => (
      <div dangerouslySetInnerHTML={{ __html: html.use('<b>Hey</b>') }} />
    );

    const root = mount(<Comp />);
    expectHtml(root).toBe(`<div><b>Hey</b></div>`);

    await act(() => html.set('<i>i</i>'));
    expectHtml(root).toBe(`<div><i>i</i></div>`);
  });
});
