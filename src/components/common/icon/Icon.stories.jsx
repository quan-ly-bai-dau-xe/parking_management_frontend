import { useState } from 'react';
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

export const WrapperMode = {
  name: 'Wrapper Mode (Inline SVG Children)',
  render: () => (
    <div className="flex items-center gap-4 p-4 border border-slate-200 rounded-lg bg-slate-50">
      <Icon size="md" className="text-indigo-600">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </Icon>
      <div className="text-xs text-slate-600">
        <strong className="text-slate-900 block font-semibold mb-0.5">Icon Wrapper Mode:</strong>
        Bọc trực tiếp thẻ <code>&lt;svg&gt;</code> qua <code>&lt;Icon size=&quot;md&quot;&gt;&lt;svg&gt;...&lt;/svg&gt;&lt;/Icon&gt;</code> giúp chuẩn hóa kích cỡ và accessibility mà không cần đăng ký registry.
      </div>
    </div>
  ),
};

export const AllCommonIcons = {
  name: 'All Common Icons Gallery',
  render: () => {
    const [searchTerm, setSearchTerm] = useState('');
    const filteredIcons = ICON_NAMES.filter((n) =>
      n.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 max-w-sm">
          <Icon name="search" size="sm" className="text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm icon common (ví dụ: edit, vehicle, search)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-md focus:outline-hidden focus:border-blue-500"
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filteredIcons.map((iconName) => (
            <div
              key={iconName}
              className="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-200 bg-white hover:border-blue-400 hover:shadow-xs transition-all text-slate-700"
            >
              <Icon name={iconName} size="lg" />
              <span className="mt-2 text-xs font-medium text-slate-600 truncate w-full text-center">
                {iconName}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  },
};
