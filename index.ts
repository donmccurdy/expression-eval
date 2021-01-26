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

declare interface EvaluateOptions {
  implicitOptionalChaining?: boolean;
}

function evaluate(_node: jsep.Expression, context: object, options: EvaluateOptions = {}) {

  function evaluateArray(list) {
    return list.map(function (v) { return evaluateNode(v); });
  }

  function evaluateMember(node: jsep.MemberExpression) {
    const object = evaluateNode(node.object);
    if (node.computed) {
      return [object, object[evaluateNode(node.property)]];
    } else {
      const name = (node.property as jsep.Identifier).name;
      return [object, options.implicitOptionalChaining ? object?.[name] : object[name]]
    }
  }

  function evaluateNode(_jsepNode: jsep.Expression) {

    const node = _jsepNode as AnyExpression;

    switch (node.type) {

      case 'ArrayExpression':
        return evaluateArray(node.elements);

      case 'BinaryExpression':
        return binops[node.operator](evaluateNode(node.left), evaluateNode(node.right));

      case 'CallExpression':
        let caller, fn, assign;
        if (node.callee.type === 'MemberExpression') {
          assign = evaluateMember(node.callee as jsep.MemberExpression);
          caller = assign[0];
          fn = assign[1];
        } else {
          fn = evaluateNode(node.callee);
        }
        if (typeof fn !== 'function') { return undefined; }
        return fn.apply(caller, evaluateArray(node.arguments));

      case 'ConditionalExpression':
        return evaluateNode(node.test)
          ? evaluateNode(node.consequent)
          : evaluateNode(node.alternate);

      case 'Identifier':
        return context[node.name];

      case 'Literal':
        return node.value;

      case 'LogicalExpression':
        if (node.operator === '||') {
          return evaluateNode(node.left) || evaluateNode(node.right);
        } else if (node.operator === '&&') {
          return evaluateNode(node.left) && evaluateNode(node.right);
        }
        return binops[node.operator](evaluateNode(node.left), evaluateNode(node.right));

      case 'MemberExpression':
        return evaluateMember(node)[1];

      case 'ThisExpression':
        return context;

      case 'UnaryExpression':
        return unops[node.operator](evaluateNode(node.argument));

      default:
        return undefined;
    }
  }

  return evaluateNode(_node);
}

async function evalAsync(_node: jsep.Expression, context: object, options: EvaluateOptions = {}) {

  async function evaluateArrayAsync(list) {
    const res = await Promise.all(list.map((v) => evalAsyncNode(v)));
    return res;
  }

  async function evaluateMemberAsync(node: jsep.MemberExpression) {
    const object = await evalAsyncNode(node.object);
    if (node.computed) {
      return [object, object[await evalAsyncNode(node.property)]];
    } else {
      const name = (node.property as jsep.Identifier).name;
      return [object, options.implicitOptionalChaining ? object?.[name] : object[name]]
    }
  }

  async function evalAsyncNode(jsepNode: jsep.Expression) {
    const node = jsepNode as AnyExpression;

    // Brackets used for some case blocks here, to avoid edge cases related to variable hoisting.
    // See: https://stackoverflow.com/questions/57759348/const-and-let-variable-shadowing-in-a-switch-statement
    switch (node.type) {

      case 'ArrayExpression':
        return await evaluateArrayAsync(node.elements);

      case 'BinaryExpression': {
        const [left, right] = await Promise.all([
          evalAsyncNode(node.left),
          evalAsyncNode(node.right)
        ]);
        return binops[node.operator](left, right);
      }

      case 'CallExpression': {
        let caller, fn, assign;
        if (node.callee.type === 'MemberExpression') {
          assign = await evaluateMemberAsync(node.callee as jsep.MemberExpression);
          caller = assign[0];
          fn = assign[1];
        } else {
          fn = await evalAsyncNode(node.callee);
        }
        if (typeof fn !== 'function') {
          return undefined;
        }
        return await fn.apply(
          caller,
          await evaluateArrayAsync(node.arguments)
        );
      }

      case 'ConditionalExpression':
        return (await evalAsyncNode(node.test))
          ? await evalAsyncNode(node.consequent)
          : await evalAsyncNode(node.alternate);

      case 'Identifier':
        return context[node.name];

      case 'Literal':
        return node.value;

      case 'LogicalExpression': {
        if (node.operator === '||') {
          return (
            (await evalAsyncNode(node.left)) ||
            (await evalAsyncNode(node.right))
          );
        } else if (node.operator === '&&') {
          return (
            (await evalAsyncNode(node.left)) &&
            (await evalAsyncNode(node.right))
          );
        }

        const [left, right] = await Promise.all([
          evalAsyncNode(node.left),
          evalAsyncNode(node.right)
        ]);

        return binops[node.operator](left, right);
      }

      case 'MemberExpression':
        return (await evaluateMemberAsync(node))[1];

      case 'ThisExpression':
        return context;

      case 'UnaryExpression':
        return unops[node.operator](await evalAsyncNode(node.argument));

      default:
        return undefined;
    }
  }

  return evalAsyncNode(_node);
}

function compile(expression: string | jsep.Expression): (context: object, options: EvaluateOptions) => any {
  return evaluate.bind(null, jsep(expression));
}

function compileAsync(expression: string | jsep.Expression): (context: object, options: EvaluateOptions) => Promise<any> {
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
