import { act } from 'faiwer-react/testing';
import { expectHtml, mount, useStateX } from '../helpers';

describe('Events', () => {
  it('can render a tag with empty event handler', () => {
    const spy = jest.spyOn(HTMLElement.prototype, 'setAttribute');
    mount(<div tabIndex={1} onClick={undefined} />);
    // onclick shouldn't be handler via `setAttribute`.
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('sets tag event handlers', () => {
    const onclick = jest.fn();
    const addEventListener = jest.spyOn(Element.prototype, 'addEventListener');

    const root = mount(<div onClick={onclick}>Content</div>);
    expect(addEventListener).toHaveBeenCalledTimes(1);
    expect(addEventListener).toHaveBeenLastCalledWith(
      'click',
      expect.any(Function),
      { capture: false },
    );

    const event = new CustomEvent('click');
    root.querySelector('div')?.dispatchEvent(event);
    expect(onclick).toHaveBeenCalledTimes(1);
    expect(onclick).toHaveBeenCalledWith(event);
  });

  for (const mode of ['undefined', 'absent prop']) {
    it(`unsets tag event handlers. mode: ${mode}`, async () => {
      const onclick = jest.fn();
      const listen = useStateX<boolean>();

      const Component = () => {
        const listenValue = listen.use(true);
        return mode === 'undefined' || listenValue ? (
          <div onClick={listenValue ? onclick : undefined}>Content</div>
        ) : (
          <div>Content</div>
        );
      };

      const root = mount(<Component />);
      const event = new CustomEvent('click');
      root.querySelector('div')!.dispatchEvent(event);
      expect(onclick).toHaveBeenCalledTimes(1);

      await act(() => listen.set(false));
      root.querySelector('div')!.dispatchEvent(event);
      expect(onclick).toHaveBeenCalledTimes(1); // Wasn't called.

      await act(() => listen.set(true));
      root.querySelector('div')!.dispatchEvent(event);
      expect(onclick).toHaveBeenCalledTimes(2); // Was called again.
    });

    it(`converts camelCase event names to lowercase event names`, () => {
      const fn = jest.spyOn(HTMLElement.prototype, 'addEventListener');
      mount(<div onClick={() => null} />);
      expect(fn).toHaveBeenCalledWith('click', expect.any(Function), {
        capture: false,
      });
    });

    it(`unsets tag attributes. mode: ${mode}`, async () => {
      const withAttr = useStateX<boolean>();

      const Component = () => {
        const withAttrValue = withAttr.use(true);
        return mode === 'undefined' || withAttrValue ? (
          <div tabIndex={withAttrValue ? 42 : undefined}>Content</div>
        ) : (
          <div>Content</div>
        );
      };

      const root = mount(<Component />);
      const tag = root.querySelector('div');
      expect(tag?.getAttribute('tabIndex')).toBe('42');

      await act(() => withAttr.set(false));
      expect(tag?.hasAttribute('tabIndex')).toBe(false);

      await act(() => withAttr.set(true));
      expect(tag?.getAttribute('tabIndex')).toBe('42');
    });
  }

  for (const mode of ['replace tag', 'remove tag']) {
    it(`removes event handlers on tag removal: ${mode}`, async () => {
      const onclick = jest.fn();
      const show = useStateX<boolean>();

      const Comp = () => {
        return show.use(true) ? (
          <div onClick={onclick}>div</div>
        ) : mode === 'replace tag' ? (
          <span />
        ) : (
          []
        );
      };

      let eventHandler: EventListenerOrEventListenerObject;
      let onAddEvent = jest.fn();
      jest
        .spyOn(Element.prototype, 'addEventListener')
        .mockImplementationOnce((type, listener) => {
          expect(type).toBe('click');
          expect(typeof listener).toBe('function');
          onAddEvent();
          eventHandler = listener;
        });

      const root = mount(<Comp />);
      const div = root.querySelector('div')!;
      const removeSpy = jest.spyOn(div, 'removeEventListener');
      expectHtml(div).toBe('div');

      await act(() => show.set(false));
      expect(onAddEvent).toHaveBeenCalledTimes(1);
      expect(removeSpy).toHaveBeenCalledTimes(1);
      expect(removeSpy).toHaveBeenCalledWith('click', eventHandler!, {
        capture: false,
      });
    });
  }

  it('sets and unsets "capture" events', async () => {
    const handler = jest.fn();
    const show = useStateX<boolean>();
    const withEvent = useStateX<boolean>();
    const Comp = () => {
      const withEventValue = withEvent.use(true);
      return (
        show.use(true) && (
          <div onClickCapture={withEventValue ? handler : undefined}>
            <b />
          </div>
        )
      );
    };

    const addEventListener = jest.spyOn(Element.prototype, 'addEventListener');
    const removeEventListener = jest.spyOn(
      Element.prototype,
      'removeEventListener',
    );

    const root = mount(<Comp />);
    expectHtml(root).toBe('<div><b></b></div>');
    expect(removeEventListener).toHaveBeenCalledTimes(0);
    expect(addEventListener).toHaveBeenCalledTimes(1);
    expect(addEventListener).toHaveBeenLastCalledWith(
      'click',
      expect.any(Function),
      { capture: true },
    );

    const event = new CustomEvent('click');
    root.querySelector('b')!.dispatchEvent(event);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(event);

    await act(() => withEvent.set(false));
    // The event handler is not unmounted,
    expect(addEventListener).toHaveBeenCalledTimes(1);
    root.querySelector('b')!.dispatchEvent(event);
    expect(handler).toHaveBeenCalledTimes(1); // … but also is not called

    await act(() => show.set(false));
    expect(removeEventListener).toHaveBeenCalledTimes(1);
    expect(removeEventListener).toHaveBeenLastCalledWith(
      ...(addEventListener.mock.lastCall as unknown[]),
    );

    await act(() => {
      show.set(true);
      withEvent.set(true);
    });
    expect(addEventListener).toHaveBeenCalledTimes(2);
    expect(addEventListener).toHaveBeenLastCalledWith(
      'click',
      expect.any(Function),
      { capture: true },
    );
    expect(removeEventListener).toHaveBeenCalledTimes(1);
  });
});
