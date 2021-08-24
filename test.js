require('source-map-support').install();

const expr = require('./dist/expression-eval.js');
const tape = require('tape');
expr.parse.plugins.register(require('@jsep-plugin/arrow'));
expr.parse.plugins.register(require('@jsep-plugin/assignment'));
expr.parse.plugins.register(require('@jsep-plugin/async-await'));
expr.parse.plugins.register(require('@jsep-plugin/new'));
expr.parse.plugins.register(require('@jsep-plugin/object'));
expr.parse.plugins.register(require('@jsep-plugin/regex'));
expr.parse.plugins.register(require('@jsep-plugin/spread'));
expr.parse.plugins.register(require('@jsep-plugin/template'));
expr.parse.plugins.register(require('@jsep-plugin/ternary'));

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
  {expr: '@2',          expected: 'two' },
  {expr: '3#4',         expected: 3.4   },
  {expr: '(1 # 2 # 3)', expected: 1.5   }, // Fails with undefined precedence, see issue #45
  {expr: '1 + 2 ~ 3',   expected: 9     }, // ~ is * but with low precedence

  // Arrow Functions
  {expr: '[1,2].find(v => v === 2)',                     expected: 2                                  },
  {expr: 'list.reduce((sum, v) => sum + v, 0)',          expected: 15                                 },
  {expr: 'list.find(() => false)',                       expected: undefined                          },
  {expr: 'list.findIndex(v => v === 3)',                 expected: 2                                  },
  {expr: '[1].map(() => ({ a: 1 }))',                    expected: [{ a: 1 }]                         },
  {expr: '[[1, 2]].map([a, b] => a + b)',                expected: [3]                                },
  {expr: '[[1, 2]].map(([a, b] = []) => a+b)',           expected: [3]                                },
  {expr: '[[1,],undefined].map(([a=2, b=5]=[]) => a+b)', expected: [6, 7]                             },
  {expr: '[{a:1}].map(({a}) => a)',                      expected: [1]                                },
  {expr: '[undefined].map(({a=1}={}) => a)',             expected: [1]                                },
  {expr: '[1, 2].map((a, ...b) => [a, b])',              expected: [ [1, [0,[1,2]]], [2, [1,[1,2]]] ] },
  {expr: '[{a:1,b:2,c:3}].map(({a, ...b}) => [a, b])',   expected: [[1, {b:2,c:3}]]                   },
  {expr: '[{a:1}].map(({...foo}) => foo.a)',             expected: [1]                                },

  // assignment/update
  {expr: 'a = 2', expected: 2, context: {a: 1}, expObj: {a: 2}},
  {expr: 'a += 2', expected: 3, context: {a: 1}, expObj: {a: 3}},
  {expr: 'a++', expected: 1, context: {a: 1}, expObj: {a: 2}},
  {expr: '++a', expected: 2, context: {a: 1}, expObj: {a: 2}},
  {expr: 'a--', expected: 1, context: {a: 1}, expObj: {a: 0}},
  {expr: '--a', expected: 0, context: {a: 1}, expObj: {a: 0}},
  {expr: 'a[0] = 3', expected: 3, context: {a: [0, 0]}, expObj: {a: [3, 0]}},

  // new
  {expr: '(new Date(2021, 8)).getFullYear()',             expected: 2021                          },
  {expr: '(new sub.sub2["Date"](2021, 8)).getFullYear()', expected: 2021                          },
  {expr: 'new Date(2021, 8)',                             expected: new Date(2021, 8) },

  // object, spread
  {expr: '{ a: "a", one, [foo.bar]: 2 }', expected: { a: 'a', one: 1, baz: 2 }        },
  {expr: '{ a: "a", ...numMap }',         expected: { a: 'a', 10: 'ten', 3: 'three' } },
  {expr: '[7, ...list]',                  expected: [7,1,2,3,4,5]                     },
  {expr: 'func(1, ...list)',              expected: 17                                },

  // regex
  {expr: '/123/', expected: /123/ },
  {expr: '/a/ig', expected: /a/ig },

  // template literals
  {expr: '`abc`',                             expected: 'abc'               },
  {expr: '`hi ${foo.bar}`',                   expected: 'hi baz'            },
  {expr: 'tag`hi ${list[0]} and ${list[3]}`', expected: 'hi , and ,,=>,1,4' },
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
  func: function(...x) { return x.reduce((sum, v) => sum + v, 1); },
  isArray: Array.isArray,
  throw: () => { throw new Error('Should not be called.'); },
  Date,
  sub: { sub2: { Date } },
  tag: (strings, ...expand) => [...strings, '=>', ...expand].join(','),
  promise: (v) => Promise.resolve(v),
  Promise,
  asyncFunc: async (a, b) => await a + b,
  promiseFunc: (a, b) => new Promise((resolve, reject) => {
    setTimeout(() => resolve(a + b), 1000);
  }),
};

const cloneDeep = (obj) => {
  if (Array.isArray(obj)) {
    return [...obj];
  }
  const clone = {};
  Object.keys(obj)
    .forEach((k) => {
      clone[k] = typeof obj[k] === 'object' && obj[k] ? cloneDeep(obj[k]) : obj[k]
    });
  return clone;
}


expr.addUnaryOp('@', (a) => {
  if (a === 2) {
    return 'two';
  }
  throw new Error('Unexpected value: ' + a);
});

expr.addBinaryOp('#', (a, b) => a + b / 10);

expr.addBinaryOp('~', 1, (a, b) => a * b);

expr.addEvaluator('TestNodeType', function(node) { return node.test + this.context.string });

tape('sync', (t) => {
  const syncFixtures = [
    // async/await
    {expr: 'await 2', expected: Promise.resolve(2)},
    {expr: 'await Promise.resolve(3)', expected: Promise.resolve(3)},
    {expr: 'await asyncFunc(1, 2)', expected: Promise.resolve(3)},
    {expr: 'asyncFunc(1, 2)', expected: Promise.resolve(3)},
  ];

  [...fixtures, ...syncFixtures].forEach((o) => {
    const ctx = cloneDeep(o.context || context);
    const val = expr.compile(o.expr)(ctx);
    const compare = t[typeof o.expected === 'object' ? 'deepEqual' : 'equal'];
    compare(val, o.expected, `${o.expr} (${val}) === ${o.expected}`);
    if (o.expObj) {
      t.deepEqual(ctx, o.expObj, `${o.expr} (${JSON.stringify(ctx)}) === ${JSON.stringify(o.expObj)}`);
    }
  });

  const val = expr.eval.bind(null, { type: 'TestNodeType', test: 'testing ' })(context);
  t.equal(val, 'testing string');

  t.end();
});

tape('async', async (t) => {
  const asyncContext = context;
  const asyncFixtures = [
    {expr: 'asyncFunc(one, two)',   expected: 3},
    {expr: 'promiseFunc(one, two)', expected: 3},

    // async/await
    {expr: 'await 2', expected: 2},
    {expr: 'await Promise.resolve(3)', expected: 3},
    {expr: 'await asyncFunc(1, 2)', expected: 3},
    {expr: 'asyncFunc(1, 2)', expected: 3},
  ];

  for (let o of [...fixtures, ...asyncFixtures]) {
    const ctx = cloneDeep(o.context || asyncContext);
    const val = await expr.compileAsync(o.expr)(ctx);
    const compare = t[typeof o.expected === 'object' ? 'deepEqual' : 'equal'];
    compare(val, o.expected, `${o.expr} (${val}) === ${o.expected}`);
    if (o.expObj) {
      t.deepEqual(ctx, o.expObj, `${o.expr} (${JSON.stringify(ctx)}) === ${JSON.stringify(o.expObj)}`);
    }
  }

  const val = await expr.evalAsync.bind(null, { type: 'TestNodeType', test: 'testing ' })(context);
  t.equal(val, 'testing string');

  t.end();
});

tape('errors', async (t) => {
  const expectedMsg = /Access to member "\w+" disallowed/;
  t.throws(() => expr.compile(`o.__proto__`)({o: {}}), expectedMsg, '.__proto__');
  t.throws(() => expr.compile(`o.prototype`)({o: {}}), expectedMsg, '.prototype');
  t.throws(() => expr.compile(`o.constructor`)({o: {}}), expectedMsg, '.constructor');
  t.throws(() => expr.compile(`o['__proto__']`)({o: {}}), expectedMsg, '["__proto__"]');
  t.throws(() => expr.compile(`o['prototype']`)({o: {}}), expectedMsg, '["prototype"]');
  t.throws(() => expr.compile(`o['constructor']`)({o: {}}), expectedMsg, '["constructor"]');
  t.throws(() => expr.compile(`o[p]`)({o: {}, p: '__proto__'}), expectedMsg, '[~__proto__]');
  t.throws(() => expr.compile(`o[p]`)({o: {}, p: 'prototype'}), expectedMsg, '[~prototype]');
  t.throws(() => expr.compile(`o[p]`)({o: {}, p: 'constructor'}), expectedMsg, '[~constructor]');

  t.throws(() => expr.compile(`a.b`)({}), /Cannot read property 'b' of undefined/, 'b of undefined');
  t.throws(() => expr.compile(`a()`)({}), /'a' is not a function/, 'invalid function');
  t.throws(() => expr.compile(`a[b]()`)({a: 1, b: '2'}), /'b' is not a function/, 'invalid dynamic function');
  t.throws(() => expr.compile(`new a()`)({a: () => 1}), /not a constructor/, 'invalid new');
  t.throws(() => expr.compile('a:1')({a: 1}), /not a function/);

  try {
    await expr.compileAsync('Promise.reject(new Error("abcd"))')({ Promise, Error });
    t.throws(() => {});
  } catch (e) {
    t.throws(() => { throw e; }, /abcd/, 'async rejection');
  }
});
