module.exports = {
  rules: {
    // The recursive cache-dir walker uses a generator and for...of, and the
    // fingerprint comparison reads clearly as a nested ternary.
    'no-restricted-syntax': 'off',
    'no-continue': 'off',
    'no-nested-ternary': 'off',
  },
};
