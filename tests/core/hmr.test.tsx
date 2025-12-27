import { expectHtmlFull, mount } from '../helpers';
import { ReactComponent, useState } from 'faiwer-react';
import type {
  HMRFamily,
  RAppRoot,
  RDevToolsHook,
  RRenderer,
} from 'faiwer-react/core/devTools/types';
import { act } from 'faiwer-react/testing';

describe('HMR', () => {
  const onCommitFiberRoot = jest.fn();
  const inject = jest.fn().mockImplementation(() => 1);
  const map = new Map<ReactComponent<any>, HMRFamily>();
  const internalRoot = null as unknown as RAppRoot;
  const renderers = new Map<number, RRenderer>();

  const refreshHandler = (comp: ReactComponent): null | HMRFamily =>
    map.get(comp) ?? null;

  beforeEach(() => {
    map.clear();
    renderers.clear();

    (
      window as unknown as {
        __REACT_DEVTOOLS_GLOBAL_HOOK__: Partial<RDevToolsHook>;
      }
    ).__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      renderers,
      inject,
      onCommitFiberRoot,
    };
  });

  it('App calls inject() on start up', () => {
    mount(42);
    expect(inject.mock.calls).toEqual([
      [
        expect.objectContaining({
          setRefreshHandler: expect.any(Function),
          scheduleRefresh: expect.any(Function),
        }),
      ],
    ]);
    expect([...renderers]).toEqual([[1, inject.mock.calls[0][0]]]);
  });

  it('HMR updates a component', async () => {
    const SimpleV1 = () => 42;
    const root = mount(<SimpleV1 />);

    const SimpleV2 = () => 21;
    const family: HMRFamily = { current: SimpleV2 };
    for (const Comp of [SimpleV1, SimpleV2]) map.set(Comp, family);
    const renderer = renderers.get(1)!;
    renderer.setRefreshHandler!(refreshHandler);

    await act(() => {
      renderer.scheduleRefresh!(internalRoot, {
        staleFamilies: new Set(),
        updatedFamilies: new Set([family]),
      });
    });
    expectHtmlFull(root).toBe('21');
  });

  it('HMR updates multiple components', async () => {
    const V1 = ({ v }: { v: number }) => v ** 2;
    const root = mount([1, 2, 3].map((v) => <V1 v={v} />));
    expectHtmlFull(root).toBe(`1` + `4` + `9`);

    const V2 = ({ v }: { v: number }) => v + 30;
    const family: HMRFamily = { current: V2 };
    for (const Comp of [V1, V2]) map.set(Comp, family);
    const renderer = renderers.get(1)!;
    renderer.setRefreshHandler!(refreshHandler);

    await act(() => {
      renderer.scheduleRefresh!(internalRoot, {
        staleFamilies: new Set(),
        updatedFamilies: new Set([family]),
      });
    });
    expectHtmlFull(root).toBe('31' + `32` + `33`);
  });

  for (const mode of ['wrapped', 'sub-root']) {
    it(`HMR remounts components. mode=${mode}`, async () => {
      const V1 = ({ v }: { v: number }) => v ** 2;
      const Parent = () => [1, 2, 3].map((v) => <V1 v={v} />);
      const root = mount(mode === 'sub-root' ? Parent() : <Parent />);
      expectHtmlFull(root).toBe(`1` + `4` + `9`);

      const V2 = ({ v }: { v: number }) => v + useState(30)[0];
      const family: HMRFamily = { current: V2 };
      for (const Comp of [V1, V2]) map.set(Comp, family);
      const renderer = renderers.get(1)!;
      renderer.setRefreshHandler!(refreshHandler);

      await act(() => {
        renderer.scheduleRefresh!(internalRoot, {
          updatedFamilies: new Set(),
          staleFamilies: new Set([family]),
        });
      });
      expectHtmlFull(root).toBe('31' + `32` + `33`);
    });
  }
});
