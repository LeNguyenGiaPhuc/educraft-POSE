import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ConnectedAction } from '../../../../frontend/src/design-system/ConnectedAction'
import { Field } from '../../../../frontend/src/design-system/Field'
import { NotebookTabs } from '../../../../frontend/src/design-system/NotebookTabs'
import { CraftTable } from '../../../../frontend/src/design-system/CraftTable'
import { Feedback } from '../../../../frontend/src/design-system/Feedback'
import { ModalShell } from '../../../../frontend/src/design-system/ModalShell'

describe('Phase 02 core components', () => {
  it('keeps a loading action labelled and prevents repeated submit', () => {
    const html = renderToStaticMarkup(<ConnectedAction loading>Đang lưu</ConnectedAction>)
    expect(html).toContain('disabled=""')
    expect(html).toContain('Đang lưu')
  })

  it('connects a field error and hint to its native control', () => {
    const html = renderToStaticMarkup(<Field id="name" label="Tên" hint="Tên đầy đủ" error="Bắt buộc" />)
    expect(html).toContain('aria-invalid="true"')
    expect(html).toContain('aria-describedby="name-hint name-error"')
  })

  it('renders a real tablist and selected panel', () => {
    const html = renderToStaticMarkup(<NotebookTabs tabs={[{ id: 'a', label: 'Môn học rất dài', content: 'Nội dung' }, { id: 'b', label: 'Lớp học', content: 'Khác' }]} />)
    expect(html).toContain('role="tablist"')
    expect(html).toContain('aria-selected="true"')
    expect(html).toContain('role="tabpanel"')
    expect(html).toContain('Nội dung')
  })

  it('keeps a semantic table with an honest empty state', () => {
    const html = renderToStaticMarkup(<CraftTable columns={[{ key: 'name', label: 'Tên' }]} rows={[]} empty="Chưa có dữ liệu" />)
    expect(html).toContain('<table')
    expect(html).toContain('scope="col"')
    expect(html).toContain('Chưa có dữ liệu')
  })

  it('announces a semantic error by text', () => {
    const html = renderToStaticMarkup(<Feedback kind="error">Không tải được dữ liệu</Feedback>)
    expect(html).toContain('role="alert"')
    expect(html).toContain('Không tải được dữ liệu')
  })

  it('labels a modal and keeps its close action disabled while busy', () => {
    const html = renderToStaticMarkup(<ModalShell open title="Xác nhận" onClose={() => {}} busy>Chi tiết</ModalShell>)
    expect(html).toContain('aria-modal="true"')
    expect(html).toContain('aria-labelledby="ec-modal-title"')
    expect(html).toContain('disabled=""')
  })
})
