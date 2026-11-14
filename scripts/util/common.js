const Fs = require('node:fs')
const Path = require('node:path')

const dir = {}
dir.root = Path.resolve(__dirname, '../..')
dir.sources = Path.join(dir.root, 'sources')
dir.ffmpeg = Path.join(dir.sources, 'ffmpeg')
dir.dav1d = Path.join(dir.sources, 'dav1d')
dir.build = Path.join(dir.root, 'build')
dir.dist = Path.join(dir.root, 'dist')
dir.publish = Path.join(dir.root, 'publish')

const pkgPath = Path.join(dir.root, 'package.json')
const pkg = JSON.parse(Fs.readFileSync(pkgPath).toString())
// The package version is the upstream version plus a "-N" packaging suffix
const hyphenIndex = pkg.version.indexOf('-')
const version = hyphenIndex === -1 ? pkg.version : pkg.version.slice(0, hyphenIndex)
const dav1dVersion = pkg.config.dav1d
const [ , owner, repo ] = pkg.repository.url.match(/([^/:]+)\/([^/]+)\.git$/u)

const isSet = (value) => ![ undefined, '', '0', 'false' ].includes(value)
const fromSource = isSet(process.env.BUILD_FFMPEG_FROM_SOURCE)

const { platform, arch } = process
const targetArch = process.env.CROSS_COMPILE_ARCH || arch

const variants = [ 'full', 'free' ]
const assetName = (variant) => `FFmpeg-v${version}-${variant}-${platform}-${targetArch}.tar.gz`

const demuxers = [
	'mov',
	'matroska',
	'ogg',
	'wav',
	'aiff',
	'mp3',
	'flac',
	'aac',
]

const patentedDecoders = [
	'h264',
	'hevc',
	'aac',
]

const decoders = [
	'vp8',
	'vp9',
	'theora',
	'libdav1d',
	'opus',
	'vorbis',
	'flac',
	'mp3',
	'mp3float',
	'pcm_u8',
	'pcm_s8',
	'pcm_s16le',
	'pcm_s16be',
	'pcm_s24le',
	'pcm_s24be',
	'pcm_s32le',
	'pcm_s32be',
	'pcm_f32le',
	'pcm_f32be',
	'pcm_f64le',
	'pcm_f64be',
	'pcm_alaw',
	'pcm_mulaw',
	...patentedDecoders,
]

const parsers = [
	'vp8',
	'vp9',
	'vp3',
	'av1',
	'h264',
	'hevc',
	'opus',
	'vorbis',
	'flac',
	'mpegaudio',
	'aac',
]

const protocols = [ 'file' ]

module.exports = {
	dir,
	version,
	isPrerelease: false,
	dav1dVersion,
	fromSource,
	owner,
	repo,
	platform,
	arch,
	targetArch,
	variants,
	assetName,
	demuxers,
	decoders,
	patentedDecoders,
	parsers,
	protocols,
}
