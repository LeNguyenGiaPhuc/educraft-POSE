import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { ClassroomCreateDialog } from '../../../../../../frontend/src/features/admin/classrooms/ClassroomCreateDialog'

describe('ClassroomCreateDialog', () => {
  it('allows the admin to include an Excel roster in the atomic create flow', () => {
    const markup = renderToStaticMarkup(
      <ClassroomCreateDialog
        draft={{ name: '11A3', gradeLevel: 11, academicYear: '2026–2027' }}
        enableExcel={false}
        excelFileName=""
        excelPassword=""
        excelRows={[]}
        excelIssues={[]}
        excelError=""
        isReadingFile={false}
        formErrors={[]}
        isSaving={false}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        onDraftChange={vi.fn()}
        onPasswordChange={vi.fn()}
        onEnableExcelChange={vi.fn()}
        onFileUpload={vi.fn()}
        onRemoveFile={vi.fn()}
        onDownloadTemplate={vi.fn()}
      />
    )

    expect(markup).toContain('Nhập danh sách học sinh bằng Excel cùng lúc')
    expect(markup).not.toContain('disabled=""')
  })
})
