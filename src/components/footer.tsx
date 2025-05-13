
"use client";

import {useEffect, useState} from 'react';

export function Footer() {
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);


  return (
    <footer className="py-8 border-t border-border/40">
      <div className="container mx-auto px-4 sm:px-6 text-center">
        <p className="text-sm text-muted-foreground">
          &copy; {currentYear ?? new Date().getFullYear()} Patungan. All rights reserved.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
            Powered by Next.js & Shadcn/ui.
        </p>
      </div>
    </footer>
  );
}
