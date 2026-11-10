import type { Role } from './demo'

type Overview = {
  eyebrow: string
  title: string
  subtitle: string
  metrics: { label: string; value: string; note: string }[]
  focusTitle: string
  focus: { title: string; detail: string; tag: string }[]
}

export const overview: Record<Role, Overview> = {
  admin: {
    eyebrow: 'KHÔNG GIAN QUẢN TRỊ', title: 'Một nơi để tổ chức việc học.',
    subtitle: 'Quản lý tài khoản, lớp và môn học của lớp từ cùng một không gian.',
    metrics: [
      { label: 'Lớp học', value: '12', note: 'Năm học 2026–2027' },
      { label: 'Giáo viên', value: '34', note: 'Tài khoản đang hoạt động' },
      { label: 'Học sinh', value: '428', note: 'Đã được phân lớp' },
    ],
    focusTitle: 'Việc cần chuẩn bị', focus: [
      { title: 'Rà soát danh sách học sinh', detail: 'Kiểm tra tài khoản chưa được phân lớp.', tag: 'TÀI KHOẢN' },
      { title: 'Phân công môn học', detail: 'Chọn giáo viên phù hợp cho từng môn ở từng lớp.', tag: 'MÔN HỌC' },
    ],
  },
  teacher: {
    eyebrow: 'KHÔNG GIAN GIÁO VIÊN', title: 'Dạy học có thêm thời gian để quan tâm.',
    subtitle: 'Chuẩn bị học liệu, giao hoạt động và theo dõi tiến độ của lớp mình phụ trách.',
    metrics: [
      { label: 'Lớp phụ trách', value: '02', note: 'Môn Lịch sử' },
      { label: 'Hoạt động đang mở', value: '04', note: 'Ở các lớp được giao' },
      { label: 'Bài cần xem lại', value: '08', note: 'Trước khi chốt kết quả' },
    ],
    focusTitle: 'Cần chú ý hôm nay', focus: [
      { title: 'Kiểm tra vở · 11A2', detail: 'Xem gợi ý AI và chốt kết quả cho bài nộp.', tag: 'BÀI NỘP' },
      { title: 'Bài học mới · 11A1', detail: 'Chuẩn bị học liệu để học sinh đọc trước.', tag: 'HỌC LIỆU' },
    ],
  },
  student: {
    eyebrow: 'KHÔNG GIAN HỌC SINH', title: 'Học từng chút, hiểu thật sâu.',
    subtitle: 'Xem bài trước, hoàn thành hoạt động và theo dõi hành trình học tập của mình.',
    metrics: [
      { label: 'Môn học', value: '08', note: 'Trong lớp 11A2' },
      { label: 'Hoạt động sắp tới', value: '03', note: 'Đã được giáo viên công bố' },
      { label: 'Bài học để xem', value: '05', note: 'Tài liệu đã công bố' },
    ],
    focusTitle: 'Gợi ý bắt đầu', focus: [
      { title: 'Xem bài Lịch sử sắp học', detail: 'Đọc học liệu và tóm tắt trước khi lên lớp.', tag: 'ĐỌC TRƯỚC' },
      { title: 'Ôn tập theo bài học', detail: 'Tạo câu hỏi từ học liệu môn học của lớp.', tag: 'TỰ ÔN' },
    ],
  },
}
