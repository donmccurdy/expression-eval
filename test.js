require('source-map-support').install();

const expr = require('./dist/expression-eval.js');
const tape = require('tape');

const fixtures = [

  // array expression
  {expr: '([1,2,3])[0]',               expected: 1     },
  {expr: '(["one","two","three"])[1]', expected: 'two' },
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
  {expr: '"a"+"b"',     expected: 'ab'},
  {expr: 'one + three', expected: 4},

  // call expression
  {expr: 'func(5)',   expected: 6},
  {expr: 'func(1+2)', expected: 4},

  // conditional expression
  {expr: '(true ? "true" : "false")',               expected: 'true'  },
  {expr: '( ( bool || false ) ? "true" : "false")', expected: 'true'  },
  {expr: '( true ? ( 123*456 ) : "false")',         expected: 123*456 },
  {expr: '( false ? "true" : one + two )',          expected: 3       },

  // identifier
  {expr: 'string', expected: 'string' },
  {expr: 'number', expected: 123      },
  {expr: 'bool',   expected: true     },

  // literal
  {expr: '"foo"', expected: 'foo' }, // string literal
  {expr: "'foo'", expected: 'foo' }, // string literal
  {expr: '123',   expected: 123   }, // numeric literal
  {expr: 'true',  expected: true  }, // boolean literal

  // logical expression
  {expr: 'true || false',   expected: true  },
  {expr: 'true && false',   expected: false },
  {expr: '1 == "1"',        expected: true  },
  {expr: '2 != "2"',        expected: false },
  {expr: '1.234 === 1.234', expected: true  },
  {expr: '123 !== "123"',   expected: true  },
  {expr: '1 < 2',           expected: true  },
  {expr: '1 > 2',           expected: false },
  {expr: '2 <= 2',          expected: true  },
  {expr: '1 >= 2',          expected: false },

  // logical expression lazy evaluation
  {expr: 'true || throw()',  expected: true  },
  {expr: 'false || true',    expected: true  },
  {expr: 'false && throw()', expected: false  },
  {expr: 'true && false',    expected: false  },

  // member expression
  {expr: 'foo.bar',      expected: 'baz' },
  {expr: 'foo["bar"]',   expected: 'baz' },
  {expr: 'foo[foo.bar]', expected: 'wow' },

  // call expression with member
  {expr: 'foo.func("bar")', expected: 'baz'},

  // unary expression
  {expr: '-one',   expected: -1   },
  {expr: '+two',   expected: 2    },
  {expr: '!false', expected: true },
  {expr: '!!true', expected: true },
  {expr: '~15',    expected: -16  },
  {expr: '+[]',    expected: 0    },

  // 'this' context
  {expr: 'this.three', expected: 3 },

  // custom operators
  {expr: '@2', expected: 'two' },
  {expr: '3#4', expected: 3.4  },
  {expr: '(1 # 2 # 3)', expected: 1.5 }, // Fails with undefined precedence, see issue #45
  {expr: '1 + 2 ~ 3', expected: 9 }, // ~ is * but with low precedence

  // implicit optional chaining
  {expr: 'foo.not.here', expected: undefined, options: {implicitOptionalChaining: true}},
  {expr: 'foo.not.here', throws: /Cannot read property 'here' of undefined/},
  {expr: 'foo.not[0].here', expected: undefined, options: {implicitOptionalChaining: true}},
  {expr: 'foo.not[0].here', throws: /Cannot read property '0' of undefined/}
];

const context = {
  string: 'string',
  number: 123,
  bool: true,
  one: 1,
  two: 2,
  three: 3,
  foo: {bar: 'baz', baz: 'wow', func: function(x) { return this[x]; }},
  numMap: {10: 'ten', 3: 'three'},
  list: [1,2,3,4,5],
  func: function(x) { return x + 1; },
  isArray: Array.isArray,
  throw: () => { throw new Error('Should not be called.'); }
};

expr.addUnaryOp('@', (a) => {
  if (a === 2) {
    return 'two';
  }
  throw new Error('Unexpected value: ' + a);
});

expr.addBinaryOp('#', (a, b) => a + b / 10);

expr.addBinaryOp('~', 1, (a, b) => a * b);

tape('sync', (t) => {
  fixtures.forEach((o) => {
      if (o.throws) {
        t.throws(() => expr.compile(o.expr)(context, o.options), o.throws, 'error was thrown');
      } else {
        const val = expr.compile(o.expr)(context, o.options);
        t.equal(val, o.expected, `${o.expr} (${val}) === ${o.expected}`);
      }
  });

  t.end();
});

tape('async', async (t) => {
  const asyncContext = context;
  asyncContext.asyncFunc = async function(a, b) {
    return await a + b;
  };
  asyncContext.promiseFunc = function(a, b) {
    return new Promise((resolve, reject) => {
      setTimeout(() => resolve(a + b), 1000);
    })
  }
  const asyncFixtures = fixtures;
  asyncFixtures.push({
    expr: 'asyncFunc(one, two)',
    expected: 3,
  }, {
    expr: 'promiseFunc(one, two)',
    expected: 3,
  });

  for (let o of asyncFixtures) {
    if (o.throws) {
      try {
        await expr.compileAsync(o.expr)(context, o.options);
        t.fail('asynchronous function did not throw');
      } catch (e) {
        t.match(e.message, o.throws, 'asynchronous error was thrown');
      };
    } else {
      const val = await expr.compileAsync(o.expr)(asyncContext, o.options);
      t.equal(val, o.expected, `${o.expr} (${val}) === ${o.expected}`);
    }
  }
  t.end();
});
