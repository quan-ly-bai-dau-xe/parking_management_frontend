import Button from './Button';

export default {
  title: 'Common/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline', 'ghost', 'danger', 'dangerOutline'],
      description: 'Kiểu hiển thị của button',
    },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'icon', 'icon-sm', 'icon-xs'],
      description: 'Kích cỡ button',
    },
    disabled: {
      control: 'boolean',
      description: 'Vô hiệu hóa button',
    },
    loading: {
      control: 'boolean',
      description: 'Hiển thị trạng thái đang xử lý',
    },
    fullWidth: {
      control: 'boolean',
      description: 'Chiếm 100% chiều rộng container',
    },
    onClick: { action: 'clicked' },
  },
};

export const Primary = {
  args: {
    variant: 'primary',
    children: 'Xác nhận tạo vé',
    size: 'md',
  },
};

export const Secondary = {
  args: {
    variant: 'secondary',
    children: 'Hủy bỏ',
    size: 'md',
  },
};

export const Danger = {
  args: {
    variant: 'danger',
    children: 'Xóa bản ghi',
    size: 'md',
  },
};

export const Loading = {
  args: {
    variant: 'primary',
    children: 'Đang lưu...',
    loading: true,
    size: 'md',
  },
};

export const Outline = {
  args: {
    variant: 'outline',
    children: 'Xuất file Excel',
    size: 'md',
  },
};
