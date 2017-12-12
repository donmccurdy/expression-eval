'use strict';

const expr = require('./');
const assert = require('assert');

const fixtures = [

  // array expression
  {expr: '([1,2,3])[0]',               expected: 1     },
  {expr: '(["one","two","three"])[1]', expected: "two" },
  {expr: '([true,false,true])[2]',     expected: true  },
  {expr: '([1,true,"three"]).length',  expected: 3     },
  {expr: 'isArray([1,2,3])',           expected: true  },
  {expr: 'list[3]',                    expected: 4     },
  {expr: 'numMap[1 + two]',            expected: 'three'},
  
  // binary expression
  {expr: '1+2',         expected: 3},
  {expr: '2-1',         expected: 1},
  {expr: '2*2',         expected: 4},
  {expr: '6/3',         expected: 2},
  {expr: '5|3',         expected: 7},
  {expr: '5&3',         expected: 1},
  {expr: '5^3',         expected: 6},
  {expr: '4<<2',        expected: 16},
  {expr: '256>>4',      expected: 16},
  {expr: '-14>>>2',     expected: 1073741820},
  {expr: '10%6',        expected: 4},
  {expr: '"a"+"b"',     expected: "ab"},
  {expr: 'one + three', expected: 4},

  // call expression
  {expr: 'func(5)',   expected: 6},               
  {expr: 'func(1+2)', expected: 4},
  {expr: 'one(two)',  expected: undefined},

  // conditional expression
  {expr: '(true ? "true" : "false")',               expected: "true"  }, 
  {expr: '( ( bool || false ) ? "true" : "false")', expected: "true"  }, 
  {expr: '( true ? ( 123*456 ) : "false")',         expected: 123*456 }, 
  {expr: '( false ? "true" : one + two )',          expected: 3       }, 

  // identifier
  {expr: 'string', expected: "string" },
  {expr: 'number', expected: 123      },
  {expr: 'bool',   expected: true     },

  // literal 
  {expr: '"foo"', expected: "foo" }, // string literal
  {expr: "'foo'", expected: "foo" }, // string literal
  {expr: '123',   expected: 123   }, // numeric literal
  {expr: 'true',  expected: true  }, // boolean literal

  // logical expression
  {expr: 'false || true',   expected: true  },
  {expr: 'true && false',   expected: false },
  {expr: '1 == "1"',        expected: true  },
  {expr: '2 != "2"',        expected: false },
  {expr: '1.234 === 1.234', expected: true  },
  {expr: '123 !== "123"',   expected: true  },
  {expr: '1 < 2',           expected: true  },
  {expr: '1 > 2',           expected: false },
  {expr: '2 <= 2',          expected: true  },
  {expr: '1 >= 2',          expected: false },

  // member expression
  {expr: 'foo.bar',      expected: 'baz' }, 
  {expr: 'foo["bar"]',   expected: 'baz' }, 
  {expr: 'foo[foo.bar]', expected: 'wow' },
  {expr: 'bogus.thing',  expected: undefined },

  // unary expression
  {expr: '-one',   expected: -1   },
  {expr: '+two',   expected: 2    },
  {expr: '!false', expected: true },
  {expr: '!!true', expected: true },
  {expr: '~15',    expected: -16  },

];

const context = {
  string: "string",
  number: 123,
  bool: true,
  one: 1,
  two: 2,
  three: 3,
  foo: {bar: 'baz', baz: "wow"},
  numMap: {10: 'ten', 3: 'three'},
  list: [1,2,3,4,5],
  func: function(x) { return x + 1; },
  isArray: Array.isArray,

};

var tests = 0;
var passed = 0;


fixtures.forEach((o) => {
  tests++;
  var val = expr.compile(o.expr)(context);
  assert.equal(
    val,
    o.expected,
    'Failed: ' + o.expr + ' ('+val+') === ' + o.expected);
  passed++;
});

// test 'this'
(function testThis() {
  tests++;
  var localThis = { A: 'aay', B: 'bee' };
  var context = { baz: 'blah' };
  var ast = expr.parse( 'this.A' );
  var val = expr.eval.apply( localThis, [ ast, context ] );
  if ( val === 'aay' ) passed++;
})();

// test the default route
(function testBogus() {
  tests++;
  var ast = { type: "Bogus" };
  var val = expr.eval( ast, {} );
  if ( val === undefined ) passed++;
})();

console.log('%s/%s tests passed.', passed, tests);
