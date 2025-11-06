"use client";
import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function StepNav({ chatId }: { chatId: string }) {
  const pathname = usePathname() || "";
  const isActive = (slug: string) => pathname.endsWith(`/${slug}`);
  const Item = ({ slug, label }: { slug: string; label: string }) => {
    if (isActive(slug)) {
      return <span className="font-semibold text-sm">{label}</span>;
    }
    return (
      <Link href={`/playground/${chatId}/${slug}`} className="text-sm">
        {label}
      </Link>
    );
  };
  return (
    <nav className="mb-4 flex items-center gap-2">
      <Item slug="code" label="Code" />
      <span className="text-sm text-muted-foreground">·</span>
      <Item slug="funding" label="Funding" />
      <span className="text-sm text-muted-foreground">·</span>
      <Item slug="sign" label="Sign" />
    </nav>
  );
}


