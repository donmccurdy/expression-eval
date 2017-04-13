const expr = require('./');
const assert = require('assert');

const fixtures = [
  {expr: '1 + 2 + 3', expected: 6},
  {expr: 'one + three', expected: 4},
  {expr: 'foo.bar + 2', expected: 'baz2'},
  {expr: 'foo.bar + 2', expected: 'baz2'},
  {expr: 'numMap[1 + two]', expected: 'three'},
  {expr: '"run" + "ning"', expected: 'running'}
];

const context = {
  one: 1,
  two: 2,
  three: 3,
  foo: {bar: 'baz'},
  numMap: {10: 'ten', 3: 'three'}
};

fixtures.forEach((o) => {
  assert.equal(
    expr.compile(o.expr)(context),
    o.expected,
    'Failed: ' + o.expr + ' === ' + o.expected);
});

console.log('%s/%s tests passed.', fixtures.length, fixtures.length);
