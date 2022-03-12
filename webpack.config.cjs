const path = require('path');

module.exports = {
  entry: path.resolve(__dirname, './src/app.js'),
  output: {
    filename: 'app.js',
    path: `${__dirname}/build`,
  },
  mode: 'production',
  target: 'node',
  resolve: {
    extensions: ['*', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['to-string-loader', 'css-loader'],
      },
      {
        test: /\.html$/i,
        loader: 'html-loader',
        options: {
          // Minimizing the html will strip the style tags.
          minimize: false,
        },
      },
    ],
  },
};
