export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  icon: Icon,
  iconRight: IconRight,
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  style = {},
  ...props
}) {
  const sizeClass = size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '';
  const variantClass = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    outline: 'btn-outline',
    ghost: 'btn-ghost',
    danger: 'btn-danger',
    destructive: 'btn-danger',
    'danger-outline': 'btn-danger-outline',
    icon: 'btn-icon',
    amber: 'btn-amber',
  }[variant] || 'btn-primary';

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`btn ${variantClass} ${sizeClass} ${className}`}
      style={style}
      {...props}
    >
      {loading ? (
        <span
          className="spinner"
          style={{
            display: 'inline-block',
            width: 14,
            height: 14,
            border: '2px solid currentColor',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.6s linear infinite',
          }}
        />
      ) : (
        Icon && <Icon size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />
      )}
      {children}
      {IconRight && !loading && <IconRight size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />}
    </button>
  );
}
