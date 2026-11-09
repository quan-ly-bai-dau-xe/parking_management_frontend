import { useState } from 'react';
import ConfirmModal from './ConfirmModal';
import Button from '../button/Button';

export default {
  title: 'Common/ConfirmModal',
  component: ConfirmModal,
  tags: ['autodocs'],
  argTypes: {
    isOpen: {
      control: 'boolean',
      description: 'Trạng thái hiển thị modal',
    },
    title: {
      control: 'text',
      description: 'Tiêu đề modal xác nhận',
    },
    description: {
      control: 'text',
      description: 'Mô tả chi tiết hành động',
    },
    variant: {
      control: 'select',
      options: ['info', 'success', 'warning', 'error'],
      description: 'Màu sắc và icon ngữ nghĩa tương ứng',
    },
    confirmText: {
      control: 'text',
      description: 'Nhãn nút bấm xác nhận',
    },
    cancelText: {
      control: 'text',
      description: 'Nhãn nút bấm hủy',
    },
    loading: {
      control: 'boolean',
      description: 'Trạng thái đang thực hiện hành động xác nhận',
    },
    showFooter: {
      control: 'boolean',
      description: 'Hiển thị hàng nút bấm footer',
    },
    showCloseButton: {
      control: 'boolean',
      description: 'Hiển thị nút đóng ✕ ở góc trên bên phải',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl', '2xl'],
      description: 'Kích cỡ chiều rộng tối đa',
    },
    onClose: { action: 'closed' },
    onConfirm: { action: 'confirmed' },
  },
};

const Template = (args) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="p-6">
      <Button
        variant={args.variant === 'error' ? 'danger' : 'primary'}
        onClick={() => setOpen(true)}
      >
        Mở ConfirmModal ({args.variant})
      </Button>
      <ConfirmModal
        {...args}
        isOpen={open || args.isOpen}
        onClose={() => {
          setOpen(false);
          args.onClose?.();
        }}
        onConfirm={() => {
          setOpen(false);
          args.onConfirm?.();
        }}
      />
    </div>
  );
};

export const Info = Template.bind({});
Info.args = {
  isOpen: false,
  variant: 'info',
  title: 'Xác nhận thông tin',
  description: 'Bạn có muốn cập nhật lại cấu hình hệ thống bãi đỗ xe không?',
  confirmText: 'Xác nhận',
  cancelText: 'Hủy',
};

export const Warning = Template.bind({});
Warning.args = {
  isOpen: false,
  variant: 'warning',
  title: 'Cảnh báo vé sắp hết hạn',
  description: 'Khách hàng này hiện còn 2 ngày trước khi vé tháng hết hạn. Bạn có chắc muốn tiếp tục?',
  confirmText: 'Tiếp tục',
  cancelText: 'Quay lại',
};

export const DangerError = Template.bind({});
DangerError.args = {
  isOpen: false,
  variant: 'error',
  title: 'Xác nhận xóa khách hàng',
  description: 'Hành động này không thể hoàn tác. Toàn bộ lịch sử và vé liên quan sẽ bị vô hiệu hóa.',
  confirmText: 'Xóa vĩnh viễn',
  cancelText: 'Hủy bỏ',
};

export const Success = Template.bind({});
Success.args = {
  isOpen: false,
  variant: 'success',
  title: 'Gia hạn thành công',
  description: 'Vé tháng đã được gia hạn thêm 30 ngày. Bạn có muốn in biên lai ngay bây giờ?',
  confirmText: 'In biên lai',
  cancelText: 'Đóng',
};
