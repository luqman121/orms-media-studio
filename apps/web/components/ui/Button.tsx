import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
}

const base =
  'inline-flex items-center justify-center gap-2 font-bold rounded-mdx select-none transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-500 focus-visible:outline-offset-2';

const sizes: Record<Size, string> = {
  sm: 'min-h-[40px] px-4 text-sm',
  md: 'min-h-[48px] px-5 text-[0.95rem]',
  lg: 'min-h-[54px] px-7 text-base',
};

const variants: Record<Variant, string> = {
  primary:
    // Skin comes from CSS vars: violet on the landing/auth, electric blue inside .dz.
    'text-white bg-[image:var(--btn-grad)] shadow-[var(--btn-shadow)] hover:-translate-y-px hover:shadow-[var(--btn-shadow-hover)]',
  secondary:
    'text-text-100 bg-white/[0.04] border border-[rgba(169,154,241,0.18)] hover:bg-[rgba(169,154,241,0.10)] hover:border-[rgba(169,154,241,0.32)] hover:-translate-y-px',
  ghost: 'text-text-400 hover:text-text-100 hover:bg-[rgba(169,154,241,0.08)]',
  danger:
    'text-[#fda4af] bg-[rgba(255,92,122,0.10)] border border-[rgba(255,92,122,0.28)] hover:bg-[rgba(255,92,122,0.16)]',
};

/** Spinner used for the loading state. */
function Loader() {
  return (
    <span
      aria-hidden
      className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin-slow"
    />
  );
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', leftIcon, rightIcon, loading, fullWidth, className = '', children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`${base} ${sizes[size]} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {loading ? <Loader /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
});

export default Button;
