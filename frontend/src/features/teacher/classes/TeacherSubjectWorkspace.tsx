import { Link, useLocation, useParams, useSearchParams } from 'react-router'
import { ActivitiesPage } from '../activities/ActivitiesPage'
import { TeacherBackButton } from '../components/TeacherBackButton'
import { getTeacherSubjectContext, teacherSubjectPath, type TeacherWorkspaceTab } from '../fixtures'
import { LessonsPage } from '../lessons/LessonsPage'
import { ClassStatisticsPage } from '../statistics/ClassStatisticsPage'
import { EmptyState, PreviewNotice } from '../insights/TeacherUI'
import './classes.css'

const tabs: { id: TeacherWorkspaceTab; label: string }[] = [{ id: 'lessons', label: 'Bài học & học liệu' }, { id: 'activities', label: 'Hoạt động' }, { id: 'students', label: 'Học sinh' }, { id: 'statistics', label: 'Thống kê' }]

export function TeacherSubjectWorkspace() {
  const route = useParams()
  const [params] = useSearchParams()
  const location = useLocation()
  const context = getTeacherSubjectContext(route.classroomSubjectId, route.classroomId)
  const tab = tabs.find(item => item.id === params.get('tab'))?.id ?? 'lessons'
  const search = params.get('studentSearch') ?? ''
  if (!context) return <div className="page-content"><TeacherBackButton /><h1>Môn học không khả dụng</h1><p>Chọn lại một lớp và môn được phân công.</p></div>
  const { classroom, subject } = context
  const visible = classroom.students.filter(student => student.name.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')))
  return <div className="page-content tw-page"><div className="page-heading"><h1>{classroom.name} · {subject.name}</h1><p>Năm học {classroom.academicYear} · {classroom.students.length} học sinh mẫu</p></div><nav className="tw-tabs" aria-label="Không gian môn học">{tabs.map(item => <Link key={item.id} aria-current={tab === item.id ? 'page' : undefined} to={teacherSubjectPath(subject.id, item.id) + (location.search.replace(/^\?/, '').split('&').filter(value => value && !value.startsWith('tab=')).map(value => '&' + value).join(''))}>{item.label}</Link>)}</nav>
    {tab === 'lessons' ? <LessonsPage /> : tab === 'activities' ? <ActivitiesPage /> : tab === 'statistics' ? <ClassStatisticsPage classroomSubjectId={subject.id} embedded /> : <section><h2>Học sinh trong {classroom.name}</h2><PreviewNotice>Danh sách mẫu · Teacher chỉ xem, không chỉnh sửa thành viên lớp.</PreviewNotice><form className="tw-search" role="search"><input type="hidden" name="tab" value="students" /><label>Tìm học sinh<input name="studentSearch" key={search} defaultValue={search} placeholder="Nhập tên học sinh" /></label><button type="submit">Tìm kiếm</button></form>{visible.length ? <ul className="tw-students">{visible.map(student => <li key={student.id}><Link state={{ returnTo: location.pathname + location.search }} to={teacherSubjectPath(subject.id).split('?')[0] + '/students/' + student.id}><strong>{student.name}</strong><span>Xem hoạt động & tiến độ →</span></Link></li>)}</ul> : <EmptyState title="Không tìm thấy học sinh" detail="Thử tìm bằng một phần tên hoặc bỏ từ khóa." />}</section>}
  </div>
}
