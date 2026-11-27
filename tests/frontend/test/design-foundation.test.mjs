import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const testDirectory = dirname(fileURLToPath(import.meta.url))
const repositoryRoot = join(testDirectory, '..', '..', '..')
const frontendRoot = join(repositoryRoot, 'frontend')
const foundationPath = join(frontendRoot, 'src', 'design-system', 'foundation.css')
const sharedShellPath = join(frontendRoot, 'src', 'design-system', 'shared-shell.css')
const coreComponentsPath = join(frontendRoot, 'src', 'design-system', 'core-components.css')
const corePreviewPath = join(frontendRoot, 'src', 'design-system', 'core-preview.css')
const corePreviewSourcePath = join(frontendRoot, 'src', 'design-system', 'core-preview.tsx')
const authStylesPath = join(frontendRoot, 'src', 'design-system', 'auth.css')
const teacherDashboardStylesPath = join(frontendRoot, 'src', 'features', 'teacher', 'overview', 'teacher-dashboard.css')
const teacherDashboardPagePath = join(frontendRoot, 'src', 'features', 'teacher', 'overview', 'TeacherOverviewPage.tsx')
const teacherInsightsStylesPath = join(frontendRoot, 'src', 'features', 'teacher', 'insights', 'insights.css')
const teacherStudioStylesPath = join(frontendRoot, 'src', 'features', 'teacher', 'teacher-studio.css')
const teacherRoutesPath = join(frontendRoot, 'src', 'features', 'teacher', 'routes.tsx')
const roleLayoutPath = join(frontendRoot, 'src', 'components', 'RoleLayout.tsx')
const modalShellPath = join(frontendRoot, 'src', 'design-system', 'ModalShell.tsx')
const previewPath = join(frontendRoot, 'design-foundation-preview.html')

const requiredAssets = [
  'brand/craft-spark.svg',
  'brand/favicon.svg',
  'brand/logomark.svg',
  'brand/wordmark.svg',
  'brand/wordmark-only.svg',
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
  'shapes/nest-mask.svg',
]

const requiredFonts = [
  'BeVietnamPro-Regular.ttf',
  'BeVietnamPro-SemiBold.ttf',
  'BeVietnamPro-Bold.ttf',
  'BeVietnamPro-ExtraBold.ttf',
  'OFL.txt',
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

test('Be Vietnam Pro is self-hosted with the official license and Vietnamese glyph source', () => {
  const css = readFileSync(foundationPath, 'utf8')

  for (const asset of requiredFonts) {
    assert.equal(existsSync(join(frontendRoot, 'src', 'assets', 'educraft', 'fonts', asset)), true, `missing font asset ${asset}`)
  }
  assert.match(css, /@font-face\{font-family:"Be Vietnam Pro";font-style:normal;font-weight:400/)
  assert.match(css, /BeVietnamPro-Regular\.ttf/)
  assert.match(css, /font-weight:600/)
  assert.match(css, /font-weight:700/)
  assert.match(css, /font-weight:800/)
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

test('visual refinement keeps the Nest curved and aligns Craft Match on one axis', () => {
  const foundation = readFileSync(foundationPath, 'utf8')
  const components = readFileSync(coreComponentsPath, 'utf8')

  assert.match(foundation, /--ec-shape-nest-mask:url\('\.\.\/assets\/educraft\/shapes\/nest-mask\.svg'\)/)
  assert.match(components, /\.ec-nest::before\{[^}]*mask:var\(--ec-shape-nest-mask\)/)
  assert.doesNotMatch(components, /\.ec-nest::before\{[^}]*clip-path:polygon/)
  assert.match(components, /\.ec-nest-body\{[^}]*position:relative[^}]*z-index:1/)
  assert.match(foundation, /--ec-match-connector-size:36px/)
  assert.match(components, /\.ec-match-piece:first-child::after\{[^}]*right:auto[^}]*left:calc\(50% - var\(--ec-match-connector-size\) \/ 2\)/)
  assert.match(components, /\.ec-match-piece:last-child::before\{[^}]*left:calc\(50% - var\(--ec-match-connector-size\) \/ 2\)/)
})

test('visual refinement floats only the desktop managed sidebar', () => {
  const css = readFileSync(sharedShellPath, 'utf8')

  assert.match(css, /@media\(min-width:1024px\)/)
  assert.match(css, /inset:10px auto 10px 10px/)
  assert.match(css, /border-radius:26px/)
  assert.match(css, /margin-left:calc\(var\(--ec-sidebar-width\) \+ 20px\)/)
  assert.doesNotMatch(css, /\.managed-shell:not\(\.sidebar-collapsed\) \.nav-link\.active\{[^}]*margin-right:-10px/)
  assert.match(css, /\.managed-shell \.sidebar \.nav-link:focus-visible\{outline-offset:-4px\}/)
  assert.match(css, /@media\(max-width:760px\)[\s\S]*inset:0 auto 0 0/)
  assert.match(css, /@media\(max-width:760px\)[\s\S]*border-radius:0/)
})

test('visual refinement contains preview content and preserves component identity', () => {
  const preview = readFileSync(previewPath, 'utf8')
  const previewCss = readFileSync(corePreviewPath, 'utf8')
  const components = readFileSync(coreComponentsPath, 'utf8')
  const previewSource = readFileSync(corePreviewSourcePath, 'utf8')
  const roleLayout = readFileSync(roleLayoutPath, 'utf8')
  const modalShell = readFileSync(modalShellPath, 'utf8')

  assert.match(preview, /\.preview-note\{[^}]*display:grid/)
  assert.match(preview, /\.preview-note-body/)
  assert.match(previewCss, /\.ec-preview-breadcrumb\{[^}]*min-width:0[^}]*overflow-wrap:break-word/)
  assert.match(previewCss, /\.ec-shell-specimen \.sidebar\{[^}]*max-width:calc\(100% - 16px\)/)
  assert.match(previewCss, /\.ec-preview-components\{[^}]*max-width:100%/)
  assert.match(previewCss, /\.ec-preview-components\{[^}]*min-width:0/)
  assert.match(previewCss, /@media\(max-width:767px\)\{[^}]*\.ec-shell-specimen\{min-height:480px;height:auto/)
  assert.match(components, /\.ec-notebook::before/)
  assert.match(components, /\.ec-action-primary \.ec-action-mark::before/)
  assert.match(previewSource, /event\.key === 'Escape'/)
  assert.match(previewSource, /previousFocus\?\.focus\(\)/)
  assert.match(previewSource, /offsetParent !== null/)
  assert.match(roleLayout, /offsetParent !== null/)
  assert.match(modalShell, /queueMicrotask\(\(\) => previousFocus\?\.focus\(\)\)/)
})

test('Phase 03 follow-ups reserve mobile topbar and Nest content regions', () => {
  const shellCss = readFileSync(sharedShellPath, 'utf8')
  const previewCss = readFileSync(corePreviewPath, 'utf8')
  const previewSource = readFileSync(corePreviewSourcePath, 'utf8')
  const components = readFileSync(coreComponentsPath, 'utf8')

  assert.match(shellCss, /@media\(max-width:760px\)[\s\S]*\.managed-shell \.topbar\{[^}]*display:grid[^}]*grid-template-columns:auto minmax\(0,1fr\) auto/)
  assert.match(previewCss, /@media\(max-width:767px\)[\s\S]*\.ec-shell-specimen \.topbar\{[^}]*display:grid[^}]*grid-template-columns:auto minmax\(0,1fr\)/)
  assert.match(previewSource, /className="ec-geometry ec-nest"><div className="ec-nest-body">/)
  assert.match(components, /@media\(max-width:767px\)[\s\S]*\.ec-nest\{[^}]*padding-inline-end:78px/)
})

test('Phase 03 Auth uses the approved split composition and shared controls', () => {
  assert.equal(existsSync(authStylesPath), true, 'the scoped Auth stylesheet must exist')
  const authCss = readFileSync(authStylesPath, 'utf8')
  const components = readFileSync(coreComponentsPath, 'utf8')
  const entry = readFileSync(join(frontendRoot, 'src', 'main.tsx'), 'utf8')

  assert.match(authCss, /\.auth-story\{[^}]*background:var\(--ec-ink\)/)
  assert.match(authCss, /@media\(min-width:1024px\)[\s\S]*grid-template-columns:/)
  assert.match(authCss, /\.auth-panel\{[^}]*background:var\(--ec-paper\)/)
  assert.match(authCss, /\.auth-story\{[^}]*border-radius:/)
  assert.match(components, /:where\(\.login-layout,\.role-admin,\.role-teacher,\.ec-foundation-preview\) \.ec-field/)
  assert.match(components, /:where\(\.login-layout,\.role-admin,\.role-teacher,\.ec-foundation-preview\) \.ec-action/)
  assert.ok(entry.indexOf("import './design-system/auth.css'") > entry.indexOf("import './design-system/core-components.css'"))
})

test('Phase 03 final polish uses a complete wordmark-only asset without CSS cropping', () => {
  const authCss = readFileSync(authStylesPath, 'utf8')
  const loginStory = readFileSync(join(frontendRoot, 'src', 'components', 'auth', 'LoginStory.tsx'), 'utf8')
  const wordmark = readFileSync(join(frontendRoot, 'src', 'assets', 'educraft', 'brand', 'wordmark-only.svg'), 'utf8')

  assert.match(loginStory, /wordmark-only\.svg/)
  assert.doesNotMatch(loginStory, /auth-wordmark-clip/)
  assert.doesNotMatch(authCss, /auth-wordmark-clip|translateX\(/)
  assert.match(wordmark, />educraft\.<\/text>/)
  assert.doesNotMatch(wordmark, /<rect|<path/)
})

test('Phase 04A scopes the Living Studio bento to Teacher and protects narrow layouts', () => {
  assert.equal(existsSync(teacherDashboardStylesPath), true, 'Teacher Dashboard stylesheet must exist')
  const css = readFileSync(teacherDashboardStylesPath, 'utf8')
  const page = readFileSync(teacherDashboardPagePath, 'utf8')

  assert.match(page, /TeacherDashboardLoading/)
  assert.match(page, /TeacherDashboardError/)
  assert.match(page, /TeacherDashboardContent/)
  assert.match(css, /\.role-teacher \.td-bento\{[^}]*display:grid/)
  assert.match(css, /\.role-teacher \.td-review-card\{[^}]*grid-area:review/)
  assert.match(css, /@media\(max-width:767px\)[\s\S]*\.role-teacher \.td-bento\{grid-template-columns:1fr/)
  assert.match(css, /@media\(max-width:420px\)[\s\S]*\.role-teacher \.td-review-card/)
  assert.doesNotMatch(css, /overflow-x\s*:\s*hidden/)
})

test('Phase 04A state fixtures stay outside the production application entry', () => {
  const previewHtmlPath = join(frontendRoot, 'teacher-dashboard-preview.html')
  const previewEntryPath = join(frontendRoot, 'src', 'features', 'teacher', 'overview', 'teacher-dashboard-preview.tsx')
  const mainEntry = readFileSync(join(frontendRoot, 'src', 'main.tsx'), 'utf8')

  assert.equal(existsSync(previewHtmlPath), true)
  assert.equal(existsSync(previewEntryPath), true)
  assert.match(readFileSync(previewHtmlPath, 'utf8'), /teacher-dashboard-preview\.tsx/)
  assert.doesNotMatch(mainEntry, /teacher-dashboard-preview/)
})

test('Phase 04A.1 compacts the Bento and reserves a safe Nest text column', () => {
  const css = readFileSync(teacherDashboardStylesPath, 'utf8')
  const previewEntry = readFileSync(join(frontendRoot, 'src', 'features', 'teacher', 'overview', 'teacher-dashboard-preview.tsx'), 'utf8')

  assert.match(css, /grid-template-areas:"review classrooms" "activities events"/)
  assert.match(css, /\.role-teacher \.td-review-card\{[^}]*grid-area:review[^}]*min-height:0/)
  assert.match(css, /@media\(max-width:767px\)[\s\S]*\.role-teacher \.td-review-content\{[^}]*max-width:calc\(100% - 58px\)/)
  assert.match(css, /@media\(max-width:767px\)[\s\S]*\.role-teacher \.td-events-card\{[^}]*min-height:0/)
  assert.doesNotMatch(css, /min-height:394px/)
  assert.match(previewEntry, /'positive'/)
  assert.match(previewEntry, /'large'/)
  assert.match(previewEntry, /import '\.\.\/\.\.\/\.\.\/index\.css'/)
})

test('Teacher insight surfaces use the EduCraft palette instead of legacy green controls', () => {
  const css = readFileSync(teacherInsightsStylesPath, 'utf8')

  assert.match(css, /\.role-teacher \.ti-heading h1\{[^}]*color:var\(--ec-ink\)/)
  assert.match(css, /\.role-teacher \.ti-button\.primary\{[^}]*background:var\(--ec-iris\)/)
  assert.match(css, /\.role-teacher \.ti-card\{[^}]*background:var\(--ec-surface\)/)
  assert.match(css, /\.role-teacher \.ti-chart\{[^}]*background:var\(--ec-surface-muted\)/)
  assert.doesNotMatch(css, /#285f45|#244636|#4f926a|#86b48a/)
  assert.doesNotMatch(css, /overflow-x\s*:\s*hidden/)
})

test('Teacher feature routes load the scoped EduCraft studio refinement last', () => {
  assert.equal(existsSync(teacherStudioStylesPath), true, 'Teacher studio refinement stylesheet must exist')
  const css = readFileSync(teacherStudioStylesPath, 'utf8')
  const routes = readFileSync(teacherRoutesPath, 'utf8')

  assert.match(routes, /import '\.\/teacher-studio\.css'/)
  assert.match(css, /\.role-teacher \.ta-primary\{[^}]*background:var\(--ec-iris\)/)
  assert.match(css, /\.role-teacher \.tl-folder-card/)
  assert.match(css, /\.role-teacher \.tc-event-ticket/)
  assert.match(css, /@media\(max-width:600px\)/)
  assert.doesNotMatch(css, /overflow-x\s*:\s*hidden/)
})

test('Teacher studio contains error, modal, roster and notebook content safely', () => {
  const css = readFileSync(teacherStudioStylesPath, 'utf8')

  assert.match(css, /\.role-teacher \.ti-error\{[^}]*display:flex[^}]*gap:/)
  assert.match(css, /\.role-teacher \.tl-modal-body\{[^}]*display:grid/)
  assert.match(css, /\.role-teacher \.tl-modal-body input\{[^}]*width:100%/)
  assert.match(css, /\.role-teacher \.tw-api-panel\{[^}]*align-items:stretch/)
  assert.match(css, /\.role-teacher \.tw-students\{[^}]*width:100%/)
  assert.match(css, /\.role-teacher \.tn-section\{[^}]*background:var\(--ec-surface-muted\)/)
  assert.match(css, /\.role-teacher \.tn-file-picker\{[^}]*color:var\(--ec-iris\)/)
})

test('Teacher production copy and navigation do not expose legacy presentation details', () => {
  const changePassword = readFileSync(join(frontendRoot, 'src', 'components', 'ChangePasswordDialog.tsx'), 'utf8')
  const promptDetail = readFileSync(join(frontendRoot, 'src', 'features', 'teacher', 'ai-summary', 'PromptSummaryDetail.tsx'), 'utf8')
  const assignedClasses = readFileSync(join(frontendRoot, 'src', 'features', 'teacher', 'classes', 'AssignedClassesPage.tsx'), 'utf8')
  const studio = readFileSync(teacherStudioStylesPath, 'utf8')

  assert.doesNotMatch(changePassword, /chỉ được gửi tới backend/i)
  assert.doesNotMatch(promptDetail, /Chỉ thống kê chủ đề học tập/)
  assert.doesNotMatch(assignedClasses, /icon:\s*<School/)
  assert.match(studio, /\.role-teacher\s+:is\([^}]*\.back-link[^}]*\)\s*\{[^}]*color:var\(--ec-iris\)/s)
  assert.match(studio, /\.role-teacher\s+\.tc-section-title\s*\{[^}]*color:var\(--ec-ink\)/s)
})

test('Teacher workspaces keep only essential copy and hide notebook tab scrollbars', () => {
  const schedule = readFileSync(join(frontendRoot, 'src', 'features', 'teacher', 'schedule', 'SchedulePage.tsx'), 'utf8')
  const promptDetail = readFileSync(join(frontendRoot, 'src', 'features', 'teacher', 'ai-summary', 'PromptSummaryDetail.tsx'), 'utf8')
  const lesson = readFileSync(join(frontendRoot, 'src', 'features', 'teacher', 'lessons', 'TeacherLessonPage.tsx'), 'utf8')
  const activityForm = readFileSync(join(frontendRoot, 'src', 'features', 'teacher', 'activities', 'ExerciseActivityForm.tsx'), 'utf8')
  const statistics = readFileSync(join(frontendRoot, 'src', 'features', 'teacher', 'statistics', 'ClassStatisticsPage.tsx'), 'utf8')
  const studio = readFileSync(teacherStudioStylesPath, 'utf8')

  assert.doesNotMatch(schedule, /Đổi tháng, điều chỉnh bộ lọc/)
  assert.doesNotMatch(schedule, /<label>Lớp<select/)
  assert.match(schedule, /aria-label="Lọc theo lớp"/)
  assert.doesNotMatch(promptDetail, /Học sinh chưa có chủ đề được tổng hợp/)
  assert.doesNotMatch(lesson, /Quản lý nội dung bài học và học liệu/)
  assert.doesNotMatch(lesson, /Trạng thái:\s*\{publicationLabels/)
  assert.doesNotMatch(activityForm, />BƯỚC [123]</)
  assert.doesNotMatch(statistics, /không tính điểm tổng|không tính vào điểm/i)
  assert.match(studio, /\.role-teacher\s+\.tw-tabs\s*\{[^}]*overflow-x:visible/s)
  assert.match(studio, /@media\(max-width:700px\)[\s\S]*\.role-teacher\s+\.tw-tabs\s*\{[^}]*overflow-x:auto[^}]*scrollbar-width:none/s)
})

test('Teacher identity, student navigation and classroom plaques use the approved presentation', () => {
  const favicon = readFileSync(join(frontendRoot, 'public', 'favicon.svg'), 'utf8')
  const studentDetail = readFileSync(join(frontendRoot, 'src', 'features', 'teacher', 'students', 'StudentDetailPage.tsx'), 'utf8')
  const classes = readFileSync(join(frontendRoot, 'src', 'features', 'teacher', 'classes', 'classes.css'), 'utf8')
  const shell = readFileSync(join(frontendRoot, 'src', 'design-system', 'shared-shell.css'), 'utf8')

  assert.match(favicon, /fill="#F4D476"/)
  assert.match(favicon, /stroke="#29264F"/)
  assert.doesNotMatch(favicon, /<text|>e\.</)
  assert.doesNotMatch(studentDetail, /TeacherBackButton|Kiểm tra vở được theo dõi riêng/)
  assert.match(classes, /\.role-teacher\s+\.panel\.tc-class-card\{[^}]*background:var\(--ec-matcha\)/s)
  assert.match(classes, /\.role-teacher\s+\.tc-class-card-body::before\{/)
  assert.match(classes, /\.role-teacher\s+\.tc-class-card-meta\{[^}]*flex-direction:row[^}]*justify-content:flex-start/s)
  assert.match(classes, /\.role-teacher\s+\.tc-class-meta-item\+\.tc-class-meta-item\{[^}]*border-inline-start:/s)
  assert.match(shell, /body:has\(\.managed-shell\)\{[^}]*background:#f5f2eb/)
  assert.match(shell, /\.managed-shell\s+\.sidebar\{[^}]*position:fixed/s)
  assert.match(shell, /@media\(min-width:1024px\)[\s\S]*\.managed-shell\s+\.sidebar\{[^}]*max-height:calc\(100dvh - 20px\)[^}]*overscroll-behavior:contain/s)
  assert.match(shell, /\.managed-shell\s+\.topbar\{[^}]*position:sticky[^}]*top:0[^}]*z-index:15/s)
  assert.match(shell, /\.managed-shell\s+:is\(\.app-main,\.topbar,\.content\)\{[^}]*background:var\(--ec-paper\)/)
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

test('Teacher UI spacing, card padding, and AI prompt summary cleanup stay intact', () => {
  const shellCss = readFileSync(sharedShellPath, 'utf8')
  const roleCss = readFileSync(join(frontendRoot, 'src', 'role-refinement.css'), 'utf8')
  const lessonsCss = readFileSync(join(frontendRoot, 'src', 'features', 'teacher', 'lessons', 'lessons.css'), 'utf8')
  const lessonsPanel = readFileSync(join(frontendRoot, 'src', 'features', 'teacher', 'lessons', 'TeacherLessonsPanel.tsx'), 'utf8')
  const activitiesCss = readFileSync(join(frontendRoot, 'src', 'features', 'teacher', 'activities', 'activities.css'), 'utf8')
  const promptSummary = readFileSync(join(frontendRoot, 'src', 'features', 'teacher', 'ai-summary', 'PromptSummaryPage.tsx'), 'utf8')
  const schedulePage = readFileSync(join(frontendRoot, 'src', 'features', 'teacher', 'schedule', 'SchedulePage.tsx'), 'utf8')

  assert.match(shellCss, /\.managed-shell \.brand-row\+\.nav-caption\{margin-top:28px\}/)
  assert.match(shellCss, /\.managed-shell \.main-nav\{[^}]*padding:22px 0 22px 12px[^}]*scrollbar-width:none/)
  assert.match(shellCss, /\.managed-shell \.main-nav::-webkit-scrollbar\{display:none\}/)
  assert.match(roleCss, /\.role-teacher \.tl-material-list li\{padding:18px 20px/)
  assert.match(roleCss, /\.role-teacher \.ta-activity-row\{padding:16px 20px\}/)
  assert.match(lessonsCss, /\.role-teacher \.tl-material-list li\{[^}]*padding:18px 20px/)
  assert.match(lessonsPanel, /className="tl-material-main"/)
  assert.match(activitiesCss, /\.role-teacher \.ta-activity-row\{[^}]*padding:16px 20px/)
  assert.doesNotMatch(promptSummary, /Danh sách chủ đề tổng hợp theo môn và lớp bạn đang giảng dạy/)
  assert.doesNotMatch(promptSummary, /Danh sách chỉ gồm các lớp và môn bạn đang phụ trách/)
  assert.doesNotMatch(promptSummary, /InfoNotice/)
  assert.doesNotMatch(schedulePage, /Chọn ngày để xem; dùng “Thêm sự kiện” khi muốn tạo mới\./)
})

test('Admin Studio replaces the legacy palette and removes implementation copy', () => {
  const studioPath = join(frontendRoot, 'src', 'features', 'admin', 'admin-studio.css')
  const routes = readFileSync(join(frontendRoot, 'src', 'features', 'admin', 'routes.tsx'), 'utf8')
  const overview = readFileSync(join(frontendRoot, 'src', 'features', 'admin', 'overview', 'AdminOverviewPage.tsx'), 'utf8')
  const accounts = readFileSync(join(frontendRoot, 'src', 'features', 'admin', 'accounts', 'AccountsPage.tsx'), 'utf8')
  const subjects = readFileSync(join(frontendRoot, 'src', 'features', 'admin', 'subjects', 'ClassroomSubjectsPage.tsx'), 'utf8')

  assert.equal(existsSync(studioPath), true, 'Admin Studio styles must exist')
  const studio = readFileSync(studioPath, 'utf8')
  assert.ok(routes.indexOf("import './admin-studio.css'") > routes.indexOf("import './admin.css'"), 'Admin Studio must load after legacy feature styles')
  assert.match(studio, /\.role-admin\{[^}]*--admin-primary:var\(--ec-iris\)/s)
  assert.match(studio, /\.role-admin\s+:is\(\.adm-primary,\.cls-btn-create,\.cls-btn-submit,\.cls-btn-assign,\.sbj-btn-primary\)\{[^}]*background:var\(--admin-primary\)/s)
  assert.match(studio, /@media\(max-width:700px\)[\s\S]*\.role-admin\s+\.adm-layout\{[^}]*grid-template-columns:1fr/s)
  assert.doesNotMatch(overview, /Số liệu được tải trực tiếp từ hệ thống quản trị/)
  assert.doesNotMatch(accounts, /Dữ liệu được tải từ backend|quyền Admin/)
  assert.doesNotMatch(subjects, /QUẢN TRỊ HỆ THỐNG|Quy tắc danh mục chung|lớp ACTIVE/)
})

test('the application imports the scoped foundation after the existing styles', () => {
  const entry = readFileSync(join(frontendRoot, 'src', 'main.tsx'), 'utf8')
  const roleStyles = entry.indexOf("import './role-refinement.css'")
  const foundationStyles = entry.indexOf("import './design-system/foundation.css'")

  assert.ok(roleStyles >= 0, 'role refinement import must remain')
  assert.ok(foundationStyles > roleStyles, 'foundation must load after role refinement')
})
