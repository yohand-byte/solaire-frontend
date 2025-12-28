import { clsx } from 'clsx';
import { motion } from 'framer-motion';
import { Loader2, Check, X, AlertCircle, ChevronDown } from 'lucide-react';

// ═══════════════════════════════════════════════════════════
// BUTTON
// ═══════════════════════════════════════════════════════════
export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  loading = false,
  icon: Icon,
  className,
  ...props 
}) {
  const variants = {
    primary: 'bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white shadow-lg shadow-primary-500/25',
    secondary: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 shadow-sm dark:bg-gray-900 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-800',
    success: 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white shadow-lg shadow-emerald-500/25',
    danger: 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white shadow-lg shadow-red-500/25',
    ghost: 'hover:bg-gray-100 text-gray-600 dark:text-gray-300 dark:hover:bg-gray-800',
    solar: 'bg-gradient-to-r from-solar-500 to-solar-400 hover:from-solar-600 hover:to-solar-500 text-white shadow-lg shadow-solar-500/25',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
    xl: 'px-8 py-4 text-lg',
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={clsx(
        'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : Icon ? (
        <Icon className="w-4 h-4 mr-2" />
      ) : null}
      {children}
    </motion.button>
  );
}

// ═══════════════════════════════════════════════════════════
// CARD
// ═══════════════════════════════════════════════════════════
export function Card({ children, className, hover = false, glass = false, ...props }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={hover ? { y: -4, transition: { duration: 0.2 } } : {}}
      className={clsx(
        'rounded-2xl',
        glass 
          ? 'bg-white/70 backdrop-blur-xl border border-white/20 dark:bg-gray-900/70 dark:border-white/10' 
          : 'bg-white border border-gray-100 dark:bg-gray-900 dark:border-gray-800',
        hover && 'cursor-pointer shadow-card hover:shadow-card-hover transition-shadow duration-300',
        !hover && 'shadow-card',
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// INPUT
// ═══════════════════════════════════════════════════════════
export function Input({ label, error, icon: Icon, className, ...props }) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className="h-5 w-5 text-gray-400" />
          </div>
        )}
        <input
          className={clsx(
            'block w-full rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm transition-all duration-200',
            'focus:border-primary-500 focus:ring-primary-500 focus:ring-2 focus:ring-opacity-20',
            'placeholder:text-gray-400 dark:placeholder:text-gray-500',
            Icon && 'pl-10',
            error && 'border-red-300 focus:border-red-500 focus:ring-red-500',
            className
          )}
          {...props}
        />
      </div>
      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <AlertCircle className="w-4 h-4" />
          {error}
        </p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SELECT
// ═══════════════════════════════════════════════════════════
export function Select({ label, options = [], className, ...props }) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      )}
      <div className="relative">
        <select
          className={clsx(
            'block w-full rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm transition-all duration-200 appearance-none',
            'focus:border-primary-500 focus:ring-primary-500 focus:ring-2 focus:ring-opacity-20',
            'pr-10',
            className
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500 pointer-events-none" />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// BADGE
// ═══════════════════════════════════════════════════════════
export function Badge({ children, variant = 'default', size = 'md', dot = false }) {
  const variants = {
    default: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200',
    primary: 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-200',
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
    danger: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
    info: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200',
    solar: 'bg-solar-100 text-solar-700 dark:bg-solar-900/40 dark:text-solar-200',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1 text-sm',
  };

  const dotColors = {
    default: 'bg-gray-400',
    primary: 'bg-primary-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
    info: 'bg-sky-500',
    solar: 'bg-solar-500',
  };

  return (
    <span className={clsx(
      'inline-flex items-center font-medium rounded-full',
      variants[variant],
      sizes[size]
    )}>
      {dot && (
        <span className={clsx('w-1.5 h-1.5 rounded-full mr-1.5', dotColors[variant])} />
      )}
      {children}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════
// PROGRESS BAR
// ═══════════════════════════════════════════════════════════
export function Progress({ value = 0, max = 100, size = 'md', showLabel = false, variant = 'primary' }) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  const sizes = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  const variants = {
    primary: 'bg-primary-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
    solar: 'bg-gradient-to-r from-solar-400 to-solar-500',
  };

  return (
    <div className="w-full">
      <div className={clsx('w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden', sizes[size])}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={clsx('h-full rounded-full', variants[variant])}
        />
      </div>
      {showLabel && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">{Math.round(percentage)}%</p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// AVATAR
// ═══════════════════════════════════════════════════════════
export function Avatar({ name, src, size = 'md', className }) {
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  };

  const initials = name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  const colors = [
    'bg-primary-500',
    'bg-emerald-500',
    'bg-solar-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-cyan-500',
  ];

  const colorIndex = name ? name.charCodeAt(0) % colors.length : 0;

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={clsx('rounded-full object-cover', sizes[size], className)}
      />
    );
  }

  return (
    <div
      className={clsx(
        'rounded-full flex items-center justify-center text-white font-semibold',
        sizes[size],
        colors[colorIndex],
        className
      )}
    >
      {initials}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// STAT CARD
// ═══════════════════════════════════════════════════════════
export function StatCard({ title, value, change, changeType = 'increase', icon: Icon, color = 'primary' }) {
  const colors = {
    primary: 'from-primary-500 to-primary-600',
    success: 'from-emerald-500 to-emerald-600',
    warning: 'from-amber-500 to-amber-600',
    danger: 'from-red-500 to-red-600',
    solar: 'from-solar-400 to-solar-500',
  };

  const iconBg = {
    primary: 'bg-primary-100 text-primary-600',
    success: 'bg-emerald-100 text-emerald-600',
    warning: 'bg-amber-100 text-amber-600',
    danger: 'bg-red-100 text-red-600',
    solar: 'bg-solar-100 text-solar-600',
  };

  return (
    <Card hover className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
          {change && (
            <p className={clsx(
              'mt-2 text-sm font-medium flex items-center gap-1',
              changeType === 'increase' ? 'text-emerald-600' : 'text-red-600'
            )}>
              {changeType === 'increase' ? '↑' : '↓'} {change}
            </p>
          )}
        </div>
        {Icon && (
          <div className={clsx('p-3 rounded-xl', iconBg[color])}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════
// WORKFLOW STATUS
// ═══════════════════════════════════════════════════════════
export function WorkflowStep({ label, status, icon: Icon }) {
  const statusConfig = {
    pending: { color: 'bg-gray-200 text-gray-500 dark:bg-gray-800 dark:text-gray-300', icon: '○' },
    in_progress: { color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300', icon: '◐' },
    completed: { color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300', icon: '✓' },
    blocked: { color: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300', icon: '✕' },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <div className="flex flex-col items-center">
      <div className={clsx(
        'w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg',
        config.color
      )}>
        {config.icon}
      </div>
      <span className="mt-2 text-xs font-medium text-gray-600 dark:text-gray-400">{label}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// EMPTY STATE
// ═══════════════════════════════════════════════════════════
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="text-center py-12">
      {Icon && (
        <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
        </div>
      )}
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// LOADING
// ═══════════════════════════════════════════════════════════
export function Loading({ size = 'md', text }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className={clsx(
        'animate-spin rounded-full border-2 border-gray-200 dark:border-gray-700 border-t-primary-600',
        sizes[size]
      )} />
      {text && <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">{text}</p>}
    </div>
  );
}

// Re-export Modal
export { Modal } from './Modal';
