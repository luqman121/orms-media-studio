import Link from 'next/link';

interface LogoProps {
  size?: number;
  showText?: boolean;
  subtitle?: string;
  href?: string;
}

/** ORMS logo mark per DESIGN.md §8 — gradient rounded square + wordmark. */
export default function Logo({ size = 44, showText = true, subtitle = 'OpenRouter', href = '/' }: LogoProps) {
  const mark = (
    <span
      className="grid place-items-center rounded-[22%] font-display font-extrabold text-white shrink-0"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.34,
        background: 'linear-gradient(135deg,#864FF2,#5195ED 55%,#36C4F0)',
        boxShadow: '0 12px 34px rgba(134,79,242,0.4)',
      }}
      aria-hidden
    >
      OR
    </span>
  );

  const content = (
    <span className="inline-flex items-center gap-2.5">
      {mark}
      {showText && (
        <span className="leading-tight">
          <span className="block font-display font-extrabold text-[1.05rem] text-text-100">ORMS Studio</span>
          {subtitle && <span className="block text-[0.72rem] text-text-500">{subtitle}</span>}
        </span>
      )}
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center no-underline">
        {content}
      </Link>
    );
  }
  return content;
}
