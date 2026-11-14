import Fs from 'node:fs'
import C from './util/common.js'

await Promise.all([
	C.dir.sources,
	C.dir.build,
	C.dir.dist,
	C.dir.publish,
].map(async (dir) => {
	await Fs.promises.rm(dir, { recursive: true }).catch(() => {})
}))

await import('./download-sources.mjs')
await import('./make-dav1d.mjs')
await import('./make-ffmpeg.mjs')
