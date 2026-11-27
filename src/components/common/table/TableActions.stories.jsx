import TableActions from './TableActions';

export default {
  title: 'Common/Table/TableActions',
  component: TableActions,
  tags: ['autodocs'],
  argTypes: {
    actions: {
      description: 'Mảng các cấu hình nút hành động: [{ label, icon, onClick, title, className, disabled }]',
    },
  },
};

export const Default = {
  args: {
    actions: [
      {
        label: 'Xem',
        icon: 'view',
        title: 'Xem chi tiết lượt gửi',
        onClick: () => console.log('Xem chi tiết'),
      },
      {
        label: 'Sửa',
        icon: 'edit',
        title: 'Chỉnh sửa thông tin',
        onClick: () => console.log('Chỉnh sửa'),
      },
      {
        label: 'Xóa',
        icon: 'delete',
        title: 'Xóa bản ghi',
        className: 'text-rose-600 hover:text-rose-800',
        onClick: () => console.log('Xóa'),
      },
    ],
  },
};

export const TicketActions = {
  args: {
    actions: [
      {
        label: 'Xem',
        icon: 'view',
        title: 'Xem chi tiết vé',
        onClick: () => console.log('Xem chi tiết vé'),
      },
      {
        label: 'Gia hạn',
        icon: 'renew',
        title: 'Gia hạn vé tháng',
        className: 'text-emerald-600 hover:text-emerald-800',
        onClick: () => console.log('Gia hạn vé'),
      },
      {
        label: 'Hủy vé',
        icon: 'delete',
        title: 'Hủy vé định kỳ',
        className: 'text-rose-600 hover:text-rose-800',
        onClick: () => console.log('Hủy vé'),
      },
    ],
  },
};

export const EmployeeActions = {
  args: {
    actions: [
      {
        label: 'Sửa',
        icon: 'edit',
        title: 'Sửa thông tin nhân viên',
        onClick: () => console.log('Mở modal sửa'),
      },
      {
        label: 'Khóa',
        icon: 'lock',
        title: 'Khóa tài khoản nhân viên',
        className: 'text-amber-600 hover:text-amber-800',
        onClick: () => console.log('Khóa tài khoản'),
      },
      {
        label: 'Kích hoạt',
        icon: 'refresh',
        title: 'Kích hoạt lại',
        disabled: true,
        onClick: () => console.log('Kích hoạt'),
      },
    ],
  },
};

export const IconOnly = {
  args: {
    actions: [
      {
        icon: 'view',
        title: 'Xem chi tiết',
        onClick: () => console.log('Xem'),
      },
      {
        icon: 'edit',
        title: 'Chỉnh sửa',
        onClick: () => console.log('Sửa'),
      },
      {
        icon: 'delete',
        title: 'Xóa',
        className: 'text-rose-600 hover:text-rose-800',
        onClick: () => console.log('Xóa'),
      },
    ],
  },
};
