module.exports = {
	globDirectory: './',
	globPatterns: [
		'**/*.{json,html,wasm,js,png}'
	],
	swDest: 'sw.js',
	ignoreURLParametersMatching: [
		/^utm_/,
		/^fbclid$/
	]
};