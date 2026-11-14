import {
  BookOpen, CalendarDays, ChartNoAxesCombined, ClipboardList,
  GraduationCap, LayoutDashboard, MessageCircle, School,
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
    { path: 'classes', label: 'Lớp của tôi', description: 'Xem lớp và môn học đang phụ trách.', icon: School },
    { path: 'ai-summary', label: 'Chủ đề hỏi AI', description: 'Chủ đề học sinh hỏi AI theo môn và lớp đang phụ trách.', icon: Sparkles },
    { path: 'calendar', label: 'Lịch', description: 'Lịch tổng hợp các lớp và môn được phân công.', icon: CalendarDays },
  ],
  student: [
    { path: '', label: 'Tổng quan', description: 'Bắt đầu một ngày học tập cùng EduCraft.', icon: LayoutDashboard },
    { path: 'subjects', label: 'Môn học', description: 'Xem môn học thuộc lớp và bài học được công bố.', icon: GraduationCap },
    { path: 'activities', label: 'Bài được giao & kết quả', description: 'Làm bài, nộp bài và xem phản hồi trong cùng một nơi.', icon: ClipboardList },
    { path: 'practice', label: 'Tự ôn tập', description: 'Luyện tập từ học liệu môn học của lớp.', icon: Sparkles },
    { path: 'profile', label: 'Tiến độ học tập', description: 'Theo dõi tiến độ học theo từng môn.', icon: ChartNoAxesCombined },
    { path: 'calendar', label: 'Lịch & thông báo', description: 'Xem hoạt động sắp tới và thông báo đã nhận.', icon: CalendarDays },
    { path: 'assistant', label: 'Trợ lý AI & lịch sử', description: 'Hỏi đáp theo học liệu đã công bố và xem lại chat của em.', icon: MessageCircle },
  ],
}
