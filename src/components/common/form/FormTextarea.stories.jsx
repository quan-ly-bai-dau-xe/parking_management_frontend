import FormTextarea from './FormTextarea';

export default {
  title: 'Common/Form/FormTextarea',
  component: FormTextarea,
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text', description: 'Nhãn textarea' },
    placeholder: { control: 'text', description: 'Placeholder gợi ý' },
    rows: { control: 'number', description: 'Số dòng hiển thị' },
    required: { control: 'boolean', description: 'Bắt buộc' },
    disabled: { control: 'boolean', description: 'Vô hiệu hóa' },
    error: { control: 'text', description: 'Thông báo lỗi' },
    helperText: { control: 'text', description: 'Gợi ý phụ trợ' },
  },
};

export const Default = {
  args: {
    label: 'Ghi chú lý do đóng phiên cưỡng bức',
    placeholder: 'Nhập chi tiết lý do (khách mất thẻ, xe cứu hộ kéo ra)...',
    rows: 3,
    helperText: 'Tối đa 255 ký tự',
  },
};

export const WithError = {
  args: {
    label: 'Ghi chú kiểm tra sự cố',
    value: '',
    rows: 4,
    required: true,
    error: 'Vui lòng cung cấp mô tả chi tiết sự cố trước khi lưu.',
  },
};
