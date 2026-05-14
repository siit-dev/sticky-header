const presets = [
  ['@babel/preset-typescript'],
  [
    '@babel/preset-env',
    {
      modules: false,
      bugfixes: true,
    },
  ],
];

module.exports = { presets };
