import { execSync } from 'node:child_process'

await import('./clean.mjs')

execSync('npm install', { stdio: 'inherit' })

await import('./build.mjs')
await import('./upload-release.mjs')
