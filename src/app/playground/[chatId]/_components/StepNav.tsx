"use client";
import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '~/lib/utils'

export default function StepNav({ chatId }: { chatId: string }) {
  const pathname = usePathname() || "";
  const isActive = (slug: string) => pathname.endsWith(`/${slug}`);
  
  const tabs = [
    { slug: 'code', label: 'Code' },
    { slug: 'funding', label: 'Funding' },
    { slug: 'sign', label: 'Sign' },
  ];
  
  return (
    <nav className="top-0 bg-background border-b">
      <div className="container flex justify-center">
        <div className="flex items-center gap-1">
          {tabs.map((tab) => {
            const active = isActive(tab.slug);
            return (
              <Link
                key={tab.slug}
                href={`/playground/${chatId}/${tab.slug}`}
                className={cn(
                  "relative px-4 py-2 text-sm font-medium transition-colors rounded-md",
                  active
                    ? "text-foreground bg-accent"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                {tab.label}
                {active && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}


