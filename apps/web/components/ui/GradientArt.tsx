import type { CSSProperties, ReactNode } from 'react';

// Deterministic abstract "AI art" tiles built from layered mesh gradients.
// Used where real generated media isn't available (landing gallery, previews)
// so surfaces look intentional rather than like empty placeholders.
const PALETTES: Array<[string, string, string]> = [
  ['#864FF2', '#36C4F0', '#0B0814'],
  ['#5195ED', '#9A68FF', '#0B0814'],
  ['#36C4F0', '#6B59E6', '#100C1B'],
  ['#9A68FF', '#5195ED', '#0B0814'],
  ['#864FF2', '#43F994', '#0B0814'],
  ['#6B59E6', '#36C4F0', '#100C1B'],
  ['#A77BFF', '#5195ED', '#0B0814'],
  ['#36C4F0', '#864FF2', '#0B0814'],
];

function mesh(seed: number): CSSProperties {
  const [a, b, c] = PALETTES[seed % PALETTES.length];
  const x1 = 12 + ((seed * 37) % 70);
  const y1 = 8 + ((seed * 53) % 60);
  const x2 = 20 + ((seed * 71) % 70);
  const y2 = 30 + ((seed * 29) % 60);
  return {
    background: `
      radial-gradient(60% 60% at ${x1}% ${y1}%, ${a}cc, transparent 60%),
      radial-gradient(55% 55% at ${x2}% ${y2}%, ${b}aa, transparent 62%),
      linear-gradient(135deg, ${c}, #07040D)`,
  };
}

interface GradientArtProps {
  seed?: number;
  className?: string;
  children?: ReactNode;
  style?: CSSProperties;
}

export default function GradientArt({ seed = 0, className = '', children, style }: GradientArtProps) {
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ ...mesh(seed), ...style }} aria-hidden={!children}>
      <div className="absolute inset-0 bg-grid opacity-[0.35] mix-blend-overlay" />
      {children}
    </div>
  );
}
