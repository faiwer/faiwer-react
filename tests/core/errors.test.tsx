import { useError } from 'faiwer-react/hooks/useError';
import { mount, useStateX } from '../helpers';
import { ErrorHandler, type ComponentFiberNode } from 'faiwer-react';
import { act } from 'faiwer-react/testing';

describe('Error handling', () => {
  it('a component with useError is marked as error boundary', () => {
    const Comp = () => {
      useError(() => null);
      return 42;
    };

    const root = mount(<Comp />);
    const fiber = root.__fiber!.children[0];
    expect((fiber as ComponentFiberNode).data.isErrorBoundary).toBe(true);
  });

  it('a component without useError is not marked as error boundary', () => {
    const Comp = () => 42;
    const root = mount(<Comp />);
    const fiber = root.__fiber!.children[0];
    expect((fiber as ComponentFiberNode).data.isErrorBoundary).toBe(false);
  });

  it(`stores the given handler in the hook store`, async () => {
    const handler = useStateX<ErrorHandler>();
    const fn1 = () => 1;
    const fn2 = () => 2;

    const Comp = () => {
      useError(handler.use(() => fn1));
      return 42;
    };

    const root = mount(<Comp />);
    const fiber = root.__fiber!.children[0] as ComponentFiberNode;
    expect(fiber.data.hooks![1]).toMatchObject({ fn: fn1 });

    await act(() => handler.set(() => fn2));
    expect(fiber.data.hooks![1]).toMatchObject({ fn: fn2 });
  });
});
