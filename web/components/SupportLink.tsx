import { SUPPORT_EMAIL } from '@/lib/support';

/** The support address as a mailto link. Works in server and client components. */
export default function SupportLink({ className = '' }: { className?: string }) {
  return (
    <a href={`mailto:${SUPPORT_EMAIL}`} className={`font-semibold text-primary-container underline-offset-2 hover:underline ${className}`}>
      {SUPPORT_EMAIL}
    </a>
  );
}

/** Turns the support address inside a plain message (like a server error) into a link. */
export function withSupportLink(text: string) {
  const parts = text.split(SUPPORT_EMAIL);
  return parts.flatMap((part, i) => (i < parts.length - 1 ? [part, <SupportLink key={i} />] : [part]));
}
