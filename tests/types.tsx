import {
  Component,
  createContext,
  Fragment,
  type ReactComponent,
} from 'faiwer-react';

declare const Blank: () => JSX.Element;
declare const User: (props: { id: number }) => JSX.Element;
declare const Container: (props: { children: JSX.Element }) => JSX.Element;
declare const Menu: ({ children }: { children: () => void }) => JSX.Element;
class ClassComponent extends Component {}

// Element
<div />;
<Blank />;
<ClassComponent />;

// Children
<Container>1</Container>;
<Container>{1}</Container>;
<Container>{true}</Container>;
<Container>{false}</Container>;
<Container>{null}</Container>;
<Container>{undefined}</Container>;
<Container>
  <Fragment>{1}</Fragment>
</Container>;
<Container>
  <Blank />
</Container>;
<Container>
  <User id={1} />
</Container>;
<Container>[1]</Container>;
// @ts-expect-error
<Container>{Symbol.for('1')}</Container>;
// @ts-expect-error
<Container>{() => <b />}</Container>;
// @ts-expect-error
<Menu>{1}</Menu>;
<Menu>{() => void 0}</Menu>;

// Props. FC
<User id={1} />;
// @ts-expect-error
<User id={'1'} />;
// @ts-expect-error
<User />;
// @ts-expect-error
<User id={1} some={2} />;
// @ts-expect-error
<Blank some={2} />;

// Props. FC. Children
// @ts-expect-error
<User id={1}>2</User>;
// @ts-expect-error
<Blank>2</Blank>;
<Container>2</Container>;
// @ts-expect-error
<Container></Container>;
declare const FC_L: ReactComponent;
FC_L.displayName = 'AnotherName';

// DOM. Attributes
<div className="test" />;
// @ts-expect-error
<div className={123} />;
<div tabIndex={123} />;
// @ts-expect-error
<div tabIndex="123" />;
// @ts-expect-error
<div autofocus />;
<div autoFocus />;
<div autoFocus={true} />;
// overrides
<input value="string" />;
<input value={42} />;
// @ts-expect-error
<input value={true} />;
<input defaultValue="123" />;
<input defaultValue={123} />;
<input defaultChecked={true} />;
<textarea defaultValue={123} />;
<textarea defaultValue="123" />;
// @ts-expect-error
<textarea defaultChecked="123" />;

// DOM. Events
<div onClick={(event) => event.type.length} />;
// @ts-expect-error
<div onclick={(event) => event.type.length} />;
<div onClick={(event) => event.target.tagName} />;
<div onClickCapture={(event) => event.target.tagName} />;
<input onPaste={(event) => event.clipboardData.items} />;

//
// React. Compatibility
//

declare let _F1: React.FC<{ id: number }>;
_F1 = User;
// @ts-expect-error
_F1 = ({ id }: { id: string }) => id;

declare let _F5: React.ComponentType<{ id: number }>;
_F5 = User;
// @ts-expect-error
_F5 = ({ id }: { id: string }) => id;

declare let _F2: React.ReactNode;
for (const n of [
  1,
  '1',
  true,
  null,
  undefined,
  <Blank />,
  <ClassComponent />,
]) {
  _F2 = n;
}

declare let _F3: React.Context<number>;
_F3 = createContext(42);
// @ts-expect-error
_F3 = createContext('42');

declare let _F4: React.CSSProperties;
_F4 = { display: 'none', fontSize: '12px;' };
// @ts-expect-error
_F4 = { ['font-size']: '12px;' };

declare let _F6: React.ComponentProps<typeof User>;
_F6 = { id: 32 };
// @ts-expect-error
_F6 = { id: '32' };

declare let F7: React.ComponentType<{ id: number }>;
<F7 id={1} />;
// @ts-expect-error
<F7 />;
