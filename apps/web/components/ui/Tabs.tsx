import type { ReactNode } from 'react';

export interface TabItem<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

interface TabsProps<T extends string> {
  items: TabItem<T>[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}

/** Segmented control per DESIGN.md §9.4. */
export default function Tabs<T extends string>({ items, value, onChange, disabled, className = '', ariaLabel }: TabsProps<T>) {
  return (
    <div role="tablist" aria-label={ariaLabel} className={`segmented ${className}`}>
      {items.map((it) => {
        const active = it.value === value;
        return (
          <button
            key={it.value}
            role="tab"
            aria-selected={active}
            disabled={disabled}
            onClick={() => onChange(it.value)}
            className={`segmented-tab ${active ? 'is-active' : ''}`}
          >
            {it.icon}
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
