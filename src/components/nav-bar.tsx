'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/clientes', label: 'Clientes' },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-6">
        <span className="text-sm font-semibold tracking-tight">FAP Recovery</span>
        <nav className="flex items-center gap-1">
          {LINKS.map((link) => {
            const ativo = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  ativo ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
