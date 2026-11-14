import {
  BookOpen, CalendarDays, ChartNoAxesCombined, ClipboardCheck, ClipboardList,
  GraduationCap, LayoutDashboard, LibraryBig, MessageCircle, School,
  Sparkles, Users, type LucideIcon,
} from 'lucide-react'
import type { Role } from './demo'

export type NavItem = { path: string; label: string; description: string; icon: LucideIcon }

export const roleNames: Record<Role, string> = {
  admin: 'Quản trị viên', teacher: 'Giáo viên', student: 'Học sinh',
}

export const navigation: Record<Role, NavItem[]> = {
  admin: [
    { path: '', label: 'Tổng quan', description: 'Theo dõi cấu trúc và tài khoản của trường.', icon: LayoutDashboard },
    { path: 'accounts', label: 'Tài khoản', description: 'Tạo và quản lý tài khoản giáo viên, học sinh.', icon: Users },
    { path: 'classrooms', label: 'Lớp học', description: 'Quản lý lớp, học sinh và năm học.', icon: School },
    { path: 'subjects', label: 'Môn học của lớp', description: 'Phân môn và giáo viên cho từng lớp.', icon: BookOpen },
  ],
  teacher: [
    { path: '', label: 'Tổng quan', description: 'Công việc của các lớp và môn được phân công.', icon: LayoutDashboard },
    { path: 'classes', label: 'Lớp được phân công', description: 'Xem lớp và môn học đang phụ trách.', icon: School },
    { path: 'lessons', label: 'Bài học & học liệu', description: 'Tổ chức bài học và tài liệu cho học sinh.', icon: LibraryBig },
    { path: 'activities', label: 'Hoạt động học tập', description: 'Tạo quiz, tự luận và kiểm tra vở.', icon: ClipboardList },
    { path: 'submissions', label: 'Bài nộp & kết quả', description: 'Theo dõi bài nộp và duyệt kết quả cần chốt.', icon: ClipboardCheck },
    { path: 'progress', label: 'Tiến độ học sinh', description: 'Xem xu hướng điểm và những bài học đang gặp khó.', icon: ChartNoAxesCombined },
    { path: 'schedule', label: 'Lịch môn học', description: 'Công bố lịch hoạt động của môn đang dạy.', icon: CalendarDays },
    { path: 'ai-summary', label: 'Tóm tắt câu hỏi AI', description: 'Xem chủ đề học sinh hỏi trong môn được phân công.', icon: Sparkles },
  ],
  student: [
    { path: '', label: 'Tổng quan', description: 'Bắt đầu một ngày học tập cùng EduCraft.', icon: LayoutDashboard },
    { path: 'subjects', label: 'Môn học', description: 'Xem môn học thuộc lớp, bài học và học liệu đã công bố.', icon: GraduationCap },
    { path: 'activities', label: 'Hoạt động được giao', description: 'Làm quiz, tự luận và nộp bài kiểm tra vở.', icon: ClipboardList },
    { path: 'practice', label: 'Tự ôn tập', description: 'Luyện tập từ học liệu môn học của lớp.', icon: Sparkles },
    { path: 'results', label: 'Kết quả', description: 'Xem điểm, giải thích và kết quả kiểm tra vở theo tiêu chí.', icon: ClipboardCheck },
    { path: 'profile', label: 'Tiến độ học tập', description: 'Theo dõi riêng bài được giao và các phiên tự ôn.', icon: ChartNoAxesCombined },
    { path: 'calendar', label: 'Lịch & thông báo', description: 'Xem hoạt động sắp tới và thông báo đã nhận.', icon: CalendarDays },
    { path: 'assistant', label: 'Trợ lý AI & lịch sử', description: 'Hỏi đáp theo học liệu đã công bố và xem lại chat của em.', icon: MessageCircle },
  ],
}
