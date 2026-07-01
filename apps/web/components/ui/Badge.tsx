import type { HTMLAttributes, ReactNode } from 'react';

type Tone = 'default' | 'success' | 'cyan' | 'warning' | 'danger';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  children: ReactNode;
}

const tones: Record<Tone, string> = {
  default: 'badge',
  success: 'badge badge-success',
  cyan: 'badge badge-cyan',
  warning:
    'badge !bg-[rgba(255,179,92,0.12)] !border-[rgba(255,179,92,0.3)] !text-[#ffd9a8]',
  danger: 'badge !bg-[rgba(255,92,122,0.12)] !border-[rgba(255,92,122,0.3)] !text-[#fda4af]',
};

export default function Badge({ tone = 'default', className = '', children, ...rest }: BadgeProps) {
  return (
    <span className={`${tones[tone]} ${className}`} {...rest}>
      {children}
    </span>
  );
}
