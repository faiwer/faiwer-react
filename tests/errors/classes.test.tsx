import { Component } from 'faiwer-react';
import { expectHtmlFull, mount } from '../helpers';
import {
  ClassBoundaryX,
  ERR_HTML_ON_MOUNT,
  expectDidCatchX,
  genSwitch,
  Throw,
} from './fixtures';

describe('Errors: Class components', () => {
  it('componentDidCatch catches errors on initial mount', async () => {
    const root = mount(
      <ClassBoundaryX>
        <Throw />
      </ClassBoundaryX>,
    );
    expectHtmlFull(root).toBe(ERR_HTML_ON_MOUNT);

    await expectDidCatchX(root);
  });

  it('componentDidCatch catches errors on rerender', async () => {
    const [Switch, error] = genSwitch();
    const root = mount(
      <ClassBoundaryX>
        <Switch />
      </ClassBoundaryX>,
    );
    expectHtmlFull(root).toBe('okay');

    error.set(true);
    await expectDidCatchX(root);
  });

  it(`class components doesn't catch errors if componentDidCatch is not given`, async () => {
    class Comp extends Component<{ children: JSX.Element }> {
      render = () => this.props.children;
    }

    const root = mount(
      <ClassBoundaryX>
        <Comp>
          <Throw />
        </Comp>
      </ClassBoundaryX>,
    );
    expectHtmlFull(root).toBe(ERR_HTML_ON_MOUNT);

    await expectDidCatchX(root);
  });
});
