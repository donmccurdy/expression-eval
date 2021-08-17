import jsep from 'jsep';

/**
 * Evaluation code from JSEP project, under MIT License.
 * Copyright (c) 2013 Stephen Oney, http://jsep.from.so/
 */

// Default operator precedence from https://github.com/EricSmekens/jsep/blob/master/src/jsep.js#L55
const DEFAULT_PRECEDENCE = {
  '||': 1,
  '&&': 2,
  '|': 3,
  '^': 4,
  '&': 5,
  '==': 6,
  '!=': 6,
  '===': 6,
  '!==': 6,
  '<': 7,
  '>': 7,
  '<=': 7,
  '>=': 7,
  '<<': 8,
  '>>': 8,
  '>>>': 8,
  '+': 9,
  '-': 9,
  '*': 10,
  '/': 10,
  '%': 10
};

const binops = {
  '||': function (a, b) { return a || b; },
  '&&': function (a, b) { return a && b; },
  '|': function (a, b) { return a | b; },
  '^': function (a, b) { return a ^ b; },
  '&': function (a, b) { return a & b; },
  '==': function (a, b) { return a == b; }, // jshint ignore:line
  '!=': function (a, b) { return a != b; }, // jshint ignore:line
  '===': function (a, b) { return a === b; },
  '!==': function (a, b) { return a !== b; },
  '<': function (a, b) { return a < b; },
  '>': function (a, b) { return a > b; },
  '<=': function (a, b) { return a <= b; },
  '>=': function (a, b) { return a >= b; },
  '<<': function (a, b) { return a << b; },
  '>>': function (a, b) { return a >> b; },
  '>>>': function (a, b) { return a >>> b; },
  '+': function (a, b) { return a + b; },
  '-': function (a, b) { return a - b; },
  '*': function (a, b) { return a * b; },
  '/': function (a, b) { return a / b; },
  '%': function (a, b) { return a % b; }
};

const unops = {
  '-': function (a) { return -a; },
  '+': function (a) { return +a; },
  '~': function (a) { return ~a; },
  '!': function (a) { return !a; },
};

declare type operand = number | string;
declare type unaryCallback = (a: operand) => operand;
declare type binaryCallback = (a: operand, b: operand) => operand;
declare type evaluatorCallback = (node: AnyExpression, context: Record<string, unknown>) => unknown;

type AnyExpression = jsep.ArrayExpression
  | jsep.BinaryExpression
  | jsep.MemberExpression
  | jsep.CallExpression
  | jsep.ConditionalExpression
  | jsep.Identifier
  | jsep.Literal
  | jsep.LogicalExpression
  | jsep.ThisExpression
  | jsep.UnaryExpression;

const evaluators: Record<string, evaluatorCallback> = {
  'ArrayExpression': function(node: jsep.ArrayExpression, context) {
    return evaluateArray(node.elements, context);
  },

  'LogicalExpression': evaluateBinary,
  'BinaryExpression': evaluateBinary,

  'CallExpression': function(node: jsep.CallExpression, context) {
    const [fn, caller] = evaluateCall(node.callee, context);
    return fn.apply(caller, evaluateArray(node.arguments, context));
  },

  'NewExpression': function(node: any, context) {
    const [ctor] = evaluateCall(node.callee, context);
    const args = evaluateArray(node.arguments, context);
    return construct(ctor, args, node);
  },

  'ArrowFunctionExpression': function(node: any, context) {
    const arrowContext = { ...context };
    return (...arrowArgs) => {
      (node.params || []).forEach((n, i) => {
        arrowContext[n.name] = arrowArgs[i];
      });
      return evaluate(node.body, arrowContext);
    }
  },

  'ConditionalExpression': function(node: jsep.ConditionalExpression, context) {
    return evaluate(node.test, context)
      ? evaluate(node.consequent, context)
      : evaluate(node.alternate, context);
  },

  'Identifier': function(node: jsep.Identifier, context) {
    return context[node.name];
  },

  'Literal': function(node: jsep.Literal) {
    return node.value;
  },

  'MemberExpression': function(node: jsep.MemberExpression, context) {
    return evaluateMember(node, context)[1];
  },

  'ThisExpression': function(node: jsep.ThisExpression, context) {
    return context;
  },

  'UnaryExpression': function(node: jsep.UnaryExpression, context) {
    return unops[node.operator](evaluate(node.argument, context));
  },

  'ObjectExpression': function(node: any, context) {
    const obj = {};
    node.properties.forEach((prop) => {
      if (prop.type === 'SpreadElement') {
        Object.assign(obj, evaluate(prop.argument, context));
      } else {
        const key: string = prop.key.type === 'Identifier'
          ? prop.key.name
          : evaluate(prop.key, context);
        const value = evaluate(prop.shorthand ? prop.key : prop.value, context);
        obj[key] = value;
      }
    });
    return obj;
  },

  'SpreadElement': function(node: any, context) {
    return evaluate(node.argument, context);
  },

  'TaggedTemplateExpression': function(node: any, context) {
    const [fn, caller] = evaluateCall(node.tag, context);
    const args = [
      node.quasi.quasis.map(q => q.value.cooked),
      ...evaluateArray(node.quasi.expressions, context),
    ];
    return fn.apply(caller, args);
  },

  'TemplateLiteral': function(node: any, context) {
    return node.quasis.reduce((str, q, i) => {
      str += q.value.cooked;
      if (!q.tail) {
        str += evaluate(node.expressions[i], context);
      }
      return str;
    }, '');
  },
};

const evaluatorsAsync: Record<string, evaluatorCallback> = {
  'ArrayExpression': async function(node: jsep.ArrayExpression, context) {
    return await evaluateArrayAsync(node.elements, context);
  },

  'LogicalExpression': evaluateBinaryAsync,
  'BinaryExpression': evaluateBinaryAsync,

  'CallExpression': async function(node: jsep.CallExpression, context) {
    const [fn, caller] = await evaluateCallAsync(node.callee, context);
    return await fn.apply(
      caller,
      await evaluateArrayAsync(node.arguments, context)
    );
  },

  'NewExpression': async function(node: any, context) {
    const [ctor] = await evaluateCallAsync(node.callee, context);
    const args = await evaluateArrayAsync(node.arguments, context);
    return construct(ctor, args, node);
  },

  // ArrowFunctionExpression not supported as automatic async

  'ConditionalExpression': async function(node: jsep.ConditionalExpression, context) {
    return (await evalAsync(node.test, context))
      ? await evalAsync(node.consequent, context)
      : await evalAsync(node.alternate, context);
  },

  'Identifier': async function(node: jsep.Identifier, context) {
    return context[node.name];
  },

  'Literal': async function(node: jsep.Literal) {
    return node.value;
  },

  'MemberExpression': async function(node: jsep.MemberExpression, context) {
    return (await evaluateMemberAsync(node, context))[1];
  },

  'ThisExpression': async function(node: jsep.ThisExpression, context) {
    return context;
  },

  'UnaryExpression': async function(node: jsep.UnaryExpression, context) {
    return unops[node.operator](await evalAsync(node.argument, context));
  },

  'ObjectExpression': async function(node: any, context) {
    const obj = {};
    await Promise.all(node.properties.map(async (prop) => {
      if (prop.type === 'SpreadElement') {
        Object.assign(obj, evaluate(prop.argument, context));
      } else {
        const key: string = prop.key.type === 'Identifier'
          ? prop.key.name
          : await evalAsync(prop.key, context);
        const value = await evalAsync(prop.shorthand? prop.key : prop.value, context);
        obj[key] = value;
      }
    }));
    return obj;
  },

  'SpreadElement': function(node: any, context) {
    return evalAsync(node.argument, context);
  },

  'TaggedTemplateExpression': async function(node: any, context) {
    const [fn, caller] = await evaluateCallAsync(node.tag, context);
    const args = [
      node.quasi.quasis.map(q => q.value.cooked),
      ...(await evaluateArrayAsync(node.quasi.expressions, context)),
    ];
    return await fn.apply(caller, args);
  },

  'TemplateLiteral': async function(node: any, context) {
    const expressions = await evaluateArrayAsync(node.expressions, context);
    return node.quasis.reduce((str, q, i) => {
      str += q.value.cooked;
      if (!q.tail) {
        str += expressions[i];
      }
      return str;
    }, '');
  },
};

function evaluateArray(list, context) {
  return list.reduce((arr, node) => {
    const val: any = evaluate(node, context);
    if (node.type === 'SpreadElement') {
      return [...arr, ...val];
    }
    arr.push(val);
    return arr;
  }, []);
}

async function evaluateArrayAsync(list, context) {
  const res: any[] = await Promise.all(list.map((v) => evalAsync(v, context)));
  return res.reduce((arr, v, i) => {
    if (list[i].type === 'SpreadElement') {
      return [...arr, ...v];
    }
    arr.push(v);
    return arr;
  }, []);
}

function evaluateMember(node: jsep.MemberExpression, context: Record<string, unknown>) {
  const object = evaluate(node.object, context);
  let key: string;
  if (node.computed) {
    key = evaluate(node.property, context) as string;
  } else {
    key = (node.property as jsep.Identifier).name;
  }
  if (/^__proto__|prototype|constructor$/.test(key)) {
    throw Error(`Access to member "${key}" disallowed.`);
  }
  return [object, object[key]];
}

async function evaluateMemberAsync(node: jsep.MemberExpression, context: Record<string, unknown>) {
  const object = await evalAsync(node.object, context);
  let key: string;
  if (node.computed) {
    key = await evalAsync(node.property, context) as string;
  } else {
    key = (node.property as jsep.Identifier).name;
  }
  if (/^__proto__|prototype|constructor$/.test(key)) {
    throw Error(`Access to member "${key}" disallowed.`);
  }
  return [object, object[key]];
}

function evaluateBinary(node: jsep.BinaryExpression | jsep.LogicalExpression, context): unknown {
  if (node.operator === '||') {
    return evaluate(node.left, context) || evaluate(node.right, context);
  } else if (node.operator === '&&') {
    return evaluate(node.left, context) && evaluate(node.right, context);
  }
  return binops[node.operator](evaluate(node.left, context), evaluate(node.right, context));
}

async function evaluateBinaryAsync(node: jsep.BinaryExpression | jsep.LogicalExpression, context) {
  if (node.operator === '||') {
    return (
      (await evalAsync(node.left, context)) ||
      (await evalAsync(node.right, context))
    );
  } else if (node.operator === '&&') {
    return (
      (await evalAsync(node.left, context)) &&
      (await evalAsync(node.right, context))
    );
  }

  const [left, right] = await Promise.all([
    evalAsync(node.left, context),
    evalAsync(node.right, context)
  ]);

  return binops[node.operator](left, right);
}

function evaluateCall(callee: jsep.Expression, context) {
  let caller, fn, assign;
  if (callee.type === 'MemberExpression') {
    assign = evaluateMember(callee as jsep.MemberExpression, context);
    caller = assign[0];
    fn = assign[1];
  } else {
    fn = evaluate(callee, context);
  }
  if (typeof fn !== 'function') {
    throw new Error(`'${nodeFunctionName(callee)}' is not a function`);
  }
  return [fn, caller];
}

async function evaluateCallAsync(callee: jsep.Expression, context) {
  let caller, fn, assign;
  if (callee.type === 'MemberExpression') {
    assign = await evaluateMemberAsync(callee as jsep.MemberExpression, context);
    caller = assign[0];
    fn = assign[1];
  } else {
    fn = await evalAsync(callee, context);
  }
  if (typeof fn !== 'function') {
    throw new Error(`'${nodeFunctionName(callee)}' is not a function`);
  }
  return [fn, caller];
}

function construct(ctor, args, node) {
  try {
    return new (Function.prototype.bind.apply(ctor, [null].concat(args)))();
  } catch (e) {
    throw new Error(`${nodeFunctionName(node.callee)} is not a constructor`);
  }
}

function nodeFunctionName(callee: any): string {
  return callee
    && (callee.name
      || (callee.property && callee.property.name));
}


function evaluate(_node: jsep.Expression, context: Record<string, unknown>): unknown {
  const evaluator = evaluators[_node.type];
  return evaluator
    ? evaluator(_node as AnyExpression, context)
    : undefined;
}

async function evalAsync(_node: jsep.Expression, context: Record<string, unknown>) {
  const evaluator = evaluatorsAsync[_node.type];
  return evaluator
    ? evaluator(_node as AnyExpression, context)
    : undefined;
}

function compile(expression: string | jsep.Expression): (context: Record<string, unknown>) => unknown {
  return evaluate.bind(null, jsep(expression));
}

function compileAsync(expression: string | jsep.Expression): (context: Record<string, unknown>) => Promise<unknown> {
  return evalAsync.bind(null, jsep(expression));
}

// Added functions to inject Custom Unary Operators (and override existing ones)
function addUnaryOp(operator: string, _function: unaryCallback): void {
  jsep.addUnaryOp(operator);
  unops[operator] = _function;
}

// Added functions to inject Custom Binary Operators (and override existing ones)
function addBinaryOp(operator: string, precedence_or_fn: number | binaryCallback, _function: binaryCallback): void {
  if (_function) {
    jsep.addBinaryOp(operator, precedence_or_fn as number);
    binops[operator] = _function;
  } else {
    jsep.addBinaryOp(operator, DEFAULT_PRECEDENCE[operator] || 1);
    binops[operator] = precedence_or_fn;
  }
}

function addEvaluator(nodeType: string, evaluator: evaluatorCallback): void {
  evaluators[nodeType] = evaluator;
}

function addEvaluatorAsync(nodeType: string, evaluator: evaluatorCallback): void {
  evaluatorsAsync[nodeType] = evaluator;
}

export {
  jsep as parse,
  evaluate as eval,
  evalAsync,
  compile,
  compileAsync,
  addUnaryOp,
  addBinaryOp,
  addEvaluator,
  addEvaluatorAsync,
};
