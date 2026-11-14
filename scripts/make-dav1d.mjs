import Fs from 'node:fs'
import Path from 'node:path'
import C from './util/common.js'
import { toShellPath, run } from './util/shell.js'

const buildDir = Path.join(C.dir.build, 'dav1d')
const installDir = Path.join(C.dir.build, 'dav1d-install')

console.log("build dav1d in", buildDir)
await Fs.promises.rm(buildDir, { recursive: true }).catch(() => {})
await Fs.promises.rm(installDir, { recursive: true }).catch(() => {})
await Fs.promises.mkdir(buildDir, { recursive: true })

let crossFile
if (C.platform === 'darwin') {
	const cpu = C.targetArch === 'x64' ? 'x86_64' : 'aarch64'
	const archFlag = C.targetArch === 'x64' ? 'x86_64' : 'arm64'
	const minVersion = C.targetArch === 'x64' ? '10.13' : '11.0'
	crossFile = Path.join(C.dir.build, 'dav1d-cross.ini')
	await Fs.promises.writeFile(crossFile, [
		'[binaries]',
		`c = ['clang', '-arch', '${archFlag}', '-mmacosx-version-min=${minVersion}']`,
		`objc = ['clang', '-arch', '${archFlag}', '-mmacosx-version-min=${minVersion}']`,
		'ar = \'ar\'',
		'strip = \'strip\'',
		'nasm = \'nasm\'',
		'',
		'[built-in options]',
		`c_link_args = ['-arch', '${archFlag}', '-mmacosx-version-min=${minVersion}']`,
		'',
		'[host_machine]',
		'system = \'darwin\'',
		`cpu_family = '${cpu}'`,
		`cpu = '${cpu}'`,
		'endian = \'little\'',
		'',
	].join('\n'))
}

run([
	'meson',
	'setup',
	toShellPath(buildDir),
	toShellPath(C.dir.dav1d),
	`--prefix=${toShellPath(installDir)}`,
	'--libdir=lib',
	'--buildtype=release',
	'--default-library=static',
	'--backend=ninja',
	'-Db_staticpic=true',
	C.platform === 'win32' && '-Db_vscrt=mt',
	'-Denable_tools=false',
	'-Denable_examples=false',
	'-Denable_tests=false',
	'-Denable_docs=false',
	crossFile && `--cross-file=${toShellPath(crossFile)}`,
])

run([ 'meson', 'compile', '-C', toShellPath(buildDir) ])
run([ 'meson', 'install', '-C', toShellPath(buildDir) ])
