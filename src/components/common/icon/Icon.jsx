import { ICON_REGISTRY, SIZE_MAP } from "./iconConstants";

/**
 * Icon component
 * Standardized icon renderer supporting:
 * 1. Registered common Lucide icons via `name`
 * 2. Directly passed icon components via `icon`
 * 3. Inline custom SVGs wrapped via `children` (wrapper mode)
 *
 * @param {Object} props
 * @param {string} [props.name] - Registered common icon identifier (e.g. 'search', 'edit', 'delete')
 * @param {React.ElementType} [props.icon] - Directly passed Icon component (e.g. Lucide component or custom SVG component)
 * @param {'xs'|'sm'|'md'|'lg'|number} [props.size='md'] - Icon size variant or numeric pixel size
 * @param {string} [props.className=''] - Custom CSS/Tailwind classes
 * @param {React.ReactNode} [props.children] - Inline SVG or element to wrap
 */
export default function Icon({
  name,
  icon: CustomIcon,
  size = "md",
  className = "",
  children,
  ...props
}) {
  const pixelSize = typeof size === "number" ? size : SIZE_MAP[size] || SIZE_MAP.md;

  // Case 1: Custom component passed via `icon` prop
  if (CustomIcon) {
    return (
      <CustomIcon
        size={pixelSize}
        width={pixelSize}
        height={pixelSize}
        className={className}
        aria-hidden="true"
        {...props}
      />
    );
  }

  // Case 2: Named system icon from common ICON_REGISTRY
  if (name) {
    const Component = ICON_REGISTRY[name];
    if (!Component) {
      if (import.meta.env?.DEV) {
        console.warn(`[Icon] Icon "${name}" is not registered in ICON_REGISTRY.`);
      }
      return null;
    }
    return (
      <Component
        size={pixelSize}
        className={className}
        aria-hidden="true"
        {...props}
      />
    );
  }

  // Case 3: Wrapper mode for inline SVG children
  if (children) {
    return (
      <span
        role="img"
        aria-hidden="true"
        style={{ width: pixelSize, height: pixelSize }}
        className={`inline-flex items-center justify-center shrink-0 [&>svg]:w-full [&>svg]:h-full ${className}`}
        {...props}
      >
        {children}
      </span>
    );
  }

  return null;
}

