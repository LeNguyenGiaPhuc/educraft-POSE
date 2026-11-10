# EduCraft database

Schema PostgreSQL của TLCN nằm ở `prisma/schema.prisma`. Migration khởi tạo nằm ở `prisma/migrations/20261109_init/migration.sql`. Đây là database mới; không nhập schema từ project môn học cũ.

## Chạy trên máy cá nhân

Yêu cầu: Node.js, npm, Docker Desktop với Docker engine đang chạy.

1. Trong thư mục `backend`, chạy `npm ci`.
2. Sao chép `.env.example` thành `.env`. Tài khoản/mật khẩu trong ví dụ **chỉ dùng trên máy cá nhân**.
3. Chạy `docker compose up -d db` và đợi healthcheck của `db` đạt `healthy`.
4. Chạy `npm run db:deploy` để áp migration đã được lưu trong Git. Không dùng `prisma db push` vì nó bỏ qua các ràng buộc SQL viết tay.
5. Chạy `npm run db:generate` để tạo Prisma Client, rồi `npm run db:validate` để kiểm tra schema.

Nếu dùng Supabase PostgreSQL, thay `DATABASE_URL` bằng chuỗi kết nối PostgreSQL của dự án Supabase rồi chạy `npm run db:deploy`. Giữ URL và mật khẩu trong `.env` riêng, không commit. Khi chạy migration trên Supabase, dùng kết nối có quyền tạo bảng, enum, function và trigger. Backend là nơi duy nhất truy cập database; không cấp cho trình duyệt quyền đọc trực tiếp các bảng chứa dữ liệu học sinh, chat, ảnh hay kết quả AI tạm.

## Những quyết định đã đưa vào schema

- `classroom_enrollments` giữ nhiều lớp cũ và chỉ tối đa một lớp hiện tại mỗi học sinh. Lớp lưu trữ và kết quả cũ không bị xóa.
- `notebook_check_activities` có mốc khóa tiêu chí; mỗi lần mở nộp là một `notebook_check_periods` có hạn riêng. Bài nộp giữ một ID trong một kỳ; ảnh thay được khi kỳ còn mở.
- `notebook_ai_drafts` chứa OCR/gợi ý **tạm**, chỉ cho giáo viên xem. `notebook_assessments` và `criterion_results` chỉ được ghi trong giao dịch khi giáo viên chốt.
- `ai_chat_turns` giữ trạng thái một lượt hỏi; `ai_messages` lưu tối đa một prompt và một phản hồi cho lượt đó. `subject_prompt_topics` lưu danh sách chủ đề theo học sinh, môn/lớp và kỳ, không chứa nguyên văn chat.
- `material_versions` giữ phiên bản cũ để trích dẫn lịch sử. Truy hồi AI mới phải chọn phiên bản đã công bố, xử lý thành công, có `version_no` lớn nhất của mỗi tài liệu.
- `lesson_score_results.occurred_at` xác định thứ tự **học sinh làm bài**; tiến độ được tính lại theo thứ tự này nếu AI chấm một bài cũ muộn.

## Quy tắc backend phải kiểm tra trong giao dịch

Một FK đơn lẻ không thể xác nhận các quan hệ xuyên bảng sau. Khi viết API, không gọi `create`/`update` trực tiếp mà bỏ các kiểm tra này:

1. Admin chỉ phân học sinh vào lớp `ACTIVE`; kết thúc enrollment cũ và mở enrollment mới trong một transaction. Học sinh chưa có enrollment vẫn đăng nhập được. Quyền **đọc** lớp cũ dựa trên enrollment lịch sử; quyền tạo bài, chat, tự ôn, nộp bài mới dựa trên lớp hiện tại.
2. `classroom_subjects.teacher_id` phải là giáo viên có `teacher_profiles.specialized_subject_id = subject_id`. Giáo viên chỉ tạo/công bố bài học, hoạt động, lịch ở môn/lớp mình đang phụ trách và lớp `ACTIVE`.
3. Bài kiểm tra vở chỉ công bố khi có ít nhất một ảnh vở mẫu hợp lệ và một tiêu chí đã xác nhận. Sau bài nộp hợp lệ đầu tiên, đặt `criteria_locked_at` một lần; xóa bài nộp không mở khóa tiêu chí. Khi thay ảnh trong kỳ mở, xóa gợi ý AI cũ và đặt xử lý về `PENDING`.
4. Khi đóng kỳ nộp vở, khóa bài hiện tại. Giao dịch chốt phải tạo đúng một `notebook_assessments`, một `criterion_results` cho **mỗi** tiêu chí của activity, và đổi bài nộp thành `FINALIZED`. Không chốt nếu bài chưa khóa. Nếu AI lỗi, giáo viên vẫn nhập kết quả từng tiêu chí và chốt bằng tay. Sau chốt, có thể xóa `notebook_ai_drafts`; không sửa kết quả cũ khi mở kỳ mới.
5. Question phải thuộc đúng phạm vi lesson của activity hoặc self-practice; đáp án phải thuộc đúng question của bài nộp/phiên tự ôn; điểm câu không vượt `max_points`; tổng điểm không vượt tổng điểm câu. Quiz cần lựa chọn và đáp án; tự luận cần tiêu chí chấm. Khi đã có bài nộp, không sửa đề, đáp án hoặc nguồn trích dẫn cũ.
6. Citation phải trỏ tới segment của tài liệu đã công bố, xử lý thành công, thuộc lesson/môn được phép ở thời điểm tạo. Link cũ vẫn mở được khi học sinh đã chuyển lớp; chỉ học sinh sở hữu và giáo viên có quyền mới được xem bài/kết quả tương ứng.
7. Lưu câu hỏi chat trước khi gọi AI; retry trên cùng `ai_chat_turns.id`. Khi chưa rõ môn hoặc hỏi nhiều môn, không gán `attributed_classroom_subject_id` và không đưa vào danh sách chủ đề của một môn. Giáo viên chỉ đọc `subject_prompt_topics` theo học sinh và môn mình phụ trách; không đọc `ai_messages` của học sinh.
8. Chỉ ghi `lesson_score_results` sau khi chấm quiz/tự luận thành công; kiểm tra vở không vào biểu đồ điểm. Ghi kết quả và tính lại `student_lesson_progress` theo `(occurred_at, id)` trong transaction; dưới 50% đánh dấu khó, từ 70% trở lên bỏ dấu, khoảng giữa giữ nguyên. Giáo viên chỉ xem `ASSIGNED`; học sinh xem hai luồng tách biệt.
9. Khi công bố lịch hoặc activity, tạo notification cho học sinh đang thuộc lớp, một lần cho mỗi nguồn. Không tạo thông báo khi chỉ mở lịch hay trang chuông.

File ở private local storage. Database chỉ giữ `storage_key` và metadata; API phải xác thực trước khi trả file. Không xóa file hoặc bản ghi được bài làm, kết quả hay trích dẫn lịch sử tham chiếu.

## Giới hạn kiểm tra hiện tại

`prisma validate` và `prisma generate` đã chạy, migration SQL đã được phân tích cú pháp. Chưa áp migration lên PostgreSQL thật trên máy này vì Docker engine chưa chạy và chưa có `DATABASE_URL` của một máy chủ PostgreSQL. Cần chạy `npm run db:deploy` khi có database, sau đó thử các transaction API nêu trên.
