import { useCallback, useState } from 'faiwer-react';
import { expectHtml, mount, useStateX, waitFor } from '../helpers';

describe('Hooks', () => {
  const itThrows = (name: string, fn: (onError: jest.Mock) => Promise<void>) =>
    it(name, async () => {
      const onError = jest.fn();
      global.addEventListener('error', onError, { once: true });
      const spy = jest.spyOn(console, 'error').mockImplementationOnce(() => {});

      try {
        await fn(onError);
      } finally {
        global.removeEventListener('error', onError);
        spy.mockClear();
      }
    });

  itThrows('throws when hooks are reordered', async (onError) => {
    const v = useStateX<number>();
    let reorder = false;

    const Comp = () => {
      if (!reorder) {
        const value = v.use(1);
        useCallback(() => value, [value]);
        return value;
      } else {
        useCallback(() => 42, []);
        return v.use(1);
      }
    };

    const root = mount(<Comp />);
    expectHtml(root).toBe('1');

    reorder = true;
    v.set(2);

    await waitFor(async () => {
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: expect.stringContaining('hook order'),
          }),
        }),
      );
    });
  });

  itThrows('throws when more hooks were executed', async (onError) => {
    const v = useStateX<number>();
    let addExtraHook = false;

    const Comp = () => {
      const value = v.use(1);
      useCallback(() => value, [value]);
      if (addExtraHook) {
        useState(42);
      }

      return value;
    };

    const root = mount(<Comp />);
    expectHtml(root).toBe('1');

    addExtraHook = true;
    v.set(2);

    await waitFor(() => {
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: expect.any(String),
          }),
        }),
      );
    });
  });

  itThrows('throws when fewer hooks were executed', async (onError) => {
    const v = useStateX<number>();
    let skipHook = false;

    const Comp = () => {
      const value = v.use(1);
      if (!skipHook) {
        useCallback(() => value, [value]);
      }

      return value;
    };

    const root = mount(<Comp />);
    expectHtml(root).toBe('1');

    skipHook = true;
    v.set(2);

    await waitFor(async () => {
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: expect.stringContaining('hook order'),
          }),
        }),
      );
    });
  });
});
