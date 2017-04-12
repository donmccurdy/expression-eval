# jsexp

JavaScript expression parsing and evaluation, safely.

Powered by [jsep](https://github.com/soney/jsep).

## Installation

```
npm install --save jsexp
```

## Parsing

```javascript
const jsexp = require('jsexp');
const ast = jsexp.parse('1 + foo');
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
const jsexp = require('jsexp');
jsexp.eval('a + b / c', {a: 2, b: 2, c: 5}); // 0.8
```

## Compilation

```javascript
const jsexp = require('jsexp');
const fn = jsexp.compile('foo.bar + 10');
fn({foo: {bar: 'baz'}}); // 'baz10'
```

## License

Not yet licensed.
