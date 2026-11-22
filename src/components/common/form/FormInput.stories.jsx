import FormInput from './FormInput';

export default {
  title: 'Common/Form/FormInput',
  component: FormInput,
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text', description: 'Nhãn trường nhập liệu' },
    placeholder: { control: 'text', description: 'Placeholder gợi ý' },
    required: { control: 'boolean', description: 'Bắt buộc nhập' },
    disabled: { control: 'boolean', description: 'Vô hiệu hóa' },
    readOnly: { control: 'boolean', description: 'Chỉ đọc' },
    error: { control: 'text', description: 'Thông báo lỗi' },
    helperText: { control: 'text', description: 'Gợi ý phụ trợ' },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Kích cỡ input',
    },
  },
};

export const Default = {
  args: {
    label: 'Biển số xe',
    placeholder: 'Ví dụ: 30A-123.45',
    size: 'md',
  },
};

export const Required = {
  args: {
    label: 'Họ và tên chủ xe',
    placeholder: 'Nguyễn Văn A',
    required: true,
    helperText: 'Vui lòng nhập đúng họ tên trên giấy tờ xe',
  },
};

export const WithError = {
  args: {
    label: 'Số điện thoại',
    value: '0987xxx',
    error: 'Số điện thoại không hợp lệ (cần đủ 10 chữ số).',
  },
};

export const Disabled = {
  args: {
    label: 'Mã thẻ RFID',
    value: 'TAG-8829-019',
    disabled: true,
    helperText: 'Mã định danh thẻ đọc tự động, không thể chỉnh sửa',
  },
};
