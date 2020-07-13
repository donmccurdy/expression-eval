import jsep from 'jsep';

declare type operand = number | string;
declare type unaryCallback = (a: operand) => operand;
declare type binaryCallback = (a: operand, b: operand) => operand;

declare function compile(expression: string | jsep.Expression): (context: object) => any;
declare function compileAsync(expression: string | jsep.Expression): (context: object) => Promise<any>;
declare function evaluate(node: jsep.Expression, context: object): any;
declare function evaluateAsync(node: jsep.Expression, context: object): Promise<any>;
declare function addUnaryOp(op: string, callback: unaryCallback): void;
declare function addBinaryOp(op: string, callback: binaryCallback): void;

export {
  compile,
  compileAsync,
  jsep as parse,
  evaluate as eval,
  evaluateAsync as evalAsync,
  addUnaryOp,
  addBinaryOp,
};
