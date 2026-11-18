import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { InfoNotice } from '../../../../../../frontend/src/features/teacher/insights/TeacherUI'

describe('TeacherUI information notice', () => {
  it('renders backend-facing information as a note', () => {
    const html = renderToStaticMarkup(<InfoNotice>Dữ liệu thật</InfoNotice>)

    expect(html).toContain('role="note"')
    expect(html).toContain('Dữ liệu thật')
  })
})
