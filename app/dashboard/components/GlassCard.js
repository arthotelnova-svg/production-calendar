import styles from '../styles/glassmorphism.module.css';

/**
 * Reusable Glassmorphic Card Component
 * @param {Object} props
 * @param {React.ReactNode} props.children - Card content
 * @param {boolean} props.isActive - Active state (border highlight)
 * @param {function} props.onClick - Click handler
 * @param {string} props.className - Additional CSS classes
 * @param {object} props.rest - Other HTML attributes
 */
export default function GlassCard({
  children,
  isActive = false,
  onClick = null,
  className = '',
  ...props
}) {
  const classes = [
    styles.glassCard,
    isActive && styles.active,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classes}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick(e) : undefined}
      {...props}
    >
      {children}
    </div>
  );
}
