"use strict";

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


function evaluate ( node, context ) {

  var saveThis = this;

  function evaluate_array( list ) {
    return list.map( function(v,i,a) { return valueOf( v ); } );
  }
  
  function valueOf( node ) {

    switch ( node.type ) {
      
      case 'ArrayExpression': 
        return evaluate_array( node.elements );
      
      case 'BinaryExpression':
        return binops[ node.operator ]( valueOf( node.left ), valueOf( node.right ) );
  
      case 'CallExpression':
        let args = evaluate_array( node.arguments );
        if ( node.callee.type === "MemberExpression" ) {
          let obj = valueOf( node.callee.object );
          let prop = 
            ( node.callee.computed === "true" 
            ? valueOf( node.callee.property ) 
            : node.callee.property.name );
          let test = obj;
          while ( test && ! test.hasOwnProperty( prop ) ) {
            test = test.__proto__;
          }
          if ( test ) {
            let fn = test[prop];
            if ( typeof( fn ) === "function" ) {
              let result = fn.apply( obj, args );
              return result;
            }
          }
          return undefined;
        } else {
          let fn = valueOf( node.callee );
          if ( typeof( fn ) === "function" )
            return fn.apply( saveThis, args );
          else
            return undefined;
        }
    
      case 'ConditionalExpression':
        if ( valueOf( node.test ) ) {
          return valueOf( node.consequent );
        } else {
          return valueOf( node.alternate );
        }
  
      case 'Identifier':
        return context[ node.name ];
  
      case 'Literal':
        return node.value;
  
      case 'LogicalExpression':
        return binops[ node.operator ]( valueOf( node.left ), valueOf( node.right ) );
    
      case 'MemberExpression':
        var object = valueOf( node.object );
        if ( object === null || object === undefined ) return undefined;
        var property;
        if ( node.computed ) 
          property = valueOf( node.property );
        else
          property = node.property.name
        return object[property];
  
      case 'ThisExpression':
        return saveThis;
  
      case 'UnaryExpression':
        return unops[ node.operator ]( valueOf( node.argument ) );
  
      default:
        return undefined;
    }

  }

  return valueOf( node );

}

function compile (expression) {
  return evaluate.bind(null, jsep(expression));
}

module.exports = {
  parse: jsep,
  eval: evaluate,
  compile: compile
};
