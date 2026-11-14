import Fs from 'node:fs'
import Path from 'node:path'
import Zlib from 'node:zlib'
import Stream from 'node:stream'
import { execFileSync } from 'node:child_process'
import C from './util/common.js'
import { unpackTar } from 'modern-tar/fs'

const download = async (url, dirPath) => {
	console.log("fetch", url)
	const response = await fetch(url)
	if (!response.ok) { throw new Error(`bad status code ${response.status}`) }

	console.log("unpack to", dirPath)
	await Fs.promises.rm(dirPath, { recursive: true }).catch(() => {})
	await Fs.promises.mkdir(dirPath, { recursive: true })
	await Stream.promises.pipeline(
		Stream.Readable.fromWeb(response.body),
		Zlib.createGunzip(),
		unpackTar(dirPath, { strip: 1 }),
	)
}

await Promise.all([
	download(`https://ffmpeg.org/releases/ffmpeg-${C.version}.tar.gz`, C.dir.ffmpeg),
	download(`https://github.com/videolan/dav1d/archive/refs/tags/${C.dav1dVersion}.tar.gz`, C.dir.dav1d),
])

console.log("apply dav1d.patch")
execFileSync('git', [ 'apply', Path.join(C.dir.root, 'dav1d.patch') ], {
	stdio: 'inherit',
	cwd: C.dir.dav1d,
})
