module.exports = {
	globDirectory: './',
	globPatterns: [
		'**/*.{json,html,wasm,js,png}'
	],
	swDest: 'sw.js',
	modifyURLPrefix: {
		'': '/Attendance/'
	},
	ignoreURLParametersMatching: [
		/^utm_/,
		/^fbclid$/
	]
};