import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { TeacherEmptyState } from '../../../../../../frontend/src/features/teacher/components/TeacherEmptyState'

describe('TeacherEmptyState', () => {
  it('renders a real action only when the caller supplies one', () => {
    const withoutAction = renderToStaticMarkup(
      <TeacherEmptyState title="Chưa có bài học" description="Tạo bài học đầu tiên để bắt đầu." />,
    )
    const withAction = renderToStaticMarkup(
      <TeacherEmptyState
        title="Không tìm thấy bài học"
        description="Thử đổi bộ lọc."
        action={<button type="button">Xóa bộ lọc</button>}
      />,
    )

    expect(withoutAction).not.toContain('<button')
    expect(withAction).toContain('<button type="button">Xóa bộ lọc</button>')
  })

  it('keeps error feedback semantic without pretending it is empty data', () => {
    const html = renderToStaticMarkup(
      <TeacherEmptyState tone="error" title="Không thể tải dữ liệu" description="Hãy thử lại." />,
    )

    expect(html).toContain('role="alert"')
    expect(html).toContain('is-error')
  })
})
