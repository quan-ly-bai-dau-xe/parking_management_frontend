import LoadingSpinner from './LoadingSpinner';

export default {
  title: 'Common/LoadingSpinner',
  component: LoadingSpinner,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
      description: 'Kích cỡ spinner',
    },
    color: {
      control: 'text',
      description: 'Tailwind class màu sắc',
    },
    label: {
      control: 'text',
      description: 'Nhãn văn bản hiển thị kèm theo',
    },
    fullScreen: {
      control: 'boolean',
      description: 'Hiển thị toàn màn hình',
    },
  },
};

export const Default = {
  args: {
    size: 'md',
    label: 'Đang tải dữ liệu...',
  },
};

export const Small = {
  args: {
    size: 'sm',
    label: '',
  },
};

export const Large = {
  args: {
    size: 'lg',
    color: 'text-emerald-600',
    label: 'Đang xử lý giao dịch...',
  },
};

export const ExtraLarge = {
  args: {
    size: 'xl',
    color: 'text-indigo-600',
    label: 'Khởi tạo bãi xe Smart Mobility...',
  },
};
