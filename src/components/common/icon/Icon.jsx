import { ICON_REGISTRY, SIZE_MAP } from "./iconConstants";

/**
 * Icon component
 * Standardized icon renderer using Lucide icons.
 *
 * @param {Object} props
 * @param {string} props.name - Registered icon identifier
 * @param {'xs'|'sm'|'md'|'lg'|number} [props.size='md'] - Icon size variant or numeric pixel size
 * @param {string} [props.className=''] - Custom CSS/Tailwind classes
 */
export default function Icon({ name, size = "md", className = "", ...props }) {
  const Component = ICON_REGISTRY[name];

  if (!Component) {
    if (import.meta.env?.DEV) {
      console.warn(`[Icon] Icon "${name}" is not registered in ICON_REGISTRY.`);
    }
    return null;
  }

  const pixelSize = typeof size === "number" ? size : SIZE_MAP[size] || SIZE_MAP.md;

  return (
    <Component
      size={pixelSize}
      className={className}
      aria-hidden="true"
      {...props}
    />
  );
}
