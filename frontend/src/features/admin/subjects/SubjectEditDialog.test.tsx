import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { AdminSubject } from '../../../lib/api/admin'
import { SubjectEditDialog } from './SubjectEditDialog'

const subject: AdminSubject = {
  id: 'history-id',
  name: 'Lịch sử',
  isActive: true,
  teacherCount: 1,
  classroomCount: 2,
}

describe('SubjectEditDialog', () => {
  it('renders as a native dialog', () => {
    const markup = renderToStaticMarkup(
      <SubjectEditDialog subject={subject} subjects={[subject]} onClose={() => undefined} onSave={async () => subject} />
    )

    expect(markup).toContain('<dialog')
  })
})
