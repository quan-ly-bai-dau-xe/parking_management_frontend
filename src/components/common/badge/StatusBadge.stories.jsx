import StatusBadge from './StatusBadge';

export default {
  title: 'Common/StatusBadge',
  component: StatusBadge,
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: ['parked', 'active', 'in_transit', 'left', 'maintenance'],
      description: 'Mã trạng thái',
    },
    size: {
      control: 'inline-radio',
      options: ['sm', 'md'],
      description: 'Kích cỡ badge',
    },
    showDot: {
      control: 'boolean',
      description: 'Hiển thị chấm tròn chỉ báo màu',
    },
    label: {
      control: 'text',
      description: 'Nhãn ghi đè tùy chỉnh',
    },
  },
};

export const Parked = {
  args: {
    status: 'parked',
    size: 'sm',
    showDot: true,
  },
};

export const Active = {
  args: {
    status: 'active',
    size: 'sm',
    showDot: true,
  },
};

export const InTransit = {
  args: {
    status: 'in_transit',
    size: 'sm',
    showDot: true,
  },
};

export const Left = {
  args: {
    status: 'left',
    size: 'sm',
    showDot: true,
  },
};

export const Maintenance = {
  args: {
    status: 'maintenance',
    size: 'sm',
    showDot: true,
  },
};
