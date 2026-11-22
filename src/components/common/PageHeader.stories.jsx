import PageHeader from './PageHeader';

export default {
  title: 'Common/PageHeader',
  component: PageHeader,
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: 'text',
      description: 'Tiêu đề trang',
    },
    description: {
      control: 'text',
      description: 'Mô tả ngắn trang',
    },
  },
};

export const Default = {
  args: {
    title: 'Quản lý phương tiện',
    description: 'Danh sách và trạng thái toàn bộ phương tiện đăng ký gửi xe trong hệ thống.',
  },
};

export const WithActions = {
  args: {
    title: 'Giám sát vào / ra bãi đỗ',
    description: 'Theo dõi trực tiếp lưu lượng xe ra vào qua camera OCR và cảm biến.',
    breadcrumb: 'Trang chủ / Giám sát /',
    actions: (
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50 cursor-pointer shadow-2xs"
        >
          Xuất báo cáo
        </button>
        <button
          type="button"
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg cursor-pointer shadow-2xs"
        >
          + Check-in xe
        </button>
      </div>
    ),
  },
};
