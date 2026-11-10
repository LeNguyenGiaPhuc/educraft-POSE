export type AiScenario = 'current' | 'unassigned' | 'history-only'

export const summaryLessons = [
  { id: 'lesson-cmt8-11a2', subjectId: 'history-11a2', title: 'Cách mạng tháng Tám năm 1945', subject: 'Lịch sử', published: true, processed: true, materialId: 'material-cmt8-slide', material: 'Bai-1-Cach-mang-thang-Tam.pdf', version: 2, position: 'Trang 3', excerpt: 'Thời cơ tổng khởi nghĩa xuất hiện khi Nhật đầu hàng Đồng minh; nhân dân Việt Nam đã chuẩn bị lực lượng để giành chính quyền.', summary: 'Thắng lợi của Cách mạng tháng Tám gắn với việc chuẩn bị lực lượng và chớp thời cơ khi Nhật đầu hàng Đồng minh.' },
  { id: 'lesson-math-functions', subjectId: '11a2-math', title: 'Hàm số lượng giác', subject: 'Toán', published: true, processed: true, materialId: 'material-math-functions', material: 'Ham-so-luong-giac.pdf', version: 1, position: 'Trang 2', excerpt: 'Hàm số y = sin x có tập xác định là R, tập giá trị là [-1; 1] và chu kỳ 2π.', summary: 'Hàm số sin xác định trên R, nhận giá trị từ -1 đến 1 và tuần hoàn với chu kỳ 2π.' },
  { id: 'lesson-history-scan', subjectId: 'history-11a2', title: 'Tư liệu bổ sung: Cách mạng tháng Tám', subject: 'Lịch sử', published: true, processed: false, materialId: 'material-history-scan', material: 'Tu-lieu-bo-sung.pdf', version: 1, position: '', excerpt: '', summary: '' },
]

export function getSummarySources(lessonId: string, scenario: AiScenario) {
  return scenario === 'current' ? summaryLessons.filter((lesson) => lesson.id === lessonId && lesson.published && lesson.processed) : []
}
