import Icon from './Icon';
import { ICON_NAMES, SIZE_MAP } from './iconConstants';

export default {
  title: 'Common/Icon',
  component: Icon,
  tags: ['autodocs'],
  argTypes: {
    name: {
      control: 'select',
      options: ICON_NAMES,
      description: 'Tên định danh của biểu tượng trong ICON_REGISTRY',
    },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 32, 48],
      description: 'Kích cỡ (named size hoặc số pixel cụ thể)',
    },
    className: {
      control: 'text',
      description: 'Custom Tailwind class cho màu sắc hoặc hiệu ứng',
    },
  },
};

export const Default = {
  args: {
    name: 'vehicle',
    size: 'md',
    className: 'text-slate-700',
  },
};

export const Sizes = {
  render: () => (
    <div className="flex items-end gap-6 text-slate-700">
      {Object.keys(SIZE_MAP).map((sizeKey) => (
        <div key={sizeKey} className="flex flex-col items-center gap-2">
          <Icon name="vehicle" size={sizeKey} />
          <span className="text-xs text-slate-500 font-mono">
            {sizeKey} ({SIZE_MAP[sizeKey]}px)
          </span>
        </div>
      ))}
    </div>
  ),
};

export const Colors = {
  render: () => (
    <div className="flex items-center gap-6">
      <div className="flex flex-col items-center gap-1">
        <Icon name="check" size="lg" className="text-emerald-500" />
        <span className="text-xs text-slate-500">Success</span>
      </div>
      <div className="flex flex-col items-center gap-1">
        <Icon name="warning" size="lg" className="text-amber-500" />
        <span className="text-xs text-slate-500">Warning</span>
      </div>
      <div className="flex flex-col items-center gap-1">
        <Icon name="delete" size="lg" className="text-rose-500" />
        <span className="text-xs text-slate-500">Danger</span>
      </div>
      <div className="flex flex-col items-center gap-1">
        <Icon name="search" size="lg" className="text-blue-500" />
        <span className="text-xs text-slate-500">Info</span>
      </div>
    </div>
  ),
};

export const AllIconsGrid = {
  name: 'All Icons Gallery',
  render: () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {ICON_NAMES.map((iconName) => (
        <div
          key={iconName}
          className="flex flex-col items-center justify-center p-4 rounded-lg border border-slate-200 bg-white hover:border-blue-400 hover:shadow-xs transition-all text-slate-700"
        >
          <Icon name={iconName} size="lg" />
          <span className="mt-2 text-xs font-medium text-slate-600 truncate w-full text-center">
            {iconName}
          </span>
        </div>
      ))}
    </div>
  ),
};
