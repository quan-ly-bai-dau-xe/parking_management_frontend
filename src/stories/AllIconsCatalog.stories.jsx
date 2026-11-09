import { useState } from 'react';
import Icon from '../components/common/icon/Icon';
import { ICON_REGISTRY } from '../components/common/icon/iconConstants';
import { VEHICLE_FEATURE_ICONS } from '../components/VehicleManagement/icons/vehicleIcons';

export default {
  title: 'Overview/All Icons Catalog',
  parameters: {
    docs: {
      description: {
        component:
          'Bảng tra cứu toàn bộ biểu tượng (Icons) trong hệ thống: bao gồm các icon dùng chung (Common) và icon của từng màn hình tính năng (Features). Hỗ trợ tìm kiếm nhanh và xem cú pháp sử dụng.',
      },
    },
  },
};

export const AllIconsCatalog = {
  name: 'Tra cứu tất cả Icons (Common & Features)',
  render: () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('all'); // 'all' | 'common' | 'vehicle'

    // Nhóm Common
    const commonList = Object.keys(ICON_REGISTRY).map((name) => ({
      id: name,
      name,
      category: 'common',
      type: 'common-registry',
      componentOrName: name,
      codeExample: `<Icon name="${name}" size="md" />`,
    }));

    // Nhóm Vehicle Feature
    const vehicleList = Object.entries(VEHICLE_FEATURE_ICONS).map(([key, comp]) => ({
      id: `vehicle-${key}`,
      name: key,
      category: 'vehicle',
      type: 'feature-component',
      componentOrName: comp,
      codeExample: `<Icon icon={${comp.name || key}} size="md" />`,
    }));

    const allList = [...commonList, ...vehicleList];

    const filteredList = allList.filter((item) => {
      const matchSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchTab = activeTab === 'all' || item.category === activeTab;
      return matchSearch && matchTab;
    });

    return (
      <div className="space-y-6 font-sans">
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                activeTab === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Tất cả ({allList.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('common')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                activeTab === 'common'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Common Icons ({commonList.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('vehicle')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                activeTab === 'vehicle'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Vehicle Feature ({vehicleList.length})
            </button>
          </div>

          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder="Gõ từ khóa tìm icon..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:border-blue-500 shadow-2xs"
            />
          </div>
        </div>

        {/* Icons Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredList.map((item) => (
            <div
              key={item.id}
              className="group flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-400 hover:shadow-xs transition-all relative text-slate-700"
            >
              <span
                className={`absolute top-2 right-2 px-1.5 py-0.5 text-3xs font-bold rounded-sm uppercase tracking-wider ${
                  item.category === 'common'
                    ? 'bg-blue-50 text-blue-600'
                    : 'bg-emerald-50 text-emerald-600'
                }`}
              >
                {item.category}
              </span>

              <div className="p-3 my-2 text-slate-700 group-hover:text-blue-600 transition-colors">
                {item.type === 'common-registry' ? (
                  <Icon name={item.componentOrName} size="lg" />
                ) : (
                  <Icon icon={item.componentOrName} size="lg" />
                )}
              </div>

              <span className="text-xs font-semibold text-slate-800 truncate max-w-full text-center">
                {item.name}
              </span>

              <span className="mt-1 text-3xs text-slate-400 font-mono text-center truncate max-w-full px-1">
                {item.codeExample}
              </span>
            </div>
          ))}
        </div>

        {filteredList.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-xs">
            Không tìm thấy biểu tượng phù hợp với từ khóa &ldquo;{searchTerm}&rdquo;
          </div>
        )}
      </div>
    );
  },
};
