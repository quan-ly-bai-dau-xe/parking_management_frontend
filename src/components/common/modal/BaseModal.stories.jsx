import { useState } from 'react';
import BaseModal from './BaseModal';
import Button from '../button/Button';

export default {
  title: 'Common/BaseModal',
  component: BaseModal,
  tags: ['autodocs'],
  argTypes: {
    isOpen: {
      control: 'boolean',
      description: 'Trạng thái mở/đóng modal',
    },
    title: {
      control: 'text',
      description: 'Tiêu đề modal',
    },
    description: {
      control: 'text',
      description: 'Mô tả phụ bên dưới tiêu đề',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', 'full'],
      description: 'Kích cỡ bề ngang của modal',
    },
    showCloseButton: {
      control: 'boolean',
      description: 'Hiển thị nút đóng ✕ ở góc trên bên phải',
    },
    closeOnBackdrop: {
      control: 'boolean',
      description: 'Cho phép bấm vào backdrop để đóng',
    },
    closeOnEsc: {
      control: 'boolean',
      description: 'Cho phép bấm phím ESC để đóng',
    },
    onClose: { action: 'closed' },
  },
};

const Template = (args) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="p-6">
      <Button variant="primary" onClick={() => setOpen(true)}>
        Mở Modal Demo
      </Button>
      <BaseModal
        {...args}
        isOpen={open || args.isOpen}
        onClose={() => {
          setOpen(false);
          args.onClose?.();
        }}
      />
    </div>
  );
};

export const Default = Template.bind({});
Default.args = {
  isOpen: false,
  title: 'Tiêu đề Modal mẫu',
  description: 'Mô tả giải thích thêm nội dung hoặc mục đích của modal này.',
  size: 'md',
  children: (
    <div className="space-y-3 text-sm text-slate-600">
      <p>
        Đây là nội dung hiển thị bên trong BaseModal. Modal hỗ trợ cuộn trang
        linh hoạt khi nội dung quá dài mà không làm vỡ giao diện.
      </p>
      <p>
        Người dùng có thể đóng modal bằng cách bấm nút ✕, click ra ngoài
        backdrop, hoặc bấm phím ESC trên bàn phím.
      </p>
    </div>
  ),
  footer: (
    <div className="flex justify-end gap-2.5">
      <Button variant="outline" size="sm">
        Hủy bỏ
      </Button>
      <Button variant="primary" size="sm">
        Xác nhận
      </Button>
    </div>
  ),
};

export const LargeFormModal = Template.bind({});
LargeFormModal.args = {
  isOpen: false,
  title: 'Chỉnh sửa thông tin',
  description: 'Cập nhật các thông số chi tiết trong biểu mẫu.',
  size: 'xl',
  children: (
    <div className="space-y-4 text-xs">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="font-semibold text-slate-700">Họ và tên</label>
          <input
            type="text"
            defaultValue="Nguyễn Văn A"
            className="h-9 px-3 border border-slate-300 rounded-lg text-slate-800"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-semibold text-slate-700">Số điện thoại</label>
          <input
            type="text"
            defaultValue="0987654321"
            className="h-9 px-3 border border-slate-300 rounded-lg text-slate-800"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label className="font-semibold text-slate-700">Ghi chú</label>
        <textarea
          rows={3}
          placeholder="Nhập ghi chú chi tiết..."
          className="p-2.5 border border-slate-300 rounded-lg text-slate-800"
        />
      </div>
    </div>
  ),
  footer: (
    <div className="flex justify-end gap-2">
      <Button variant="outline" size="sm">
        Hủy
      </Button>
      <Button variant="primary" size="sm">
        Lưu thay đổi
      </Button>
    </div>
  ),
};

export const SmallModal = Template.bind({});
SmallModal.args = {
  isOpen: false,
  title: 'Thông báo',
  size: 'sm',
  children: (
    <p className="text-xs text-slate-600">
      Hành động của bạn đã được ghi nhận vào hệ thống.
    </p>
  ),
  footer: (
    <div className="flex justify-end">
      <Button variant="primary" size="sm">
        Đã hiểu
      </Button>
    </div>
  ),
};
