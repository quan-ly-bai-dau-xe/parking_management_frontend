# Coding Convention - Dự án Frontend Demo

Tài liệu này quy định các quy tắc viết code, naming convention và cách thức thực hiện để đảm bảo tính nhất quán, dễ bảo trì trong dự án.

## 1. Ngôn ngữ & Công nghệ

- **React 19** với Hooks (function components).
- **Vite** làm bundler/dev server.
- **Tailwind CSS** cho styling (không viết CSS inline).
- **JavaScript ES6+**.

## 2. Quy ước tên file & thư mục

- Component viết dạng **function**, tên file PascalCase: `UserCard.jsx`.
- Mỗi component được đặt trong **thư mục riêng** trong `src/components/`: `src/components/UserCard/UserCard.jsx`.
- File utility/helper: snake_case hoặc camelCase: `formatDate.js`, `apiClient.js`.
- File CSS: nếu cần, đặt cùng thư mục với component và có tiền tố `.module.css` (nếu dùng CSS Modules) hoặc `.scss`.

## 3. Component Structure

### Function Component
```jsx
import React from 'react';
import './UserCard.css';

const UserCard = ({ user }) => {
  return (
    <div className="card">
      <h3>{user.name}</h3>
    </div>
  );
};

export default UserCard;
```

### Props
- Định nghĩa type bằng TypeScript hoặc JSDoc (nếu không dùng TS).
- Props bắt buộc dùng `defaultProps` hoặc giá trị mặc định trong destructuring.

### State & Hooks
- Dùng `useState`, `useEffect` một cách có mục đích.
- Không gọi hook điều kiện (luôn gọi theo thứ tự nhất định).

## 4. Styling

- **Ưu tiên Tailwind CSS utility classes** thay vì viết CSS inline.
- Dùng utility classes của Tailwind: `flex`, `grid`, `bg-blue-600`, `text-slate-800`, `rounded-lg`, `shadow-sm`, ...
- Nếu cần custom style phức tạp, thêm vào file CSS cấu hình hoặc Tailwind theme directive.
- Không dùng inline style trừ khi thực sự cần thiết.

## 5. Import/Export

- Import React ở đầu file nếu dùng JSX.
- Export default cho component chính.
- Named export cho constants, utility functions.

## 6. Formatting & Linting

- Dùng **Prettier** để format tự động.
- Dùng **ESLint** để kiểm tra chất lượng code.
- Chạy `npm run lint` trước khi commit.
- Khoảng trắng: 2 spaces cho indent.

## 7. Comment & Documentation

- Comment bằng tiếng Việt hoặc tiếng Anh (nhất quán trong dự án).
- Comment phần nào phức tạp, giải thích lý do.
- Component quan trọng nên có JSDoc.

## 8. Quy tắc bắt buộc

### 8.1 Không được sửa code file của thành viên khác
- Mỗi thành viên chỉ sửa các file mình đang phụ trách.
- Nếu cần thay đổi chung, phải discuss trong nhóm và agree ai sẽ thực hiện.
- Không commit code mà không có review từ thành viên khác (nếu có quy trình review).

### 8.2 Trách nhiệm
- Mỗi người có trách nhiệm bảo vệ code của mình.
- Nếu tìm thấy mã khác có vấn đề, hãy thông báo cho người đó trực tiếp sửa đổi.
- Fix bug chỉ trong file liên quan, không rewrite toàn bộ nếu không cần thiết.

## 9. Quy trình làm việc

1. Tạo branch mới: `git checkout -b feature/<tên-tính-năng>`.
2. Viết code theo convention.
3. Chạy lint và fix errors.
4. Commit với message rõ ràng: `[feature/fix] Mô tả ngắn gọn`.
5. Tạo Pull Request (PR) và yêu cầu review.
6. Sau khi được approve, merge về main.

## 10. Tham khảo

- Tailwind CSS documentation: https://tailwindcss.com/
- React Hooks guide: https://react.dev/reference/hooks