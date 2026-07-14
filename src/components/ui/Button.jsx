import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

const variants = {
  default: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm',
  destructive: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
  outline: 'border border-gray-300 bg-white hover:bg-gray-50 text-gray-700',
  secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
  ghost: 'hover:bg-gray-100 text-gray-700',
  link: 'text-brand-600 underline-offset-4 hover:underline',
};

const sizes = {
  default: 'h-10 px-4 py-2',
  sm: 'h-9 rounded-md px-3',
  lg: 'h-11 rounded-md px-8',
  icon: 'h-10 w-10',
};

const Button = forwardRef(({ 
  className, 
  variant = 'default', 
  size = 'default', 
  children, 
  ...props 
}, ref) => {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className
      )}
      ref={ref}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = 'Button';
export default Button;