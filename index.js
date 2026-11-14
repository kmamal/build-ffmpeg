const Path = require('node:path')

module.exports = {
	full: Path.join(__dirname, 'dist/full'),
	free: Path.join(__dirname, 'dist/free'),
}
