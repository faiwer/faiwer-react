import { Component, Fragment } from 'faiwer-react';

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

// DOM. Events
<div onClick={(event) => event.type.length} />;
// @ts-expect-error
<div onclick={(event) => event.type.length} />;
