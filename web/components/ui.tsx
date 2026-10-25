'use client';

export function Icon({ name, className = '', fill = false }: { name: string; className?: string; fill?: boolean }) {
  return (
    <span aria-hidden className={`material-symbols-outlined ${fill ? 'icon-fill' : ''} ${className}`}>
      {name}
    </span>
  );
}

// eslint-disable-next-line @next/next/no-img-element
export const Logo = ({ className = 'h-10' }: { className?: string }) => <img src="/logo.png" alt="PrintPix" className={`w-auto object-contain ${className}`} />;

export function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return <span className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`} />;
}

export function Initials({ name, className = 'h-10 w-10' }: { name: string; className?: string }) {
  const text = name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full bg-navy text-label-md text-white ${className}`}>{text}</span>
  );
}
