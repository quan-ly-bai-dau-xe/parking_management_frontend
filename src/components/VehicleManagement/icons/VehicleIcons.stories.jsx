import Icon from '../../common/icon/Icon';
import { VEHICLE_FEATURE_ICONS } from './vehicleIcons';

export default {
  title: 'Feature/VehicleManagement/Icons',
  component: Icon,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Danh mục các biểu tượng đặc thù phục vụ riêng cho nghiệp vụ Quản lý xe (Scan biển số, nhận diện camera, xuất file dữ liệu). Sử dụng thông qua `<Icon icon={ScanPlateIcon} size="md" />` hoặc wrapper SVG.',
      },
    },
  },
};

export const AllVehicleIcons = {
  name: 'All Vehicle Feature Icons',
  render: () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl">
      {Object.entries(VEHICLE_FEATURE_ICONS).map(([key, IconComponent]) => (
        <div
          key={key}
          className="flex flex-col items-center justify-center p-4 bg-white rounded-lg border border-slate-200 shadow-2xs hover:border-blue-400 transition-all text-slate-700"
        >
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg mb-2">
            <Icon icon={IconComponent} size="lg" />
          </div>
          <span className="text-xs font-semibold text-slate-800">{key}</span>
          <span className="text-2xs text-slate-400 font-mono mt-1">&lt;Icon icon=&#123;{IconComponent.name}&#125; /&gt;</span>
        </div>
      ))}
    </div>
  ),
};

export const Sizes = {
  name: 'Feature Icon Sizes',
  render: () => (
    <div className="flex items-end gap-6 text-slate-700 p-4">
      {['xs', 'sm', 'md', 'lg'].map((sizeKey) => (
        <div key={sizeKey} className="flex flex-col items-center gap-2">
          <Icon icon={VEHICLE_FEATURE_ICONS.scanPlate} size={sizeKey} className="text-blue-600" />
          <span className="text-xs text-slate-500 font-mono">{sizeKey}</span>
        </div>
      ))}
    </div>
  ),
};
