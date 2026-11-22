import FilterSelect from './FilterSelect';

export default {
  title: 'Common/FilterSelect',
  component: FilterSelect,
  tags: ['autodocs'],
  argTypes: {
    label: {
      control: 'text',
      description: 'Nhãn phía trên dropdown',
    },
    placeholder: {
      control: 'text',
      description: 'Văn bản hiển thị khi chưa chọn',
    },
    disabled: {
      control: 'boolean',
      description: 'Vô hiệu hóa select',
    },
  },
};

const sampleOptions = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'active', label: 'Đang hoạt động' },
  { value: 'expired', label: 'Hết hạn' },
  { value: 'cancelled', label: 'Đã hủy' },
];

export const Default = {
  args: {
    label: 'Trạng thái vé',
    value: '',
    options: sampleOptions,
    placeholder: 'Tất cả trạng thái',
  },
};

export const Selected = {
  args: {
    label: 'Loại phương tiện',
    value: 'car',
    options: [
      { value: 'car', label: 'Ô tô' },
      { value: 'moto', label: 'Xe máy' },
      { value: 'bike', label: 'Xe đạp' },
    ],
    placeholder: 'Chọn loại xe',
  },
};

export const Disabled = {
  args: {
    label: 'Khu vực đỗ xe',
    value: '',
    options: sampleOptions,
    disabled: true,
    placeholder: 'Không khả dụng',
  },
};
