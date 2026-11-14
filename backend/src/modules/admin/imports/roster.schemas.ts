import { z } from 'zod';

export const rosterRowSchema = z.object({
  line: z.number().int().min(2),
  fullName: z.string().trim().min(1, 'Họ và tên không được để trống'),
  username: z.string().trim().min(1, 'Tên đăng nhập không được để trống'),
  contact: z.string().trim().min(1, 'Thông tin liên hệ không được để trống'),
});

export const commitRosterSchema = z.object({
  validationToken: z.string().min(1, 'Thiếu mã xác thực import'),
  defaultPassword: z
    .string()
    .min(8, 'Mật khẩu khởi tạo phải từ 8 ký tự trở lên')
    .max(100, 'Mật khẩu quá dài'),
  rows: z.array(rosterRowSchema).min(1, 'Danh sách học sinh không được rỗng'),
});

export const classroomIdParamSchema = z.object({
  id: z.string().uuid('ID lớp học không hợp lệ'),
});

export type CommitRosterInput = z.infer<typeof commitRosterSchema>;
