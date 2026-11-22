import SearchableCombobox from './SearchableCombobox';

export default {
  title: 'Common/Form/SearchableCombobox',
  component: SearchableCombobox,
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text', description: 'Tiêu đề trường chọn' },
    placeholder: { control: 'text', description: 'Placeholder gợi ý tìm kiếm' },
    emptyText: { control: 'text', description: 'Thông báo khi không có kết quả' },
    required: { control: 'boolean', description: 'Bắt buộc chọn' },
    disabled: { control: 'boolean', description: 'Vô hiệu hóa' },
    error: { control: 'text', description: 'Thông báo lỗi' },
    onChange: { action: 'changed' },
  },
};

const customerOptions = [
  { value: 1, label: 'Nguyễn Văn An', subLabel: '0901 234 567', badge: 'VIP' },
  { value: 2, label: 'Trần Thị Bình', subLabel: '0912 345 678', badge: 'Cư dân' },
  { value: 3, label: 'Lê Hoàng Nam', subLabel: '0988 765 432', badge: 'Vãng lai' },
  { value: 4, label: 'Phạm Minh Đức', subLabel: '0933 221 100', badge: 'Cư dân' },
];

export const Default = {
  args: {
    label: 'Khách hàng',
    options: customerOptions,
    placeholder: 'Tìm kiếm khách hàng theo tên, SĐT...',
    value: 1,
  },
};

export const EmptySelection = {
  args: {
    label: 'Chỉ định phương tiện',
    options: [
      { value: '29A-123.45', label: '29A-123.45', subLabel: 'Toyota Camry' },
      { value: '30E-999.88', label: '30E-999.88', subLabel: 'Mazda CX-5' },
    ],
    placeholder: 'Chọn biển số xe...',
    required: true,
  },
};

export const WithError = {
  args: {
    label: 'Vị trí ô đỗ',
    options: [],
    placeholder: 'Tìm ô đỗ...',
    error: 'Chưa chọn vị trí ô đỗ xe hợp lệ.',
  },
};
