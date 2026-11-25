import PageToolbar from './PageToolbar';
import FilterSelect from './FilterSelect';

export default {
  title: 'Common/PageToolbar',
  component: PageToolbar,
  tags: ['autodocs'],
  argTypes: {
    searchLabel: {
      control: 'text',
      description: 'Nhãn nút tìm kiếm',
    },
    resetLabel: {
      control: 'text',
      description: 'Nhãn nút làm mới',
    },
  },
};

export const Default = {
  render: (args) => (
    <PageToolbar {...args} onSearch={() => {}} onReset={() => {}}>
      <div>
        <label htmlFor="toolbar-demo-plate" className="block text-xs font-semibold text-slate-700 mb-1">Biển số xe</label>
        <input
          id="toolbar-demo-plate"
          type="text"
          placeholder="Nhập biển số xe..."
          className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
        />
      </div>
      <FilterSelect
        label="Loại xe"
        value=""
        options={[
          { value: 'car', label: 'Ô tô 4-7 chỗ' },
          { value: 'motorbike', label: 'Xe máy' },
        ]}
      />
      <FilterSelect
        label="Trạng thái"
        value=""
        options={[
          { value: 'parked', label: 'Đang gửi' },
          { value: 'left', label: 'Đã rời bãi' },
        ]}
      />
    </PageToolbar>
  ),
  args: {
    searchLabel: 'Tìm kiếm',
    resetLabel: 'Làm mới',
    gridCols: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4',
  },
};
