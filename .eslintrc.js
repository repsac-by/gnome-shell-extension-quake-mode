'use strict';

/* eslint-env node */
module.exports = {
	root: true,
	parserOptions: {
		sourceType: 'script',
	},
	env: {
		'es2017': true,
	},
	globals: {
		global: "readonly",
		imports: "readonly",
		log: "readonly",
	},
	extends: 'eslint:recommended',
	rules: {
		'indent': [ 1, 'tab' ],
		'quotes': [ 0, 'double', 'avoid-escape' ],
		'linebreak-style': [ 1, 'unix' ],
		'newline-after-var': [ 0, 'always' ],
		'semi': [ 1, 'always' ],
		'operator-assignment': [ 1, 'always' ],
		'block-spacing': [ 1, 'always' ],
		'operator-linebreak': [ 1, 'before' ],
		'constructor-super': 1,
		'no-console': 0,
		'no-unused-vars': 1,
		'no-trailing-spaces': 1,
		'keyword-spacing': 1,
		'camelcase': 0,
		'no-extra-semi': 1,
		'strict': [ 1, 'global' ],
		'comma-dangle': [ 1, 'only-multiline' ],
		'no-else-return': 1,
		'yield-star-spacing': [ 1, 'after' ],
		'no-mixed-spaces-and-tabs': [ 1, 'smart-tabs' ],
		'array-bracket-spacing': [ 1, 'always' ],
		'object-curly-spacing': [ 1, 'always' ],
		'space-in-parens': 1,
	}
};
