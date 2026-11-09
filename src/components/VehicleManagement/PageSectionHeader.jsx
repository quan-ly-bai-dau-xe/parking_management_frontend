import Icon from "../common/icon/Icon";
import Button from "../common/button/Button";
import { ScanPlateIcon } from "./icons/vehicleIcons";

export default function PageSectionHeader({
  title = "",
  description = "",
  onOpenScanModal = () => {},
  onAdd = () => {},
  addButtonLabel = "+ Thêm",
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          {title}
        </h1>
        {description ? (
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        ) : null}
      </div>

      <div className="flex items-center gap-2.5">
        <Button
          variant="secondary"
          size="sm"
          onClick={onOpenScanModal}
          className="border-blue-200 text-blue-600 hover:bg-blue-50 cursor-pointer"
        >
          <Icon icon={ScanPlateIcon} size="sm" className="mr-1.5" />
          <span>Scan biển số</span>
        </Button>

        <Button
          variant="primary"
          size="sm"
          onClick={onAdd}
          className="bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer"
        >
          <Icon name="add" size="sm" className="mr-1.5" />
          <span>{addButtonLabel}</span>
        </Button>
      </div>
    </div>
  );
}
