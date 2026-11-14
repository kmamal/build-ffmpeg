import Fs from 'node:fs'
import Os from 'node:os'
import Path from 'node:path'
import { execSync } from 'node:child_process'
import C from './util/common.js'
import { toShellPath, run } from './util/shell.js'

const dav1dDir = Path.join(C.dir.build, 'dav1d-install')

if (C.platform === 'win32') {
	await Fs.promises.cp(
		Path.join(dav1dDir, 'lib/libdav1d.a'),
		Path.join(dav1dDir, 'lib/dav1d.lib'),
	)
}

const platformFlags = []
if (C.platform === 'linux') {
	platformFlags.push('--enable-pthreads')
}
else if (C.platform === 'darwin') {
	const archFlag = C.targetArch === 'x64' ? 'x86_64' : 'arm64'
	const minVersion = C.targetArch === 'x64' ? '10.13' : '11.0'
	const flags = `-arch ${archFlag} -mmacosx-version-min=${minVersion}`
	platformFlags.push(
		'--enable-pthreads',
		'--install-name-dir=@rpath',
		`--extra-cflags=${flags}`,
		`--extra-ldflags=${flags}`,
	)
	if (C.targetArch !== C.arch) {
		platformFlags.push(
			'--enable-cross-compile',
			'--target-os=darwin',
			`--arch=${C.targetArch === 'x64' ? 'x86_64' : 'aarch64'}`,
		)
	}
}
else if (C.platform === 'win32') {
	platformFlags.push(
		'--toolchain=msvc',
		'--enable-w32threads',
		`--arch=${C.targetArch === 'x64' ? 'x86_64' : 'aarch64'}`,
	)
}

const configureFlags = (variant) => {
	const decoders = variant === 'full'
		? C.decoders
		: C.decoders.filter((name) => !C.patentedDecoders.includes(name))
	return [
		'--disable-everything',
		'--disable-autodetect',
		'--disable-programs',
		'--disable-doc',
		'--disable-debug',
		'--disable-static',
		'--enable-shared',
		'--enable-pic',
		'--disable-network',
		'--disable-avdevice',
		'--disable-avfilter',
		'--enable-swscale',
		'--enable-swresample',
		'--enable-libdav1d',
		'--pkg-config-flags=--static',
		`--enable-demuxer=${C.demuxers.join(',')}`,
		`--enable-decoder=${decoders.join(',')}`,
		`--enable-parser=${C.parsers.join(',')}`,
		`--enable-protocol=${C.protocols.join(',')}`,
		...platformFlags,
	]
}

const keepLibrary = {
	linux: (name) => name.includes('.so'),
	darwin: (name) => name.endsWith('.dylib'),
	win32: (name) => name.endsWith('.dll') || name.endsWith('.lib'),
}[C.platform]

const makeVariant = async (variant) => {
	const buildDir = Path.join(C.dir.build, `ffmpeg-${variant}`)
	const installDir = Path.join(C.dir.build, `ffmpeg-${variant}-install`)
	const distDir = Path.join(C.dir.dist, variant)

	console.log("configure", variant, "in", buildDir)
	await Fs.promises.rm(buildDir, { recursive: true }).catch(() => {})
	await Fs.promises.rm(installDir, { recursive: true }).catch(() => {})
	await Fs.promises.mkdir(buildDir, { recursive: true })

	const flags = configureFlags(variant)
	const env = {
		...process.env,
		PKG_CONFIG_PATH: [
			toShellPath(Path.join(dav1dDir, 'lib/pkgconfig')),
			process.env.PKG_CONFIG_PATH,
		].filter(Boolean).join(C.platform === 'win32' ? ':' : Path.delimiter),
	}

	run([
		`${toShellPath(C.dir.ffmpeg)}/configure`,
		`--prefix=${toShellPath(installDir)}`,
		...flags,
	], { cwd: buildDir, env })

	console.log("build", variant)
	run([ 'make', `-j${Os.availableParallelism()}` ], { cwd: buildDir, env })
	run([ 'make', 'install' ], { cwd: buildDir, env })

	console.log("assemble", variant, "in", distDir)
	await Fs.promises.rm(distDir, { recursive: true }).catch(() => {})
	await Fs.promises.mkdir(Path.join(distDir, 'lib'), { recursive: true })

	await Fs.promises.cp(
		Path.join(installDir, 'include'),
		Path.join(distDir, 'include'),
		{ recursive: true },
	)

	const libDirs = [ Path.join(installDir, 'lib'), Path.join(installDir, 'bin') ]
	for (const libDir of libDirs) {
		const names = await Fs.promises.readdir(libDir).catch(() => [])
		for (const name of names) {
			if (!keepLibrary(name)) { continue }
			const stats = await Fs.promises.lstat(Path.join(libDir, name))
			if (stats.isDirectory()) { continue }
			await Fs.promises.cp(
				Path.join(libDir, name),
				Path.join(distDir, 'lib', name),
				{ verbatimSymlinks: true },
			)
		}
	}

	if (C.platform === 'linux' || C.platform === 'darwin') {
		const names = await Fs.promises.readdir(Path.join(distDir, 'lib'))
		for (const name of names) {
			const path = Path.join(distDir, 'lib', name)
			const stats = await Fs.promises.lstat(path)
			if (stats.isSymbolicLink()) { continue }
			execSync(`strip ${C.platform === 'linux' ? '-s' : '-x'} "${path}"`)
		}
	}

	await Promise.all([
		Fs.promises.cp(
			Path.join(C.dir.ffmpeg, 'COPYING.LGPLv2.1'),
			Path.join(distDir, 'COPYING.LGPLv2.1'),
		),
		Fs.promises.cp(
			Path.join(C.dir.ffmpeg, 'LICENSE.md'),
			Path.join(distDir, 'LICENSE.FFmpeg.md'),
		),
		Fs.promises.cp(
			Path.join(C.dir.dav1d, 'COPYING'),
			Path.join(distDir, 'COPYING.dav1d'),
		),
		Fs.promises.writeFile(Path.join(distDir, 'SOURCE.md'), [
			`# FFmpeg ${C.version} (${variant})`,
			'',
			'These libraries are FFmpeg, licensed under the GNU Lesser General Public License version 2.1 or later (see `COPYING.LGPLv2.1` and `LICENSE.FFmpeg.md`).',
			`They include dav1d ${C.dav1dVersion}, licensed under the BSD 2-Clause License (see \`COPYING.dav1d\`).`,
			'',
			'## Source',
			'',
			`- FFmpeg: https://ffmpeg.org/releases/ffmpeg-${C.version}.tar.gz`,
			`- dav1d: https://github.com/videolan/dav1d/archive/refs/tags/${C.dav1dVersion}.tar.gz`,
			`- Build scripts: https://github.com/${C.owner}/${C.repo}/tree/v${C.version}`,
			'',
			'The sources are used unmodified.',
			'',
			'## Configuration',
			'',
			'```',
			`configure \\\n  ${flags.map((flag) => `'${flag}'`).join(' \\\n  ')}`,
			'```',
			'',
		].join('\n')),
	])
}

for (const variant of C.variants) {
	await makeVariant(variant)
}
