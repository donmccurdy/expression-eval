import * as jsep from "jsep";

declare function compile(expression: string | jsep.Expression): any;
declare function evaluate(node: jsep.Expression, context: object): any;

export { compile, jsep as parse, evaluate as eval };
