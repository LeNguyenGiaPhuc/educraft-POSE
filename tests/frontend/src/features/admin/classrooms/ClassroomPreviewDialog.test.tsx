import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ClassroomPreviewDialog } from '../../../../../../frontend/src/features/admin/classrooms/ClassroomPreviewDialog'

describe('ClassroomPreviewDialog', () => {
  it('shows the classroom and roster summary before confirmation', () => {
    const markup = renderToStaticMarkup(
      <ClassroomPreviewDialog
        draft={{ name: '11A3', gradeLevel: 11, academicYear: '2026–2027' }}
        excelFileName="students.xlsx"
        studentCount={12}
        studentRows={[{ line: 2, fullName: 'Nguyễn Văn An', username: 'nguyen.van.an', contact: '0901234567', original: { fullName: '  Nguyễn   Văn An ', username: ' Nguyen.Van.An ', contact: '0901 234 567' } }]}
        normalizationNotices={[{ line: 2, field: 'fullName', code: 'NORMALIZED', message: 'Đã chuẩn hóa họ và tên.' }]}
        isSaving={false}
        onBack={() => undefined}
        onConfirm={async () => undefined}
      />
    )

    expect(markup).toContain('Xác nhận tạo lớp')
    expect(markup).toContain('11A3')
    expect(markup).toContain('2026–2027')
    expect(markup).toContain('students.xlsx')
    expect(markup).toContain('12 học sinh')
    expect(markup).toContain('nguyen.van.an')
    expect(markup).toContain('Đã chuẩn hóa 1 giá trị')
  })
})
