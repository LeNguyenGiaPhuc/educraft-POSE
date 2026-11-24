# EduCraft frontend

Admin và Teacher đăng nhập, lấy dữ liệu và thao tác qua backend API. Student hiện vẫn dùng bản mô phỏng bằng fixture để xem UI.

## Chạy trên máy

```powershell
cd frontend
npm install
npm run dev
```

Mở địa chỉ Vite in ra trong terminal. Kiểm tra mã bằng `npm run lint` và `npm run build`.

## Tài khoản xem trước

| Vai trò | Email |
| --- | --- |
| Admin | `admin@demo.educraft` |
| Teacher | `teacher@demo.educraft` |
| Student | `student@demo.educraft` |

Mật khẩu demo chung: `demo123`. Nút chọn tài khoản trên trang đăng nhập tự điền thông tin. Admin/Teacher dùng session backend; Student dùng phiên mô phỏng trong trình duyệt.

## Cấu trúc chính

- `src/data/demo.ts`: tài khoản và phiên mẫu.
- `src/data/navigation.ts`: menu theo vai trò.
- `src/lib/api/adminDashboard.ts`: API tổng quan Admin.
- `src/lib/api/teacher/dashboard.ts`: API tổng quan Teacher.
- `src/components/RoleLayout.tsx`: sidebar và thanh đầu trang dùng chung.
- `src/pages/LoginPage.tsx`: màn hình đăng nhập.
- `src/features/admin/overview/` và `src/features/teacher/overview/`: tổng quan dùng dữ liệu backend.

Không đưa mật khẩu thật hoặc khóa Gemini vào frontend. Khóa AI chỉ được cấu hình ở backend.
