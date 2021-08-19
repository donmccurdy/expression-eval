import jsep from 'jsep';
import { ArrowExpression } from '@jsep/plugin-arrow';
import { UpdateExpression, AssignmentExpression } from '@jsep/plugin-assignment';
import { NewExpression } from '@jsep/plugin-new';
import { ObjectExpression, Property } from '@jsep/plugin-object';
import { SpreadElement } from '@jsep/plugin-spread';
import { TaggedTemplateExpression, TemplateElement, TemplateLiteral } from '@jsep/plugin-template';

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

const assignOps = {
  '=': function(obj, key, val) { return obj[key] = val; },
  '*=': function(obj, key, val) { return obj[key] *= val; },
  '**=': function(obj, key, val) { return obj[key] **= val; },
  '/=': function(obj, key, val) { return obj[key] /= val; },
  '%=': function(obj, key, val) { return obj[key] %= val; },
  '+=': function(obj, key, val) { return obj[key] += val; },
  '-=': function(obj, key, val) { return obj[key] -= val; },
  '<<=': function(obj, key, val) { return obj[key] <<= val; },
  '>>=': function(obj, key, val) { return obj[key] >>= val; },
  '>>>=': function(obj, key, val) { return obj[key] >>>= val; },
  '&=': function(obj, key, val) { return obj[key] &= val; },
  '^=': function(obj, key, val) { return obj[key] ^= val; },
  '|=': function(obj, key, val) { return obj[key] |= val; },
};

declare type Context = Record<string, unknown>;
declare type operand = number | string;
declare type unaryCallback = (a: operand) => operand;
declare type binaryCallback = (a: operand, b: operand) => operand;
declare type evaluatorCallback = (node: AnyExpression, context: Context) => unknown;

type AnyExpression = jsep.ArrayExpression
  | jsep.BinaryExpression
  | jsep.MemberExpression
  | jsep.CallExpression
  | jsep.ConditionalExpression
  | jsep.Identifier
  | jsep.Literal
  | jsep.LogicalExpression
  | jsep.ThisExpression
  | jsep.UnaryExpression
  | ArrowExpression
  | UpdateExpression
  | AssignmentExpression
  | NewExpression
  | ObjectExpression
  | Property
  | SpreadElement
  | TaggedTemplateExpression
  | TemplateLiteral
  | TemplateElement
  ;

const evaluators: Record<string, evaluatorCallback> = {
  'ArrayExpression': function(node: jsep.ArrayExpression, context) {
    return evaluateArraySync(node.elements, context);
  },

  'LogicalExpression': evaluateBinarySync,
  'BinaryExpression': evaluateBinarySync,

  'CallExpression': function(node: jsep.CallExpression, context) {
    const [fn, caller] = evaluateCallSync(node.callee, context);
    return fn.apply(caller, evaluateArraySync(node.arguments, context));
  },

  'ConditionalExpression': function(node: jsep.ConditionalExpression, context) {
    return evalSync(node.test, context)
      ? evalSync(node.consequent, context)
      : evalSync(node.alternate, context);
  },

  'Identifier': function(node: jsep.Identifier, context) {
    return context[node.name];
  },

  'Literal': function(node: jsep.Literal) {
    return node.value;
  },

  'MemberExpression': function(node: jsep.MemberExpression, context) {
    return evaluateMemberSync(node, context)[1];
  },

  'ThisExpression': function(node: jsep.ThisExpression, context) {
    return context;
  },

  'UnaryExpression': function(node: jsep.UnaryExpression, context) {
    return unops[node.operator](evalSync(node.argument, context));
  },

  'ArrowFunctionExpression': evalArrowFunctionExpression,

  'AssignmentExpression': evalAssignmentExpressionSync,

  'UpdateExpression': evalUpdateExpressionSync,

  'NewExpression': evalNewExpressionSync,

  'ObjectExpression': evalObjectExpressionSync,

  'SpreadElement': evalSpreadElementSync,

  'TaggedTemplateExpression': evalTaggedTemplateExpressionSync,

  'TemplateLiteral': evalTemplateLiteralSync
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

  'AssignmentExpression': evalAssignmentExpressionAsync,

  'UpdateExpression': evalUpdateExpressionAsync,

  'NewExpression': evalNewExpressionAsync,

  'ObjectExpression': evalObjectExpressionAsync,

  'SpreadElement': evalSpreadElementAsync,

  'TaggedTemplateExpression': evalTaggedTemplateExpressionAsync,

  'TemplateLiteral': evalTemplateLiteralAsync,
};

function evaluateArraySync(list: jsep.Expression[], context: Context): unknown[] {
  const res: any[] = list.map(v => evalSync(v, context));
  return res.reduce((arr, v, i) => {
    if ((list[i] as AnyExpression).type === 'SpreadElement') {
      return [...arr, ...v];
    }
    arr.push(v);
    return arr;
  }, []);
}

async function evaluateArrayAsync(list: jsep.Expression[], context: Context): Promise<unknown[]> {
  const res: any[] = await Promise.all(list.map(v => evalAsync(v, context)));
  return res.reduce((arr, v, i) => {
    if ((list[i] as AnyExpression).type === 'SpreadElement') {
      return [...arr, ...v];
    }
    arr.push(v);
    return arr;
  }, []);
}

function evaluateMemberSync(node: jsep.MemberExpression, context: Context) {
  const object = evalSync(node.object, context);
  let key: string;
  if (node.computed) {
    key = evalSync(node.property, context) as string;
  } else {
    key = (node.property as jsep.Identifier).name;
  }
  if (/^__proto__|prototype|constructor$/.test(key)) {
    throw Error(`Access to member "${key}" disallowed.`);
  }
  return [object, object[key], key];
}

async function evaluateMemberAsync(node: jsep.MemberExpression, context: Context) {
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
  return [object, object[key], key];
}

function evaluateBinarySync(node: jsep.BinaryExpression | jsep.LogicalExpression, context): unknown {
  if (node.operator === '||') {
    return evalSync(node.left, context) || evalSync(node.right, context);
  } else if (node.operator === '&&') {
    return evalSync(node.left, context) && evalSync(node.right, context);
  }
  const [left, right] = [evalSync(node.left, context), evalSync(node.right, context)];
  return binops[node.operator](left, right);
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

function evaluateCallSync(callee: jsep.Expression, context) {
  let caller, fn;
  if (callee.type === 'MemberExpression') {
    [caller, fn] = evaluateMemberSync(callee as jsep.MemberExpression, context);
  } else {
    fn = evalSync(callee, context);
  }
  if (typeof fn !== 'function') {
    throw new Error(`'${nodeFunctionName(callee as AnyExpression)}' is not a function`);
  }
  return [fn, caller];
}

async function evaluateCallAsync(callee: jsep.Expression, context) {
  let caller, fn;
  if (callee.type === 'MemberExpression') {
    [caller, fn] = await evaluateMemberAsync(callee as jsep.MemberExpression, context);
  } else {
    fn = await evalAsync(callee, context);
  }
  if (typeof fn !== 'function') {
    throw new Error(`'${nodeFunctionName(callee as AnyExpression)}' is not a function`);
  }
  return [fn, caller];
}

function evalArrowFunctionExpression(node: ArrowExpression, context: Context) {
  return (...arrowArgs) => {
    const arrowContext = evalArrowContext(node, context, arrowArgs);
    return evalSync(node.body, arrowContext);
  };
}

function evalArrowContext(node, context, arrowArgs): Context {
  const arrowContext = { ...context };

  ((node.params as AnyExpression[]) || []).forEach((param, i) => {
    // default value:
    if (param.type === 'AssignmentExpression') {
      if (arrowArgs[i] === undefined) {
        arrowArgs[i] = evalSync(param.right, context);
      }
      param = param.left as AnyExpression;
    }

    if (param.type === 'Identifier') {
      arrowContext[(param as jsep.Identifier).name] = arrowArgs[i];
    } else if (param.type === 'ArrayExpression') {
      // array destructuring
      (param.elements as AnyExpression[]).forEach((el, j) => {
        let val = arrowArgs[i][j];
        if (el.type === 'AssignmentExpression') {
          if (val === undefined) {
            // default value
            val = evalSync(el.right, context);
          }
          el = el.left as AnyExpression;
        }

        if (el.type === 'Identifier') {
          arrowContext[(el as jsep.Identifier).name] = val;
        } else {
          throw new Error('Unexpected arrow function argument');
        }
      });
    } else if (param.type === 'ObjectExpression') {
      // object destructuring
      const keys = [];
      (param.properties as AnyExpression[]).forEach((prop) => {
        let p = prop;
        if (p.type === 'AssignmentExpression') {
          p = p.left as AnyExpression;
        }

        let key;
        if (p.type === 'Property') {
          key = p.key.type === 'Identifier'
            ? (p.key as jsep.Identifier).name
            : evalSync(p.key, context).toString();
        } else if (p.type === 'Identifier') {
          key = p.name;
        } else if (p.type === 'SpreadElement' && p.argument.type === 'Identifier') {
          key = (p.argument as jsep.Identifier).name;
        } else {
          throw new Error('Unexpected arrow function argument');
        }

        let val = arrowArgs[i][key];
        if (p.type === 'SpreadElement') {
          // all remaining object properties. Copy arg obj, then delete from our copy
          val = { ...arrowArgs[i] };
          keys.forEach((k) => {
            delete val[k];
          });
        } else if (val === undefined && prop.type === 'AssignmentExpression') {
          // default value
          val = evalSync(prop.right, context);
        }

        arrowContext[key] = val;
        keys.push(key);
      });
    } else if (param.type === 'SpreadElement' && param.argument.type === 'Identifier') {
      const key = (param.argument as jsep.Identifier).name;
      arrowContext[key] = arrowArgs.slice(i);
    } else {
      throw new Error('Unexpected arrow function argument');
    }
  });
  return arrowContext;
}
// ArrowFunctionExpression not supported as automatic async

function evalAssignmentExpressionSync(node: AssignmentExpression, context: Context) {
  const [destObj, destKey] = getContextAndKeySync(node.left as AnyExpression, context);
  return assignOps[node.operator](destObj, destKey, evalSync(node.right, context));
}

async function evalAssignmentExpressionAsync(node: AssignmentExpression, context: Context) {
  const [destObj, destKey] = await getContextAndKeyAsync(node.left as AnyExpression, context);
  return assignOps[node.operator](destObj, destKey, await evalAsync(node.right, context));
}

function evalUpdateExpressionSync(node: UpdateExpression, context: Context) {
  const [destObj, destKey] = getContextAndKeySync(node.argument as AnyExpression, context);
  return evalUpdateOperation(node, destObj, destKey);
}

async function evalUpdateExpressionAsync(node: UpdateExpression, context: Context) {
  const [destObj, destKey] = await getContextAndKeyAsync(node.argument as AnyExpression, context);
  return evalUpdateOperation(node, destObj, destKey);
}

function evalUpdateOperation(node: UpdateExpression, destObj, destKey) {
  if (node.prefix) {
    return node.operator === '++'
      ? ++destObj[destKey]
      : --destObj[destKey];
  }
  return node.operator === '++'
    ? destObj[destKey]++
    : destObj[destKey]--;
}

function getContextAndKeySync(node: AnyExpression, context: Context) {
  if (node.type === 'MemberExpression') {
    const [obj, , key] = evaluateMemberSync(node, context);
    return [obj, key];
  } else if (node.type === 'Identifier') {
    return [context, node.name];
  } else if (node.type === 'ConditionalExpression') {
    return getContextAndKeySync(
      (evalSync(node.test, context)
        ? node.consequent
        : node.alternate) as AnyExpression,
      context);
  } else {
    throw new Error('Invalid Member Key');
  }
}

async function getContextAndKeyAsync(node: AnyExpression, context: Context) {
  if (node.type === 'MemberExpression') {
    const [obj, , key] = await evaluateMemberAsync(node, context);
    return [obj, key];
  } else if (node.type === 'Identifier') {
    return [context, node.name];
  } else if (node.type === 'ConditionalExpression') {
    return getContextAndKeyAsync(
      (await evalAsync(node.test, context)
        ? node.consequent
        : node.alternate) as AnyExpression,
      context);
  } else {
    throw new Error('Invalid Member Key');
  }
}

function evalNewExpressionSync(node: NewExpression, context: Context) {
  const [ctor] = evaluateCallSync(node.callee, context);
  const args = evaluateArraySync(node.arguments, context);
  return construct(ctor, args, node);
}

async function evalNewExpressionAsync(node: NewExpression, context: Context) {
  const [ctor] = await evaluateCallAsync(node.callee, context);
  const args = await evaluateArrayAsync(node.arguments, context);
  return construct(ctor, args, node);
}

function evalObjectExpressionSync(node: ObjectExpression, context: Context) {
  const obj = {};
  node.properties.map((prop: Property | SpreadElement) => {
    if (prop.type === 'SpreadElement') {
      Object.assign(obj, evalSync(prop.argument, context));
    } else if (prop.type === 'Property') {
      const key: string = prop.key.type === 'Identifier'
        ? (<jsep.Identifier>prop.key).name
        : evalSync(prop.key, context).toString()
      obj[key] = evalSync(prop.shorthand ? prop.key : prop.value, context);
    }
  });
  return obj;
}

async function evalObjectExpressionAsync(node: ObjectExpression, context: Context) {
  const obj = {};
  await Promise.all(node.properties.map(async (prop: Property | SpreadElement) => {
    if (prop.type === 'SpreadElement') {
      Object.assign(obj, evalSync(prop.argument, context));
    } else {
      const key: string = prop.key.type === 'Identifier'
        ? (<jsep.Identifier>prop.key).name
        : (await evalAsync(prop.key, context)).toString();
      obj[key] = await evalAsync(prop.shorthand? prop.key : prop.value, context);
    }
  }));
  return obj;
}

function evalSpreadElementSync(node: SpreadElement, context: Context) {
  return evalSync(node.argument, context);
}

async function evalSpreadElementAsync(node: SpreadElement, context: Context) {
  return evalAsync(node.argument, context);
}

function evalTaggedTemplateExpressionSync(node: TaggedTemplateExpression, context: Context) {
  const [fn, caller] = evaluateCallSync(node.tag, context);
  const args = [
    node.quasi.quasis.map(q => q.value.cooked),
    ...evaluateArraySync(node.quasi.expressions, context),
  ];
  return fn.apply(caller, args);
}

async function evalTaggedTemplateExpressionAsync(node: TaggedTemplateExpression, context: Context) {
  const [fn, caller] = await evaluateCallAsync(node.tag, context);
  const args = [
    node.quasi.quasis.map(q => q.value.cooked),
    ...(await evaluateArrayAsync(node.quasi.expressions, context)),
  ];
  return await fn.apply(caller, args);
}

function evalTemplateLiteralSync(node: TemplateLiteral, context: Context) {
  const expressions = evaluateArraySync(node.expressions, context);
  return node.quasis.reduce((str, q, i) => {
    str += q.value.cooked;
    if (!q.tail) {
      str += expressions[i];
    }
    return str;
  }, '');
}

async function evalTemplateLiteralAsync(node: TemplateLiteral, context: Context) {
  const expressions = await evaluateArrayAsync(node.expressions, context);
  return node.quasis.reduce((str, q, i) => {
    str += q.value.cooked;
    if (!q.tail) {
      str += expressions[i];
    }
    return str;
  }, '');
}

function construct(ctor, args, node) {
  try {
    return new (Function.prototype.bind.apply(ctor, [null].concat(args)))();
  } catch (e) {
    throw new Error(`${nodeFunctionName(node.callee)} is not a constructor`);
  }
}

function nodeFunctionName(callee: AnyExpression): string {
  return callee
    && ((callee as jsep.Identifier).name
      || ((callee as jsep.MemberExpression).property
        && ((callee as jsep.MemberExpression).property as jsep.Identifier).name));
}


function evalSync(_node: jsep.Expression, context: Context): unknown {
  const evaluator = evaluators[_node.type];
  return evaluator
    ? evaluator(_node as AnyExpression, context)
    : undefined;
}

async function evalAsync(_node: jsep.Expression, context: Context)
  : Promise<unknown> {
  const evaluator = evaluatorsAsync[_node.type];
  return evaluator
    ? evaluator(_node as AnyExpression, context)
    : undefined;
}

function compileSync(expression: string | jsep.Expression): (context: Context) => unknown {
  return evalSync.bind(null, jsep(expression));
}

function compileAsync(expression: string | jsep.Expression)
  : (context: Context) => Promise<unknown> {
  return evalAsync.bind(null, jsep(expression));
}

// Added functions to inject Custom Unary Operators (and override existing ones)
function addUnaryOp(operator: string, _function: unaryCallback): void {
  jsep.addUnaryOp(operator);
  unops[operator] = _function;
}

// Added functions to inject Custom Binary Operators (and override existing ones)
function addBinaryOp(
  operator: string,
  precedence_or_fn: number | binaryCallback,
  _function: binaryCallback)
  : void {
  if (_function) {
    jsep.addBinaryOp(operator, precedence_or_fn as number);
    binops[operator] = _function;
  } else {
    jsep.addBinaryOp(operator, DEFAULT_PRECEDENCE[operator] || 1);
    binops[operator] = precedence_or_fn;
  }
}

function addEvaluatorSync(nodeType: string, evaluator: evaluatorCallback): void {
  evaluators[nodeType] = evaluator;
}

function addEvaluatorAsync(nodeType: string, evaluator: evaluatorCallback): void {
  evaluatorsAsync[nodeType] = evaluator;
}

export {
  jsep,
  jsep as parse,
  evalSync,
  evalSync as eval,
  evalAsync,
  compileSync,
  compileSync as compile,
  compileAsync,
  addUnaryOp,
  addBinaryOp,
  addEvaluatorSync,
  addEvaluatorAsync,
};
