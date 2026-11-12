import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { AlertTriangle, Lock, Pencil, Plus, Trash2 } from 'lucide-react'
import { getTeacherSubjectContext, registerTeacherPreviewItem, sampleLessons, teacherSubjectPath } from '../fixtures'
import { assignedActivities, notebookCriteria } from '../insights/fixtures'
import { SubmissionsPage } from '../submissions/SubmissionsPage'
import {
  sampleActivities,
  readActivityPreviews,
  activityPreviewStorageKey,
  readActivityChanges,
  writeActivityChanges,
  canEditActivityContent,
  canDeleteActivity,
  getActivitySubmissionCount,
  type ActivityPreview,
  type ActivityPublicationDraft,
} from './activities.mock'
import { ActivityCreationDialog } from './ActivityCreationDialog'
import { ActivityEditDialog } from './ActivityEditDialog'
import { removeCalendarEventByActivityId } from '../schedule/schedule.mock'
import './activities.css'

const labels = { QUIZ: 'Quiz', WRITTEN: 'Tự luận', NOTEBOOK: 'Kiểm tra vở' }

export function ActivitiesPage() {
  const route = useParams()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const subjectId = route.classroomSubjectId ?? params.get('classroomSubjectId') ?? 'history-11a2'
  const context = getTeacherSubjectContext(subjectId, route.classroomId)

  // Activities Preview State
  const [previews, setPreviews] = useState<ActivityPreview[]>(readActivityPreviews)
  const [changes, setChanges] = useState(readActivityChanges)
  const [activityToEdit, setActivityToEdit] = useState<ActivityPreview | null>(null)

  // Dialog State for creating activity
  const [createModalKind, setCreateModalKind] = useState<'QUIZ' | 'WRITTEN' | 'NOTEBOOK' | null>(() => {
    if (route.activityId === 'new') {
      const qKind = params.get('kind')
      return qKind === 'WRITTEN' ? 'WRITTEN' : qKind === 'NOTEBOOK' ? 'NOTEBOOK' : 'QUIZ'
    }
    return null
  })

  // Post-publish prompt state
  const [justPublished, setJustPublished] = useState<ActivityPreview | null>(null)

  // Delete activity confirmation
  const [activityToDelete, setActivityToDelete] = useState<ActivityPreview | null>(null)
  const [notice, setNotice] = useState('')

  if (!context) {
    return (
      <div className="page-content">
        <h1>Không tìm thấy môn được phân công</h1>
        <Link to="/teacher/classes">Quay lại lớp của tôi</Link>
      </div>
    )
  }

  const base = teacherSubjectPath(subjectId, 'activities')
  const detailBase = base.split('?')[0] + '/activities/'
  const back = params.get('returnTo')
  const stateReturn = (location.state as { returnTo?: unknown } | null)?.returnTo
  const basePath = base.split('?')[0]
  const scopedReturn = (value: unknown) =>
    typeof value === 'string' &&
    (value === basePath ||
      value.startsWith(`${basePath}?`) ||
      value.startsWith(`${basePath}/`) ||
      value === '/teacher/calendar' ||
      value.startsWith('/teacher/calendar?'))
      ? value
      : undefined
  const returnTo = scopedReturn(stateReturn) ?? scopedReturn(back) ?? (route.activityId ? base : '/teacher/classes')
  const returnLabel = returnTo.startsWith('/teacher/calendar')
    ? 'sự kiện lịch'
    : returnTo.includes('tab=statistics')
    ? 'thống kê'
    : 'lịch sử hoạt động'

  // Filter activities
  const allActivities = [...sampleActivities, ...previews]
    .filter((item) => !changes.deleted.includes(item.id))
    .map((item) => changes.updated[item.id] ?? item)

  const activities = allActivities.filter((item) => item.classroomSubjectId === subjectId)
  const activity = activities.find((item) => item.id === route.activityId)

  function filter(key: string, value: string) {
    setParams((current) => {
      const next = new URLSearchParams(current)
      if (value) next.set(key, value)
      else next.delete(key)
      return next
    })
  }

  function handlePublish(value: ActivityPublicationDraft) {
    const item: ActivityPreview = {
      ...value,
      id: `preview-${Date.now()}`,
      classroomSubjectId: subjectId,
      status: 'PUBLISHED',
    }
    const next = [...previews, item]
    setPreviews(next)
    sessionStorage.setItem(activityPreviewStorageKey, JSON.stringify(next))
    registerTeacherPreviewItem('activity', item.id, subjectId)
    setJustPublished(item)
    setCreateModalKind(null)
    setNotice(`Đã công bố mô phỏng hoạt động “${item.title}”.`)
    if (route.activityId === 'new') {
      navigate(base, { replace: true })
    }
  }

  function toggleActivityStatus(target: ActivityPreview) {
    const nextStatus: ActivityPreview['status'] = target.status === 'CLOSED' ? 'PUBLISHED' : 'CLOSED'
    const next = { ...changes, updated: { ...changes.updated, [target.id]: { ...target, status: nextStatus } } }
    setChanges(next)
    writeActivityChanges(next)
    setNotice(
      `Đã chuyển trạng thái hoạt động “${target.title}” thành ${
        nextStatus === 'CLOSED' ? 'Đã đóng nhận bài' : 'Đang mở nhận bài'
      } (xem trước trong phiên).`
    )
  }

  function saveActivityEdit(value: ActivityPreview) {
    if (getActivitySubmissionCount(value.id, assignedActivities) !== 0) {
      setNotice('Hoạt động đã có bài nộp; nội dung không thể chỉnh sửa.')
      setActivityToEdit(null)
      return
    }
    const next = { ...changes, updated: { ...changes.updated, [value.id]: value } }
    setChanges(next)
    writeActivityChanges(next)
    setActivityToEdit(null)
    setNotice(`Đã sửa hoạt động “${value.title}” trong bản xem trước.`)
  }

  function handleConfirmDeleteActivity() {
    if (!activityToDelete) return
    if (getActivitySubmissionCount(activityToDelete.id, assignedActivities) !== 0) {
      setActivityToDelete(null)
      setNotice('Hoạt động đã có bài nộp; không thể xóa.')
      return
    }
    const id = activityToDelete.id
    const title = activityToDelete.title

    // Remove from previews
    const nextPreviews = previews.filter((p) => p.id !== id)
    setPreviews(nextPreviews)
    sessionStorage.setItem(activityPreviewStorageKey, JSON.stringify(nextPreviews))

    // Mark deleted
    const { [id]: _removed, ...updated } = changes.updated
    void _removed
    const next = { updated, deleted: [...changes.deleted, id] }
    setChanges(next)
    writeActivityChanges(next)

    // Remove linked calendar events
    removeCalendarEventByActivityId(id)

    setActivityToDelete(null)
    setNotice(`Đã gỡ hoạt động “${title}” và các sự kiện lịch liên kết khỏi bản xem trước.`)
    navigate(base)
  }

  const submissionCount = activity ? getActivitySubmissionCount(activity.id, assignedActivities) : 0
  const canDelete = canDeleteActivity(submissionCount)
  const canEditContent = canEditActivityContent(submissionCount)

  return (
    <div className="page-content ta-page">
      {route.activityId && <Link className="ta-back" to={returnTo}>Quay lại {returnLabel}</Link>}

      <div className="page-heading">
        <h1>{activity ? activity.title : 'Lịch sử hoạt động'}</h1>
        <p>{context.classroom.name} · {context.subject.name}</p>
      </div>

      <div className="sample-strip">
        Dữ liệu mẫu · chưa kết nối API, AI, công bố hoặc thông báo thật.
      </div>

      {notice && (
        <div className="adm-notice" role="status" style={{ margin: '14px 0', background: '#ecf7eb', color: '#275837' }}>
          {notice}
        </div>
      )}

      {/* Post-publish prompt banner */}
      {justPublished && (
        <div className="ta-publish-prompt" role="status">
          <h3>Đã công bố mô phỏng: {justPublished.title}</h3>
          <p>
            Hoạt động đã được thêm vào danh sách hoạt động của phiên làm việc. Bạn có muốn thêm hoạt động này vào Lịch không?
          </p>
          <div className="ta-publish-prompt-actions">
            <Link
              to={`/teacher/calendar?create=1&classroomId=${context.classroom.id}&classroomSubjectId=${subjectId}&activityId=${justPublished.id}&publication=preview`}
              className="ta-btn-calendar"
            >
              Thêm vào lịch giảng dạy
            </Link>
            <button
              type="button"
              className="ta-btn-dismiss"
              onClick={() => setJustPublished(null)}
            >
              Để sau / Đóng
            </button>
          </div>
        </div>
      )}

      {/* VIEW CHI TIẾT HOẠT ĐỘNG */}
      {route.activityId && route.activityId !== 'new' ? (
        activity ? (
          <>
            <section className="panel ta-editor">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h2>Nội dung & thời hạn</h2>
                  <p>
                    {labels[activity.type]} ·{' '}
                    <strong style={{ color: activity.status === 'CLOSED' ? '#6b7280' : '#15803d' }}>
                      {activity.status === 'CLOSED' ? 'Đã đóng nhận bài' : 'Đang mở nhận bài'}
                    </strong>{' '}
                    · Đóng lúc {new Date(activity.closesAt).toLocaleString('vi-VN')}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {canEditContent && <button type="button" className="ta-secondary" onClick={() => setActivityToEdit(activity)}><Pencil size={14} /> Sửa hoạt động</button>}
                  {/* Status Toggle Button */}
                  <button
                    type="button"
                    className="ta-secondary"
                    onClick={() => toggleActivityStatus(activity)}
                  >
                    {activity.status === 'CLOSED' ? 'Mở lại nhận bài' : 'Đóng nhận bài'}
                  </button>

                  {/* Delete Button (Allowed ONLY when 0 submissions) */}
                  {canDelete ? (
                    <button
                      type="button"
                      className="ta-delete-btn"
                      onClick={() => setActivityToDelete(activity)}
                      title="Chưa có bài nộp nào, cho phép xóa hoạt động"
                    >
                      <Trash2 size={14} /> Xóa hoạt động
                    </button>
                  ) : null}
                </div>
              </div>

              {/* Submissions count warning */}
              {!canDelete && (
                <div className="ta-locked-note" style={{ margin: '14px 0' }}>
                  <Lock size={16} />
                  <span>
                    Hoạt động đã có <strong>{submissionCount} bài nộp</strong> của học sinh. Đề bài, đáp án và tiêu chí kiểm tra đã khóa cố định để đảm bảo tính công bằng; không thể xóa hoạt động.
                  </span>
                </div>
              )}

              {canEditContent && (
                <div className="adm-inline-note" style={{ margin: '10px 0', fontSize: 12 }}>
                  Hoạt động chưa có bài nộp nào: Giáo viên được phép chỉnh sửa nội dung hoặc xóa hoạt động.
                </div>
              )}

              {/* Content Preview */}
              {activity.content ? (
                <ActivityPreviewContent activity={activity} lessonBase={base.split('?')[0] + '/lessons/'} />
              ) : activity.type === 'NOTEBOOK' ? (
                <>
                  <p>
                    Ảnh vở mẫu minh họa. Tiêu chí đã được xác nhận và khóa sau bài nộp đầu tiên; mở nhận lại không ghi đè lịch sử đã chốt.
                  </p>
                  <ul>
                    {notebookCriteria.map((item) => (
                      <li key={item.id}>{item.content}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <>
                  <p>
                    {activity.type === 'QUIZ'
                      ? 'Câu hỏi trắc nghiệm theo nội dung bài học; đáp án, giải thích và nguồn được duyệt trước khi công bố.'
                      : 'Trình bày ý nghĩa lịch sử; chấm theo ý đúng và căn cứ học liệu đã công bố.'}
                  </p>
                  <h3>Nguồn bài học</h3>
                  {sampleLessons
                    .filter(
                      (item) =>
                        item.classroomSubjectId === subjectId &&
                        item.status === 'PUBLISHED' &&
                        item.id ===
                          (activity.id.includes('postwar')
                            ? 'lesson-viet-nam-11a2'
                            : subjectId === 'history-11a1'
                            ? 'lesson-cmt8-11a1'
                            : 'lesson-cmt8-11a2')
                    )
                    .map((item) => (
                      <p key={item.id}>
                        <Link to={base.split('?')[0] + '/lessons/' + item.id}>{item.title}</Link> ·{' '}
                        {item.materials
                          .map((file) => `${file.name}, phiên bản ${file.version}, ${file.sourcePosition}`)
                          .join('; ')}
                      </p>
                    ))}
                </>
              )}
            </section>

            {activity.id.startsWith('preview-') || activity.id === 'quiz-unsubmitted-11a2' ? (
              <section className="panel ta-editor" style={{ marginTop: 16 }}>
                <p style={{ color: '#688271', fontSize: 13, margin: 0 }}>
                  Hoạt động mới chưa có bài nộp nào từ học sinh.
                </p>
              </section>
            ) : (
              <SubmissionsPage key={activity.id} classroomSubjectId={subjectId} selectedActivityId={activity.id} />
            )}
          </>
        ) : (
          <section className="panel ta-editor">
            <h2>Không tìm thấy hoạt động trong môn này</h2>
            <Link to={base}>Về lịch sử hoạt động</Link>
          </section>
        )
      ) : (
        /* VIEW DANH SÁCH HOẠT ĐỘNG */
        <>
          <div className="ta-actions">
            <button
              type="button"
              className="ta-primary"
              onClick={() => setCreateModalKind('QUIZ')}
            >
              <Plus size={16} /> Tạo Quiz trắc nghiệm
            </button>
            <button
              type="button"
              className="ta-primary"
              onClick={() => setCreateModalKind('WRITTEN')}
            >
              <Plus size={16} /> Tạo Tự luận ngắn
            </button>
            <button
              type="button"
              className="ta-primary"
              onClick={() => setCreateModalKind('NOTEBOOK')}
            >
              <Plus size={16} /> Tạo Kiểm tra vở
            </button>
          </div>

          <section className="panel ta-editor">
            <div className="ta-history-filters">
              <label>
                Loại hoạt động
                <select value={params.get('type') ?? ''} onChange={(event) => filter('type', event.target.value)}>
                  <option value="">Tất cả các loại</option>
                  {Object.entries(labels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Trạng thái
                <select value={params.get('status') ?? ''} onChange={(event) => filter('status', event.target.value)}>
                  <option value="">Tất cả trạng thái</option>
                  <option value="PUBLISHED">Đang mở nhận bài</option>
                  <option value="CLOSED">Đã đóng nhận bài</option>
                </select>
              </label>

              <label>
                Đóng từ ngày
                <input
                  type="date"
                  value={params.get('from') ?? ''}
                  onChange={(event) => filter('from', event.target.value)}
                />
              </label>

              <label>
                Đến ngày
                <input
                  type="date"
                  value={params.get('to') ?? ''}
                  onChange={(event) => filter('to', event.target.value)}
                />
              </label>
            </div>

            <div className="ta-activity-list">
              {activities
                .filter(
                  (item) =>
                    (!params.get('type') || item.type === params.get('type')) &&
                    (!params.get('status') || item.status === params.get('status')) &&
                    (!params.get('from') || item.closesAt.slice(0, 10) >= params.get('from')!) &&
                    (!params.get('to') || item.closesAt.slice(0, 10) <= params.get('to')!)
                )
                .map((item) => {
                  const subs = getActivitySubmissionCount(item.id, assignedActivities)
                  return (
                    <Link
                      className="ta-activity-row"
                      key={item.id}
                      to={detailBase + item.id}
                    >
                      <div>
                        <strong>{item.title}</strong>
                        <small>
                          {labels[item.type]} · Đóng: {new Date(item.closesAt).toLocaleString('vi-VN')} ·{' '}
                          {subs > 0 ? `${subs} bài nộp` : 'Chưa có bài nộp'}
                        </small>
                      </div>
                      <span className={`ta-status ${item.status === 'CLOSED' ? 'closed' : ''}`}>
                        {item.status === 'CLOSED' ? 'Đã đóng' : 'Đang mở'}
                        {item.id.startsWith('preview-') && ' · mô phỏng'}
                      </span>
                      <span>Xem bài nộp & kết quả</span>
                    </Link>
                  )
                })}
            </div>

            {!activities.some(
              (item) =>
                (!params.get('type') || item.type === params.get('type')) &&
                (!params.get('status') || item.status === params.get('status')) &&
                (!params.get('from') || item.closesAt.slice(0, 10) >= params.get('from')!) &&
                (!params.get('to') || item.closesAt.slice(0, 10) <= params.get('to')!)
            ) && (
              <p style={{ color: '#7a9182', fontSize: 13, margin: '16px 0 0' }}>
                Không có hoạt động nào phù hợp với bộ lọc hiện tại.
              </p>
            )}
          </section>
        </>
      )}

      {/* Near Full-Screen Creation Dialog */}
      {createModalKind && (
        <ActivityCreationDialog
          isOpen={Boolean(createModalKind)}
          kind={createModalKind}
          classroomSubjectId={subjectId}
          onClose={() => setCreateModalKind(null)}
          onPublish={handlePublish}
        />
      )}
      {activityToEdit && <ActivityEditDialog key={activityToEdit.id} activity={activityToEdit} onSave={saveActivityEdit} onClose={() => setActivityToEdit(null)} />}

      {/* Delete Activity Confirmation Modal */}
      {activityToDelete && (
        <div className="ta-confirm-backdrop" role="alertdialog" aria-modal="true" aria-labelledby="delete-activity-title">
          <div className="ta-confirm-box">
            <div className="ta-confirm-icon">
              <AlertTriangle size={24} />
            </div>
            <h3 id="delete-activity-title">Xác nhận xóa hoạt động?</h3>
            <p>
              Bạn có chắc chắn muốn xóa hoạt động <strong>“{activityToDelete.title}”</strong>?
              <br />
              <small style={{ color: '#6b7280', display: 'block', marginTop: 8 }}>
                Hoạt động này hiện có 0 bài nộp. Thao tác xóa sẽ gỡ hoạt động, các sự kiện lịch liên kết và thông báo mô phỏng liên quan.
              </small>
            </p>
            <div className="ta-confirm-actions">
              <button
                type="button"
                className="ta-confirm-btn-stay"
                onClick={() => setActivityToDelete(null)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="ta-confirm-btn-exit"
                onClick={handleConfirmDeleteActivity}
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ActivityPreviewContent({ activity, lessonBase }: { activity: ActivityPreview; lessonBase: string }) {
  const content = activity.content
  if (!content) return <p>Hoạt động mô phỏng cũ chưa giữ nội dung. Hãy tạo lại để xem đúng bản đã duyệt.</p>
  if (content.kind === 'NOTEBOOK')
    return (
      <>
        <h3>Nội dung kiểm tra vở</h3>
        <p>{content.description}</p>
        <h3>Ảnh mẫu đã chọn</h3>
        <p>Chỉ giữ tên và dung lượng trong phiên xem trước; ảnh chưa được tải lên.</p>
        <ul>
          {content.images.map((image, index) => (
            <li key={index}>
              {image.name} · {(image.size / 1024 / 1024).toFixed(1)} MB
            </li>
          ))}
        </ul>
        <h3>Tiêu chí giáo viên đã xác nhận</h3>
        <ol>
          {content.criteria.map((item) => (
            <li key={item.id}>{item.content}</li>
          ))}
        </ol>
      </>
    )
  return (
    <>
      <p>
        Bản câu hỏi giáo viên đã duyệt · {content.questions.length}/{content.requestedCount} câu minh họa ·{' '}
        {content.difficulty === 'BASIC' ? 'Cơ bản' : content.difficulty === 'INTERMEDIATE' ? 'Trung bình' : 'Nâng cao'}
      </p>
      <h3>Nguồn bài học đã chọn</h3>
      {content.sourceLessons.map((lesson) => (
        <div key={lesson.id}>
          <Link to={lessonBase + lesson.id}>{lesson.title}</Link>
          <ul>
            {lesson.materials.map((file, index) => (
              <li key={index}>
                {file.name} · phiên bản {file.version} · {file.sourcePosition}
              </li>
            ))}
          </ul>
        </div>
      ))}
      {content.questions.map((question, index) => (
        <article className="ta-question" key={question.id}>
          <h3>
            Câu {index + 1}: {question.prompt}
          </h3>
          {question.options && (
            <ol type="A">
              {question.options.map((option, optionIndex) => (
                <li key={optionIndex}>{option}</li>
              ))}
            </ol>
          )}
          <p>
            <strong>Đáp án:</strong> {question.answer}
          </p>
          {question.markingCriteria && (
            <p>
              <strong>Tiêu chí chấm:</strong> {question.markingCriteria}
            </p>
          )}
          <p>
            <strong>Điểm tối đa:</strong> {question.maxPoints} · {question.lessonTag}
          </p>
          <p>
            <strong>Giải thích:</strong> {question.explanation}
          </p>
          <p>
            <strong>Trích dẫn:</strong> {question.citation}
          </p>
        </article>
      ))}
    </>
  )
}
