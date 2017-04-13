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
expr.eval('a + b / c', {a: 2, b: 2, c: 5}); // 0.8
```

## Compilation

```javascript
const expr = require('expression-eval');
const fn = expr.compile('foo.bar + 10');
fn({foo: {bar: 'baz'}}); // 'baz10'
```

## License

Not yet licensed.
