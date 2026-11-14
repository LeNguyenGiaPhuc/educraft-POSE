export type StudentSubject = {
  id: string
  name: string
  teacher: string
  lessons: StudentLesson[]
}

export type StudentLesson = {
  id: string
  title: string
  subjectId: string
  readTime: string
  summary: string
  materials: string[]
}

export type ActivityType = 'quiz' | 'written' | 'notebook'

export type StudentActivity = {
  id: string
  title: string
  subject: string
  subjectId: string
  lesson: string
  lessonId: string
  due: string
  type: ActivityType
  status: 'open' | 'closed'
  description: string
}

export const currentSubjects: StudentSubject[] = [
  {
    id: 'history', name: 'Lịch sử', teacher: 'Cô Nguyễn Minh Anh',
    lessons: [
      { id: 'history-reform', title: 'Công cuộc Đổi mới từ năm 1986', subjectId: 'history', readTime: '12 phút', summary: 'Từ năm 1986, Việt Nam bắt đầu công cuộc Đổi mới với trọng tâm chuyển dần sang nền kinh tế nhiều thành phần vận hành theo cơ chế thị trường có sự quản lý của Nhà nước. Những thay đổi về kinh tế gắn với mở rộng quan hệ đối ngoại và cải thiện đời sống nhân dân.', materials: ['Lịch sử 11 · Bài 8, trang 52–57', 'Slide bài giảng · Công cuộc Đổi mới'] },
      { id: 'history-august', title: 'Cách mạng tháng Tám năm 1945', subjectId: 'history', readTime: '10 phút', summary: 'Thắng lợi của Cách mạng tháng Tám là kết quả của quá trình chuẩn bị lâu dài, sự lãnh đạo của Đảng và sức mạnh đoàn kết toàn dân. Thời cơ cách mạng xuất hiện khi Nhật Bản đầu hàng Đồng minh vào tháng 8 năm 1945.', materials: ['Lịch sử 11 · Bài 6, trang 38–43'] },
    ],
  },
  {
    id: 'biology', name: 'Sinh học', teacher: 'Thầy Trần Minh Quân',
    lessons: [
      { id: 'biology-circulation', title: 'Tuần hoàn máu ở động vật', subjectId: 'biology', readTime: '14 phút', summary: 'Hệ tuần hoàn vận chuyển các chất giữa những cơ quan trong cơ thể. Ở động vật, hệ tuần hoàn có thể là hệ tuần hoàn hở hoặc kín; hệ kín giúp máu lưu thông trong mạch và trao đổi chất hiệu quả hơn.', materials: ['Sinh học 11 · Bài 9, trang 61–66', 'Phiếu học tập · So sánh hệ tuần hoàn'] },
    ],
  },
  {
    id: 'literature', name: 'Ngữ văn', teacher: 'Cô Lê Thu Hà',
    lessons: [
      { id: 'literature-poem', title: 'Đọc hiểu thơ hiện đại', subjectId: 'literature', readTime: '9 phút', summary: 'Khi đọc một bài thơ hiện đại, hãy chú ý giọng điệu, hình ảnh trung tâm và cách tổ chức ngôn từ. Cần gắn nhận xét về nghệ thuật với cảm xúc hoặc ý nghĩa được thể hiện trong văn bản.', materials: ['Ngữ văn 11 · Chủ đề Thơ hiện đại'] },
    ],
  },
  { id: 'physics', name: 'Vật lý', teacher: 'Chưa phân công giáo viên', lessons: [] },
  { id: 'chemistry', name: 'Hóa học', teacher: 'Cô Trần Bảo Ngọc', lessons: [{ id: 'chemistry-equilibrium', title: 'Cân bằng hóa học', subjectId: 'chemistry', readTime: '10 phút', summary: 'Cân bằng hóa học là trạng thái phản ứng thuận nghịch khi tốc độ phản ứng thuận bằng tốc độ phản ứng nghịch. Nồng độ các chất giữ ổn định theo thời gian.', materials: ['Hóa học 11 · Bài 3'] }] },
  { id: 'mathematics', name: 'Toán', teacher: 'Thầy Đỗ Hoàng Nam', lessons: [{ id: 'math-sequence', title: 'Dãy số và giới hạn', subjectId: 'mathematics', readTime: '13 phút', summary: 'Dãy số là một hàm số xác định trên tập số tự nhiên khác không. Giới hạn mô tả xu hướng của các số hạng khi chỉ số tăng không giới hạn.', materials: ['Toán 11 · Chương 1'] }] },
  { id: 'english', name: 'Tiếng Anh', teacher: 'Cô Vũ Mai Phương', lessons: [{ id: 'english-environment', title: 'Protecting the environment', subjectId: 'english', readTime: '8 phút', summary: 'This lesson introduces practical ways students can reduce waste, save energy and protect natural resources in their communities.', materials: ['English 11 · Unit 3'] }] },
  { id: 'informatics', name: 'Tin học', teacher: 'Thầy Lê Thành Đạt', lessons: [{ id: 'informatics-data', title: 'Tổ chức dữ liệu trong bảng', subjectId: 'informatics', readTime: '9 phút', summary: 'Bảng giúp lưu trữ dữ liệu theo hàng và cột. Mỗi cột biểu diễn một thuộc tính, còn mỗi hàng lưu thông tin về một đối tượng.', materials: ['Tin học 11 · Bài 5'] }] },
]

export const formerSubjects: StudentSubject[] = [
  { id: 'former-history', name: 'Lịch sử', teacher: 'Thầy Phạm Quốc Huy', lessons: [{ id: 'former-history-lesson', title: 'Việt Nam từ năm 1858 đến cuối thế kỷ XIX', subjectId: 'former-history', readTime: 'Đã học', summary: 'Đây là học liệu được lưu từ lớp 10A3. Em có thể xem lại nội dung và kết quả trước đây; các hoạt động của lớp cũ chỉ còn quyền xem.', materials: ['Lịch sử 10 · Bài 12'] }] },
  { id: 'former-literature', name: 'Ngữ văn', teacher: 'Cô Đặng Thu Trang', lessons: [{ id: 'former-literature-lesson', title: 'Truyện ngắn Việt Nam hiện đại', subjectId: 'former-literature', readTime: 'Đã học', summary: 'Đây là học liệu được lưu từ lớp 10A3. Nội dung cũ vẫn có thể xem lại ở chế độ chỉ đọc.', materials: ['Ngữ văn 10 · Chủ đề 5'] }] },
]

export const activities: StudentActivity[] = [
  { id: 'quiz-history-reform', title: 'Ôn tập Công cuộc Đổi mới', subject: 'Lịch sử', subjectId: 'history', lesson: 'Công cuộc Đổi mới từ năm 1986', lessonId: 'history-reform', due: 'Hạn nộp 18:00, 18/11', type: 'quiz', status: 'open', description: '3 câu trắc nghiệm giúp em kiểm tra các mốc và nội dung chính của bài.' },
  { id: 'written-biology-circulation', title: 'Giải thích đường đi của máu', subject: 'Sinh học', subjectId: 'biology', lesson: 'Tuần hoàn máu ở động vật', lessonId: 'biology-circulation', due: 'Hạn nộp 20:00, 19/11', type: 'written', status: 'open', description: 'Trình bày đường đi của máu trong hệ tuần hoàn kín và nêu một ưu điểm.' },
  { id: 'notebook-history', title: 'Kiểm tra vở · Bài Công cuộc Đổi mới', subject: 'Lịch sử', subjectId: 'history', lesson: 'Công cuộc Đổi mới từ năm 1986', lessonId: 'history-reform', due: 'Mở đến 21:00, 20/11', type: 'notebook', status: 'open', description: 'Chụp trang vở có ghi các nội dung trọng tâm của bài. Có thể sửa hoặc xóa bài nộp hiện tại trước khi đợt nộp đóng.' },
  { id: 'notebook-closed-biology', title: 'Kiểm tra vở · Bài Tuần hoàn máu', subject: 'Sinh học', subjectId: 'biology', lesson: 'Tuần hoàn máu ở động vật', lessonId: 'biology-circulation', due: 'Đã chốt kết quả · 08/11', type: 'notebook', status: 'closed', description: 'Kết quả từng tiêu chí đã được giáo viên xem và chốt. Bài kiểm tra vở không có điểm tổng.' },
  { id: 'former-quiz-history', title: 'Ôn tập Việt Nam cuối thế kỷ XIX', subject: 'Lịch sử', subjectId: 'former-history', lesson: 'Việt Nam từ năm 1858 đến cuối thế kỷ XIX', lessonId: 'former-history-lesson', due: 'Đã chốt · 05/05/2026', type: 'quiz', status: 'closed', description: 'Kết quả đã lưu từ lớp 10A3.' },
  { id: 'notebook-former-history', title: 'Kiểm tra vở · Bài Việt Nam cuối thế kỷ XIX', subject: 'Lịch sử', subjectId: 'former-history', lesson: 'Việt Nam từ năm 1858 đến cuối thế kỷ XIX', lessonId: 'former-history-lesson', due: 'Đã chốt · 02/05/2026', type: 'notebook', status: 'closed', description: 'Kết quả từng tiêu chí đã được giáo viên chốt ở lớp cũ.' },
]

export const notebookCriteria = [
  'Ghi được năm bắt đầu công cuộc Đổi mới.',
  'Nêu được thay đổi trong phát triển kinh tế nhiều thành phần.',
  'Ghi được nội dung mở rộng quan hệ đối ngoại.',
]

export const assignedResultHistory = [
  { subject: 'Lịch sử', lesson: 'Công cuộc Đổi mới từ năm 1986', activity: 'Quiz · Bài 8', score: 80, date: '12/11', explanation: 'Em nắm được các nội dung chính. Xem lại câu về thay đổi trong quan hệ đối ngoại.', source: 'Lịch sử 11 · Bài 8, trang 54' },
  { subject: 'Sinh học', lesson: 'Tuần hoàn máu ở động vật', activity: 'Tự luận · Bài 9', score: 70, date: '10/11', explanation: 'Em mô tả đúng chiều lưu thông của máu. Bổ sung vai trò của mao mạch trong trao đổi chất.', source: 'Sinh học 11 · Bài 9, trang 63' },
  { subject: 'Hóa học', lesson: 'Cân bằng hóa học', activity: 'Quiz · Bài 3', score: 42, date: '09/11', explanation: 'Em đang nhầm tốc độ phản ứng thuận với nồng độ cân bằng. Ôn lại khái niệm cân bằng động trước khi làm bài tiếp theo.', source: 'Hóa học 11 · Bài 3, trang 21' },
]

export const closedNotebookResult = {
  activityId: 'notebook-closed-biology', finalizedAt: '08/11/2026',
  criteria: [
    { title: 'Nêu được chức năng vận chuyển của hệ tuần hoàn.', status: 'Đã ghi nhận', note: 'Giáo viên xác nhận nội dung có trong trang vở.' },
    { title: 'Phân biệt hệ tuần hoàn hở và kín.', status: 'Cần bổ sung', note: 'Bổ sung đặc điểm đường đi của máu trong hệ tuần hoàn kín.' },
    { title: 'Ghi được ưu điểm của hệ tuần hoàn kín.', status: 'Chưa xác định', note: 'Chữ viết trong ảnh chưa đủ rõ để kết luận.' },
  ],
}

export const calendarEvents = [
  { date: '18/11', time: '18:00', subject: 'Lịch sử', title: 'Hạn nộp quiz · Công cuộc Đổi mới', kind: 'quiz', activityId: 'quiz-history-reform' },
  { date: '19/11', time: '20:00', subject: 'Sinh học', title: 'Hạn nộp bài tự luận · Tuần hoàn máu', kind: 'written', activityId: 'written-biology-circulation' },
  { date: '20/11', time: '21:00', subject: 'Lịch sử', title: 'Đóng đợt nộp kiểm tra vở', kind: 'notebook', activityId: 'notebook-history' },
]
