import Fs from 'node:fs'
import Path from 'node:path'
import Zlib from 'node:zlib'
import Stream from 'node:stream'
import C from './util/common.js'
import { unpackTar } from 'modern-tar/fs'

await Fs.promises.rm(C.dir.dist, { recursive: true }).catch(() => {})

await Promise.all(C.variants.map(async (variant) => {
	const url = `https://github.com/${C.owner}/${C.repo}/releases/download/v${C.version}/${C.assetName(variant)}`

	console.log("fetch", url)
	const response = await fetch(url)
	if (!response.ok) { throw new Error(`bad status code ${response.status}`) }

	const distDir = Path.join(C.dir.dist, variant)
	console.log("unpack to", distDir)
	await Fs.promises.mkdir(distDir, { recursive: true })
	await Stream.promises.pipeline(
		Stream.Readable.fromWeb(response.body),
		Zlib.createGunzip(),
		unpackTar(distDir),
	)
}))
