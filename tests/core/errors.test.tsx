import { useError } from 'faiwer-react/hooks/useError';
import { mount } from '../helpers';
import type { ComponentFiberNode } from 'faiwer-react';

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
});
