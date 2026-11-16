import assert from 'node:assert/strict'
import { test } from 'node:test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(new URL('../../../frontend/package.json', import.meta.url))
const { loadConfigFromFile } = require('vite')

const currentFile = fileURLToPath(import.meta.url)
const frontendRoot = path.resolve(path.dirname(currentFile), '../../../frontend')

test('Vite dev server proxies API requests to the backend', async () => {
  const loaded = await loadConfigFromFile(
    { command: 'serve', mode: 'development' },
    path.join(frontendRoot, 'vite.config.ts'),
    frontendRoot
  )

  const proxy = loaded?.config.server?.proxy?.['/api']
  assert.ok(proxy, 'Expected a /api proxy in the Vite dev server configuration')
  assert.equal(proxy.target, 'http://localhost:4000')
})
