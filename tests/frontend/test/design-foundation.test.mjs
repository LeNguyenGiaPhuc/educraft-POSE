import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const testDirectory = dirname(fileURLToPath(import.meta.url))
const repositoryRoot = join(testDirectory, '..', '..', '..')
const frontendRoot = join(repositoryRoot, 'frontend')
const foundationPath = join(frontendRoot, 'src', 'design-system', 'foundation.css')
const previewPath = join(frontendRoot, 'design-foundation-preview.html')

const requiredAssets = [
  'brand/craft-spark.svg',
  'brand/favicon.svg',
  'brand/logomark.svg',
  'brand/wordmark.svg',
  'illustrations/books.svg',
  'illustrations/calendar.svg',
  'illustrations/classroom.svg',
  'illustrations/curiosity.svg',
  'illustrations/excel.svg',
  'illustrations/notebook.svg',
  'illustrations/people.svg',
  'shapes/connected-action.svg',
  'shapes/folder.svg',
  'shapes/match.svg',
  'shapes/nest.svg',
  'shapes/note.svg',
  'shapes/plaque.svg',
  'shapes/spine.svg',
  'shapes/step.svg',
  'shapes/ticket.svg',
]

function hexToRgb(hex) {
  const value = Number.parseInt(hex.slice(1), 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

function relativeLuminance(hex) {
  return hexToRgb(hex)
    .map((channel) => channel / 255)
    .map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0)
}

function contrastRatio(foreground, background) {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background))
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background))
  return (lighter + 0.05) / (darker + 0.05)
}

function readColorTokens(css) {
  return Object.fromEntries(
    [...css.matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-f]{6})/gi)]
      .map((match) => [match[1], match[2]]),
  )
}

test('design foundation stays scoped away from the Student workspace', () => {
  assert.equal(existsSync(foundationPath), true, 'foundation.css must exist')
  const css = readFileSync(foundationPath, 'utf8')

  assert.match(css, /\.login-layout/)
  assert.match(css, /\.role-admin/)
  assert.match(css, /\.role-teacher/)
  assert.match(css, /\.ec-foundation-preview/)
  assert.doesNotMatch(css, /:root/)
  assert.doesNotMatch(css, /\.role-student/)

  const selectors = [...css.replaceAll(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{/g)]
    .map((match) => match[1].trim())
    .filter((selector) => !selector.startsWith('@'))
  assert.ok(selectors.length > 0)
  for (const selector of selectors) {
    assert.equal(
      selector.startsWith(':where(.login-layout,.role-admin,.role-teacher,.ec-foundation-preview)')
        || selector.startsWith(':where(.login-layout,.role-admin,.role-teacher)'),
      true,
      `unscoped selector: ${selector}`,
    )
  }
})

test('design foundation exposes the approved visual and accessibility tokens', () => {
  const css = readFileSync(foundationPath, 'utf8')

  for (const token of [
    '--ec-ink:#29264f',
    '--ec-iris:#5850be',
    '--ec-lavender:#dcd9fa',
    '--ec-matcha:#c6d8a1',
    '--ec-butter:#f4d476',
    '--ec-clay:#ebaf99',
    '--ec-paper:#f5f2eb',
    '--ec-focus:#5850be',
    '--ec-sidebar-width:256px',
    '--ec-sidebar-collapsed:76px',
    '--ec-topbar-height:76px',
  ]) {
    assert.equal(css.replaceAll(' ', '').includes(token), true, `missing token ${token}`)
  }

  assert.match(css, /Be Vietnam Pro/)
  assert.match(css, /\.story-brand/)
  assert.match(css, /\.brand-mark/)
  assert.match(css, /prefers-reduced-motion:\s*reduce/)
  assert.match(css, /:focus-visible/)

  for (const assetToken of [
    '--ec-asset-wordmark',
    '--ec-asset-logomark',
    '--ec-asset-craft-spark',
    '--ec-shape-nest',
    '--ec-shape-folder',
    '--ec-shape-ticket',
    '--ec-shape-step',
    '--ec-shape-plaque',
    '--ec-shape-spine',
    '--ec-shape-note',
    '--ec-shape-match',
    '--ec-shape-connected-action',
  ]) {
    assert.equal(css.includes(assetToken), true, `missing asset token ${assetToken}`)
  }
})

test('actual foundation tokens meet text and focus contrast requirements', () => {
  const css = readFileSync(foundationPath, 'utf8')
  const colors = readColorTokens(css)
  const combinations = [
    ['--ec-ink', '--ec-paper'],
    ['--ec-text-secondary', '--ec-surface'],
    ['--ec-surface', '--ec-iris'],
    ['--ec-success-text', '--ec-success-bg'],
    ['--ec-warning-text', '--ec-warning-bg'],
    ['--ec-info-text', '--ec-info-bg'],
    ['--ec-danger-text', '--ec-danger-bg'],
    ['--ec-neutral-text', '--ec-neutral-bg'],
    ['--ec-ink', '--ec-matcha'],
    ['--ec-ink', '--ec-butter'],
    ['--ec-ink', '--ec-clay'],
  ]

  for (const [foregroundToken, backgroundToken] of combinations) {
    const foreground = colors[foregroundToken]
    const background = colors[backgroundToken]
    assert.ok(
      contrastRatio(foreground, background) >= 4.5,
      `${foregroundToken} on ${backgroundToken} must meet 4.5:1`,
    )
  }

  assert.ok(contrastRatio(colors['--ec-focus'], colors['--ec-paper']) >= 3)
  assert.ok(contrastRatio(colors['--ec-focus'], colors['--ec-surface']) >= 3)
  assert.match(css, /outline:3px solid var\(--ec-focus\)/)
})

test('preview uses accessible text colors on brand surfaces', () => {
  const preview = readFileSync(previewPath, 'utf8')
  assert.match(preview, /\.color-swatch:not\(\.swatch-dark\) span\{color:var\(--ec-ink\)\}/)
  assert.match(preview, /\.geometry-grid p\{[^}]*color:var\(--ec-ink\)/)
})

test('geometry reserves content space and adapts its connectors on mobile', () => {
  const css = readFileSync(foundationPath, 'utf8')
  assert.match(css, /mask-composite:intersect/)
  assert.match(css, /\.ec-ticket\{[^}]*padding-right:38%/)
  assert.match(css, /\.ec-match::before/)
  assert.match(css, /\.ec-match-piece:first-child::after/)
  assert.match(css, /\.ec-match-piece:last-child::before/)
  assert.match(css, /\.ec-nest::after\{top:auto;right:18px;bottom:18px/)
})

test('preview and the complete approved SVG asset set are available locally', () => {
  assert.equal(existsSync(previewPath), true, 'the independent preview must exist')
  const preview = readFileSync(previewPath, 'utf8')
  assert.match(preview, /class="ec-foundation-preview"/)
  assert.match(preview, /foundation\.css/)

  for (const asset of requiredAssets) {
    const assetPath = join(frontendRoot, 'src', 'assets', 'educraft', asset)
    assert.equal(existsSync(assetPath), true, `missing local asset ${asset}`)
  }
})

test('the application imports the scoped foundation after the existing styles', () => {
  const entry = readFileSync(join(frontendRoot, 'src', 'main.tsx'), 'utf8')
  const roleStyles = entry.indexOf("import './role-refinement.css'")
  const foundationStyles = entry.indexOf("import './design-system/foundation.css'")

  assert.ok(roleStyles >= 0, 'role refinement import must remain')
  assert.ok(foundationStyles > roleStyles, 'foundation must load after role refinement')
})
