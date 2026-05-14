const presets = [
  ['@babel/preset-typescript'],
  [
    '@babel/preset-env',
    {
      modules: false,
      targets: {
        esmodules: true,
      },
      bugfixes: true,
    },
  ],
];

module.exports = { presets };
