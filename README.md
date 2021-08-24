# expression-eval

[![Latest NPM release](https://img.shields.io/npm/v/expression-eval.svg)](https://www.npmjs.com/package/expression-eval)
[![Minzipped size](https://badgen.net/bundlephobia/minzip/expression-eval)](https://bundlephobia.com/result?p=expression-eval)
[![License](https://img.shields.io/badge/license-MIT-007ec6.svg)](https://github.com/donmccurdy/expression-eval/blob/master/LICENSE)
[![CI](https://github.com/donmccurdy/expression-eval/workflows/CI/badge.svg?branch=master&event=push)](https://github.com/donmccurdy/expression-eval/actions?query=workflow%3ACI)

JavaScript expression parsing and evaluation.

> **IMPORTANT:** As mentioned under [Security](#security) below, this library does not attempt to provide a secure sandbox for evaluation. Evaluation involving user inputs (expressions or values) may lead to unsafe behavior. If your project requires a secure sandbox, consider alternatives such as [vm2](https://www.npmjs.com/package/vm2).

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
const { parse, evaluate } = require('expression-eval');
// UMD / standalone script
const { parse, evaluate } = window.expressionEval;
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

### Node Types supported:
This project will try to stay current with all JSEP's node types::
- `ArrayExpression`
- `LogicalExpression`/`BinaryExpression`
- `CallExpression`
- `ConditionalExpression`
- `Identifier`
- `Literal`
- `MemberExpression`
- `ThisExpression`
- `UnaryExpression`

As well as the optional plugin node types:
- `ArrowFunctionExpression`
- `AssignmentExpression`/`UpdateExpression`
- `AwaitExpression`
- `NewExpression`
- `ObjectExpression`
- `SpreadElement`
- `TaggedTemplateExpression`/`TemplateLiteral`

### Extending evaluation

To modify the evaluation, use any of the modification methods:
- `addUnaryOp(operator, evaluator)`. Will add the operator to jsep, and the function to evaluate the operator
- `addBinaryOp(operator, precedence | evaluator, evaluator)`. Will add the operator to jsep at the given
precedence (if provided), and the function to evaluate the operator
- `addEvaluator(nodeType, evaluator)`. Will add the evaluator function to the map of functions
for each node type. This evaluator will be called with the ExpressionEval instance bound to it.
The evaluator is responsible for handling both sync and async, as needed, but can use the `this.isAsync`
or `this.evalSyncAsync()` to help.
  - If the node type is unknown, expression-eval will check for a `default` node type handler before
  throwing an error for an unknown node type. If any other behavior is desired, this can be overridden
  by providing a new `default` evaluator.

## Security

Although this package does [avoid the use of `eval()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval#Do_not_ever_use_eval!), it _cannot guarantee that user-provided expressions, or user-provided inputs to evaluation, will not modify the state or behavior of your application_. This library does not attempt to provide a secure sandbox for evaluation. Evaluation of arbitrary user inputs (expressions or values) may lead to unsafe behavior. If your project requires a secure sandbox, consider alternatives such as [vm2](https://www.npmjs.com/package/vm2).

## License

MIT License.
