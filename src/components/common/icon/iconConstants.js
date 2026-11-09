import {
  Pencil,
  Trash2,
  Plus,
  Search,
  Eye,
  Settings,
  X,
  Check,
  Car,
  User,
  ChevronDown,
  RotateCw,
  AlertTriangle,
} from "lucide-react";

export const ICON_REGISTRY = {
  edit: Pencil,
  delete: Trash2,
  add: Plus,
  search: Search,
  view: Eye,
  settings: Settings,
  close: X,
  check: Check,
  vehicle: Car,
  user: User,
  chevronDown: ChevronDown,
  refresh: RotateCw,
  warning: AlertTriangle,
};

export const ICON_NAMES = Object.keys(ICON_REGISTRY);

export const SIZE_MAP = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
};
