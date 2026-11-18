export function Badge({ children, variant = 'moderate', className = '', icon: Icon }) {
  const variantClass = {
    high: 'badge-high',
    critical: 'badge-critical',
    moderate: 'badge-moderate',
    verified: 'badge-verified',
    open: 'badge-open',
    light: 'badge-pill-light',
  }[variant] || 'badge-moderate';

  return (
    <span className={`badge ${variantClass} ${className}`}>
      {Icon && <Icon size={12} />}
      {children}
    </span>
  );
}
