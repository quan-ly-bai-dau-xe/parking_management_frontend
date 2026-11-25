import FormSelect from './FormSelect';

export default {
  title: 'Common/Form/FormSelect',
  component: FormSelect,
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text', description: 'Nhãn trường chọn' },
    placeholder: { control: 'text', description: 'Gợi ý chọn' },
    required: { control: 'boolean', description: 'Bắt buộc' },
    disabled: { control: 'boolean', description: 'Vô hiệu hóa' },
    error: { control: 'text', description: 'Thông báo lỗi' },
    helperText: { control: 'text', description: 'Gợi ý phụ trợ' },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Kích cỡ select',
    },
  },
};

const options = [
  { value: 'monthly', label: 'Vé tháng (30 ngày)' },
  { value: 'quarterly', label: 'Vé quý (90 ngày)' },
  { value: 'yearly', label: 'Vé năm (365 ngày)' },
];

export const Default = {
  args: {
    label: 'Loại vé đăng ký',
    options,
    placeholder: 'Chọn gói vé...',
    size: 'md',
  },
};

export const Required = {
  args: {
    label: 'Khu vực ưu tiên',
    options: [
      { value: 'zone_a', label: 'Khu A (Gần thang máy)' },
      { value: 'zone_b', label: 'Khu B (Khu vực sạc xe điện)' },
    ],
    required: true,
  },
};

export const WithError = {
  args: {
    label: 'Phương thức thanh toán',
    options: [
      { value: 'cash', label: 'Tiền mặt' },
      { value: 'vietqr', label: 'Chuyển khoản VietQR' },
    ],
    error: 'Vui lòng chọn phương thức thanh toán.',
  },
};
