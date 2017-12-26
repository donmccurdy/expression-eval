# expression-eval

JavaScript expression parsing and evaluation, safely.

Powered by [jsep](https://github.com/soney/jsep).

## Installation

```
npm install --save expression-eval
```

## Parsing

```javascript
const expr = require('expression-eval');
const ast = expr.parse('1 + foo');
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

## Evaluation

```javascript
const expr = require('expression-eval');
const ast = expr.parse('a + b / c'); // abstract syntax tree (AST)
const value = expr.eval(ast, {a: 2, b: 2, c: 5}); // 2.4
```

## Compilation

```javascript
const expr = require('expression-eval');
const fn = expr.compile('foo.bar + 10');
fn({foo: {bar: 'baz'}}); // 'baz10'
```

## License

MIT License.
