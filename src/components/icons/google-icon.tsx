// src/components/icons/google-icon.tsx
import type { SVGProps } from 'react';

export function GoogleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M20.94,11.09c0-.79-.07-1.54-.2-2.29H12v4.26h4.84c-.21,1.39-.86,2.58-1.94,3.38v2.81h3.59c2.1-1.94,3.32-4.76,3.32-8.16Z" fill="#4285F4"/>
      <path d="M12,21c2.97,0,5.46-.98,7.28-2.66l-3.59-2.81c-.98,.66-2.23,1.06-3.69,1.06-2.83,0-5.22-1.9-6.08-4.47H2.32v2.89C4.1,19.33,7.79,21,12,21Z" fill="#34A853"/>
      <path d="M5.92,14.52c-.25-.75-.39-1.56-.39-2.4,0-.84,.14-1.65,.39-2.4V6.73H2.32c-.74,1.47-1.17,3.11-1.17,4.87s.43,3.4,1.17,4.87l3.6-2.85Z" fill="#FBBC05"/>
      <path d="M12,5.44c1.61,0,3.04,.56,4.16,1.64l3.14-3.14C17.43,2.13,14.97,1,12,1,7.79,1,4.1,2.67,2.32,5.06l3.6,2.89c.86-2.57,3.25-4.47,6.08-4.47Z" fill="#EA4335"/>
    </svg>
  );
}
