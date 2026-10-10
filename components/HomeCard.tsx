// components/HomeCard.tsx
// White card used on the front page: icon, title, subtitle, arrow, and optional body
// Version: 1.0.0
// Date: 2026-10-10

import Link from 'next/link';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export const HOME = {
  navy: '#002774',
  ground: '#F6F2EA',
  border: '#E3DCCF',
  muted: '#5B6660',
  text: '#1F2A24',
};

interface HomeCardProps {
  href: string;
  icon: LucideIcon;
  title: string;
  subtitle: ReactNode;
  tone?: 'green' | 'navy';
  children?: ReactNode;
}

export function HomeCard({ href, icon: Icon, title, subtitle, tone = 'green', children }: HomeCardProps) {
  const chip = tone === 'navy' ? 'bg-[#E3E8F4] text-[#002774]' : 'bg-[#E6EFE8] text-gabriola-green';
  return (
    <Link
      href={href}
      className="group block bg-white border border-[#E3DCCF] rounded-2xl p-5 text-[#1F2A24] shadow-sm hover:shadow-md hover:border-[#CFC6B4] transition-shadow"
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${chip}`}>
          <Icon className="w-[22px] h-[22px]" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-display text-[21px] font-bold leading-tight text-gabriola-green-dark">{title}</h2>
          <div className="text-[13px] text-[#5B6660] mt-0.5">{subtitle}</div>
        </div>
        <ChevronRight className="w-5 h-5 text-[#5B6660] flex-shrink-0 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
      </div>
      {children && <div className="mt-3">{children}</div>}
    </Link>
  );
}
