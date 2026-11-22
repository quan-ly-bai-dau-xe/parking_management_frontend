import EmptyState from './EmptyState';

export default {
  title: 'Common/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: 'text',
      description: 'Tiêu đề trạng thái trống',
    },
    description: {
      control: 'text',
      description: 'Mô tả chi tiết',
    },
  },
};

export const Default = {
  args: {
    title: 'Chưa có dữ liệu',
    description: 'Hiện chưa có bản ghi nào được ghi nhận trong hệ thống.',
  },
};

export const WithAction = {
  args: {
    title: 'Không tìm thấy phương tiện',
    description: 'Thử kiểm tra lại biển số xe hoặc thêm phương tiện mới vào hệ thống.',
    action: (
      <button
        type="button"
        className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-2xs transition-colors"
      >
        + Thêm phương tiện mới
      </button>
    ),
  },
};
