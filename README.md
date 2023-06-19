# expression-eval

[![Latest NPM release](https://img.shields.io/npm/v/expression-eval.svg)](https://www.npmjs.com/package/expression-eval)
[![Minzipped size](https://badgen.net/bundlephobia/minzip/expression-eval)](https://bundlephobia.com/result?p=expression-eval)
[![License](https://img.shields.io/badge/license-MIT-007ec6.svg)](https://github.com/donmccurdy/expression-eval/blob/master/LICENSE)
[![CI](https://github.com/donmccurdy/expression-eval/workflows/CI/badge.svg?branch=master&event=push)](https://github.com/donmccurdy/expression-eval/actions?query=workflow%3ACI)

JavaScript expression parsing and evaluation.

> ⚠️ **UNMAINTAINED:** The `expression-eval` npm package is no longer maintained. The package was originally published as part of a now-completed personal project, and I do not have incentives to continue maintenance. Please feel free to use the code, but be aware that support and updates will not be available.

> ⚠️ **SECURITY NOTICE:** As mentioned under [Security](#security) below, this library does not attempt to provide a secure sandbox for evaluation. Evaluation involving user inputs (expressions or values) may lead to unsafe behavior. If your project requires a secure sandbox, consider alternatives such as [vm2](https://www.npmjs.com/package/vm2).

Powered by [jsep](https://github.com/soney/jsep).

## Installation

Install:

```
npm install --save expression-eval
```

Import:

```js
// ES6
import { parse, eval } from 'expression-eval';
// CommonJS
const { parse, eval } = require('expression-eval');
// UMD / standalone script
const { parse, eval } = window.expressionEval;
```

## API

### Parsing

```javascript
import { parse } from 'expression-eval';
const ast = parse('1 + foo');
```

The result of the parse is an AST (abstract syntax tree), like:

```json
{
  "type": "BinaryExpression",
  "operator": "+",
  "left": {
    "type": "Literal",
    "value": 1,
    "raw": "1"
  },
  "right": {
    "type": "Identifier",
    "name": "foo"
  }
}
```

### Evaluation

```javascript
import { parse, eval } from 'expression-eval';
const ast = parse('a + b / c'); // abstract syntax tree (AST)
const value = eval(ast, {a: 2, b: 2, c: 5}); // 2.4
```

Alternatively, use `evalAsync` for asynchronous evaluation.

### Compilation

```javascript
import { compile } from 'expression-eval';
const fn = compile('foo.bar + 10');
fn({foo: {bar: 'baz'}}); // 'baz10'
```

Alternatively, use `compileAsync` for asynchronous compilation.

## Security

Although this package does [avoid the use of `eval()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval#Do_not_ever_use_eval!), it _cannot guarantee that user-provided expressions, or user-provided inputs to evaluation, will not modify the state or behavior of your application_. This library does not attempt to provide a secure sandbox for evaluation. Evaluation of arbitrary user inputs (expressions or values) may lead to unsafe behavior. If your project requires a secure sandbox, consider alternatives such as [vm2](https://www.npmjs.com/package/vm2).

## License

MIT License.
