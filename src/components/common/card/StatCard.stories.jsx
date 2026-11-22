import StatCard from './StatCard';

export default {
  title: 'Common/StatCard',
  component: StatCard,
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: 'text',
      description: 'Tiêu đề thẻ thống kê',
    },
    value: {
      control: 'text',
      description: 'Giá trị hiển thị',
    },
    color: {
      control: 'select',
      options: ['blue', 'emerald', 'amber', 'rose', 'slate', 'violet'],
      description: 'Màu chủ đạo của thẻ',
    },
    subtext: {
      control: 'text',
      description: 'Văn bản phụ chú / chu kỳ',
    },
    tooltip: {
      control: 'text',
      description: 'Tooltip hiển thị khi hover',
    },
  },
};

export const Blue = {
  args: {
    title: 'Tổng số xe đang đỗ',
    value: '142',
    color: 'blue',
    subtext: '+12% so với hôm qua',
    tooltip: 'Tổng lượt xe hiện diện',
  },
};

export const Emerald = {
  args: {
    title: 'Ô đỗ còn trống',
    value: '58 / 200',
    color: 'emerald',
    subtext: 'Đang sẵn sàng đón xe',
  },
};

export const Amber = {
  args: {
    title: 'Cảnh báo quá giờ',
    value: '7',
    color: 'amber',
    subtext: 'Cần nhân viên kiểm tra',
  },
};

export const Rose = {
  args: {
    title: 'Sự cố / Thẻ mất',
    value: '2',
    color: 'rose',
    subtext: 'Đang chờ xử lý',
  },
};

export const Violet = {
  args: {
    title: 'Doanh thu hôm nay',
    value: '4,850,000 đ',
    color: 'violet',
    subtext: 'Đã thanh toán',
  },
};
