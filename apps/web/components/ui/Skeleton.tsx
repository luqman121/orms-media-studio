interface SkeletonProps {
  className?: string;
  /** convenience for a rounded pill */
  rounded?: boolean;
}

/** Purple shimmer skeleton per DESIGN.md §13. */
export default function Skeleton({ className = '', rounded }: SkeletonProps) {
  return <div aria-hidden className={`skeleton ${rounded ? '!rounded-full' : ''} ${className}`} />;
}
