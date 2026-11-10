# EduCraft frontend

Giai đoạn đầu: giao diện đăng nhập và khung điều hướng riêng cho Admin, Teacher, Student. Dữ liệu đang là ví dụ tách tại `src/data/`; chưa có kết nối API hay xác thực thật.

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

Mật khẩu chung: `demo123`. Nút chọn tài khoản trên trang đăng nhập tự điền thông tin. Phiên xem trước chỉ nằm trong tab trình duyệt. Route theo vai trò chỉ là hàng rào giao diện; khi làm backend, xác thực và phân quyền phải được kiểm tra tại API.

## Cấu trúc chính

- `src/data/demo.ts`: tài khoản và phiên mẫu.
- `src/data/navigation.ts`: menu theo vai trò.
- `src/data/overview.ts`: nội dung tổng quan mẫu.
- `src/components/RoleLayout.tsx`: sidebar và thanh đầu trang dùng chung.
- `src/pages/`: đăng nhập, tổng quan và trang khung cho các chức năng sau.

Chưa nhập dữ liệu thật, mật khẩu thật hoặc khóa API vào frontend.
