const path = require('path');

module.exports = {
  entry: './index.js',
  mode: 'production',
  output: {
    filename: 'expression-eval.min.js',
    path: path.resolve(__dirname, 'umd'),
    library: 'expressionEval',
    libraryTarget: 'umd'
  },
};