module.exports = function (api) {
  const testing = api.env('test');
  return testing
    ? {
        presets: ['module:@react-native/babel-preset'],
        plugins: ['@babel/plugin-transform-dynamic-import'],
      }
    : { presets: ['babel-preset-expo'] };
};
