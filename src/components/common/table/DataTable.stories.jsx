import DataTable from './DataTable';

export default {
  title: 'Common/Table/DataTable',
  component: DataTable,
  tags: ['autodocs'],
  argTypes: {
    emptyMessage: {
      control: 'text',
      description: 'Thông báo khi bảng không có dữ liệu',
    },
    onRowClick: { action: 'rowClicked' },
  },
};

const sampleColumns = [
  { header: 'STT', accessor: (_row, idx) => idx + 1, align: 'center', minWidth: '60px' },
  { header: 'Biển số xe', accessor: 'licensePlate', minWidth: '120px' },
  { header: 'Loại xe', accessor: 'vehicleType', minWidth: '100px' },
  { header: 'Giờ vào', accessor: 'entryTime', minWidth: '140px' },
  {
    header: 'Trạng thái',
    accessor: (row) => (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
        {row.status}
      </span>
    ),
    align: 'center',
    minWidth: '110px',
  },
];

const sampleRows = [
  { id: '1', licensePlate: '30F-123.45', vehicleType: 'Ô tô 4 chỗ', entryTime: '10:15 19/11/2026', status: 'Đang đỗ' },
  { id: '2', licensePlate: '29A-678.90', vehicleType: 'Ô tô SUV', entryTime: '10:45 19/11/2026', status: 'Đang đỗ' },
  { id: '3', licensePlate: '51G-555.22', vehicleType: 'Xe máy', entryTime: '11:00 19/11/2026', status: 'Đang đỗ' },
];

export const Default = {
  args: {
    columns: sampleColumns,
    rows: sampleRows,
    rowKey: 'id',
  },
};

export const Empty = {
  args: {
    columns: sampleColumns,
    rows: [],
    emptyMessage: 'Không tìm thấy dữ liệu lượt đỗ xe phù hợp với bộ lọc.',
  },
};
