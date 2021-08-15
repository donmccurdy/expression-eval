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

const evaluators: Record<string, (node: AnyExpression, context: Record<string, unknown>) => unknown> = {
  'ArrayExpression': function(node: jsep.ArrayExpression, context) {
    return evaluateArray(node.elements, context);
  },

  'BinaryExpression': function(node: jsep.BinaryExpression, context) {
    return binops[node.operator](evaluate(node.left, context), evaluate(node.right, context));
  },

  'CallExpression': function(node: jsep.CallExpression, context) {
    let caller, fn, assign;
    if (node.callee.type === 'MemberExpression') {
      assign = evaluateMember(node.callee as jsep.MemberExpression, context);
      caller = assign[0];
      fn = assign[1];
    } else {
      fn = evaluate(node.callee, context);
    }
    if (typeof fn !== 'function') { return undefined; }
    return fn.apply(caller, evaluateArray(node.arguments, context));
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

  'LogicalExpression': function(node: jsep.LogicalExpression, context) {
    if (node.operator === '||') {
      return evaluate(node.left, context) || evaluate(node.right, context);
    } else if (node.operator === '&&') {
      return evaluate(node.left, context) && evaluate(node.right, context);
    }
    return binops[node.operator](evaluate(node.left, context), evaluate(node.right, context));
  },

  'MemberExpression': function(node: jsep.MemberExpression, context) {
    return evaluateMember(node, context)[1];
  },

  'ThisExpression': function(node: jsep.ThisExpression, context) {
    return context;
  },

  'UnaryExpression': function(node: jsep.UnaryExpression, context) {
    return unops[node.operator](evaluate(node.argument, context));
  }
};

const evaluatorsAsync: Record<string, (node: AnyExpression, context: Record<string, unknown>) => unknown> = {
  'ArrayExpression': async function(node: jsep.ArrayExpression, context) {
    return await evaluateArrayAsync(node.elements, context);
  },

  'BinaryExpression': async function(node: jsep.BinaryExpression, context) {
    const [left, right] = await Promise.all([
      evalAsync(node.left, context),
      evalAsync(node.right, context)
    ]);
    return binops[node.operator](left, right);
  },

  'CallExpression': async function(node: jsep.CallExpression, context) {
    let caller, fn, assign;
    if (node.callee.type === 'MemberExpression') {
      assign = await evaluateMemberAsync(node.callee as jsep.MemberExpression, context);
      caller = assign[0];
      fn = assign[1];
    } else {
      fn = await evalAsync(node.callee, context);
    }
    if (typeof fn !== 'function') {
      return undefined;
    }
    return await fn.apply(
      caller,
      await evaluateArrayAsync(node.arguments, context)
    );
  },

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

  'LogicalExpression': async function(node: jsep.LogicalExpression, context) {
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
};

declare type operand = number | string;
declare type unaryCallback = (a: operand) => operand;
declare type binaryCallback = (a: operand, b: operand) => operand;

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

function evaluateArray(list, context) {
  return list.map(function (v) { return evaluate(v, context); });
}

async function evaluateArrayAsync(list, context) {
  const res = await Promise.all(list.map((v) => evalAsync(v, context)));
  return res;
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

function evaluate(_node: jsep.Expression, context: Record<string, unknown>) {

  const node = _node as AnyExpression;

  return node.type in evaluators
    ? evaluators[node.type](node, context)
    : undefined;
}

async function evalAsync(_node: jsep.Expression, context: Record<string, unknown>) {

  const node = _node as AnyExpression;

  return node.type in evaluatorsAsync
    ? evaluatorsAsync[node.type](node, context)
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

export {
  jsep as parse,
  evaluate as eval,
  evalAsync,
  compile,
  compileAsync,
  addUnaryOp,
  addBinaryOp
};
