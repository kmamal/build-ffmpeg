const { execSync, execFileSync } = require('node:child_process')
const C = require('./common.js')

const toShellPath = (path) => C.platform === 'win32'
	? execFileSync('cygpath', [ '-u', path ], { encoding: 'utf8' }).trim()
	: path

const quote = (arg) => `'${arg.replaceAll("'", "'\\''")}'`

const run = (args, options = {}) => {
	const command = args.filter((x) => x !== undefined && x !== null && x !== false).map(quote).join(' ')
	console.log("run", command)
	execSync(command, {
		stdio: 'inherit',
		shell: C.platform === 'win32' ? 'bash' : '/bin/sh',
		...options,
	})
}

module.exports = { toShellPath, run }
