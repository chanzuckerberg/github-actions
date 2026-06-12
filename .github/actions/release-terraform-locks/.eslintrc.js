module.exports = {
  rules: {
    // The recursive backend-file walker uses a generator and for...of with
    // continue, which reads more clearly than array-method gymnastics here.
    'no-restricted-syntax': 'off',
    'no-continue': 'off',
  },
};
