var jsep = require('jsep');

/**
 * Evaluation code from JSEP project, under MIT License.
 * Copyright (c) 2013 Stephen Oney, http://jsep.from.so/
 */

var binops = {
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

var unops = {
  '-' : function(a) { return -a; },
  '+' : function(a) { return a; },
  '~' : function(a) { return ~a; },
  '!' : function(a) { return !a; },
};

function evaluate (node, context) {
  if(node.type === 'BinaryExpression') {
    return binops[node.operator](evaluate(node.left, context), evaluate(node.right, context));
  } else if(node.type === 'UnaryExpression') {
    return unops[node.operator](evaluate(node.argument, context));
  } else if (node.type === 'MemberExpression') {
    if (node.computed) {
      return evaluate(node.object, context)[evaluate(node.property, context)];
    } else {
      return evaluate(node.object, context)[node.property.name];
    }
  } else if (node.type === 'Identifier') {
    return context[node.name];
  } else if(node.type === 'Literal') {
    return node.value;
  }
}

function compile (expression) {
  return evaluate.bind(null, jsep(expression));
}

module.exports = {
  parse: jsep,
  eval: evaluate,
  compile: compile
};
