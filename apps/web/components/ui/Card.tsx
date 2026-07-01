import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  featured?: boolean;
  hover?: boolean;
  as?: 'div' | 'section' | 'article';
  children: ReactNode;
}

/** Glass surface per DESIGN.md §9.2. */
export default function Card({ featured, hover, as = 'div', className = '', children, ...rest }: CardProps) {
  const Tag = as;
  const cls = [
    featured ? 'card-featured rounded-lgx backdrop-blur-[18px]' : 'card',
    hover ? 'card-hover' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <Tag className={cls} {...rest}>
      {children}
    </Tag>
  );
}
