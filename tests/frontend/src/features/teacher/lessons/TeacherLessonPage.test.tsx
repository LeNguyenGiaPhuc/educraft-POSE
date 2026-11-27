import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PendingMaterialUploadRow } from '../../../../../../frontend/src/features/teacher/lessons/TeacherLessonPage'

describe('PendingMaterialUploadRow', () => {
  it('shows a selected file immediately while the upload request is running', () => {
    const html = renderToStaticMarkup(<PendingMaterialUploadRow fileName="ĐẠI VIỆT THỜI LÝ.docx" />)

    expect(html).toContain('ĐẠI VIỆT THỜI LÝ.docx')
    expect(html).toContain('Đang tải lên')
    expect(html).toContain('aria-live="polite"')
  })
})
