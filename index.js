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

function evaluate_member( node, context ) {
  const object = evaluate(node.object, context);
  if ( node.computed ) {
    return [object, object[evaluate(node.property, context)]];
  } else {
    return [object, object[node.property.name]];
  }
}

function evaluate ( node, context ) {
  
  switch ( node.type ) {
    
    case 'ArrayExpression': 
      return evaluate_array( node.elements, context );
    
    case 'BinaryExpression':
      return binops[ node.operator ]( evaluate( node.left, context ), evaluate( node.right, context ) );

    case 'CallExpression':
      let caller, fn;
      if (node.callee.type === 'MemberExpression') {
        [ caller, fn ] = evaluate_member( node.callee, context );
      } else {
        fn = evaluate( node.callee, context );
      }
      if ( typeof( fn ) === "function" ) {
        return fn.apply( caller, evaluate_array( node.arguments, context ) );
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
      return evaluate_member(node, context)[1];

    case 'ThisExpression':
      return this;

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
