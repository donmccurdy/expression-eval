var jsep = require('jsep');

/**
 * Evaluation code from JSEP project, under MIT License.
 * Copyright (c) 2013 Stephen Oney, http://jsep.from.so/
 */

var binops = {
  '||':  function (a, b) { return a || b; },
  '&&':  function (a, b) { return a && b; },
  '|':   function (a, b) { return a | b; },
  '^':   function (a, b) { return a ^ b; },
  '&':   function (a, b) { return a & b; },
  '==':  function (a, b) { return a == b; }, // jshint ignore:line
  '!=':  function (a, b) { return a != b; }, // jshint ignore:line
  '===': function (a, b) { return a === b; },
  '!==': function (a, b) { return a !== b; },
  '<':   function (a, b) { return a < b; },
  '>':   function (a, b) { return a > b; },
  '<=':  function (a, b) { return a <= b; },
  '>=':  function (a, b) { return a >= b; },
  '<<':  function (a, b) { return a << b; },
  '>>':  function (a, b) { return a >> b; },
  '>>>': function (a, b) { return a >>> b; },
  '+':   function (a, b) { return a + b; },
  '-':   function (a, b) { return a - b; },
  '*':   function (a, b) { return a * b; },
  '/':   function (a, b) { return a / b; },
  '%':   function (a, b) { return a % b; }
};

var unops = {
  '-' :  function (a) { return -a; },
  '+' :  function (a) { return a; },
  '~' :  function (a) { return ~a; },
  '!' :  function (a) { return !a; },
};

function evaluate_array( list, context ) {
  return list.map( function(v,i,a) { return evaluate( v, context ); } );
}

function evaluate ( node, context ) {
  
  switch ( node.type ) {
    
    case 'ArrayExpression': 
      return evaluate_array( node.elements, context );
    
    case 'BinaryExpression':
      return binops[ node.operator ]( evaluate( node.left, context ), evaluate( node.right, context ) );

    case 'CallExpression':
      let fn = evaluate( node.callee, context );
      if ( typeof( fn ) === "function" ) {
        return fn.apply( null, evaluate_array( node.arguments, context ) );
      } else {
        return undefined;
      }
  
    case 'ConditionalExpression':
      if ( evaluate( node.test, context ) ) {
        return evaluate( node.consequent, context );
      } else {
        return evaluate( node.alternate, context );
      }

    case 'Identifier':
      return context[ node.name ];

    case 'Literal':
      return node.value;

    case 'LogicalExpression':
      return binops[ node.operator ]( evaluate( node.left, context ), evaluate( node.right, context ) );
  
    case 'MemberExpression':
      if ( node.computed ) {
        return evaluate(node.object, context)[evaluate(node.property, context)];
      } else {
        return evaluate(node.object, context)[node.property.name];
      }

    case 'ThisExpression':
      return context.this;

    case 'UnaryExpression':
      return unops[ node.operator ]( evaluate( node.argument, context ) );

    default:
      return undefined;
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
