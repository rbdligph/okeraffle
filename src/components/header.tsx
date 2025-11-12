import Link from 'next/link';
import { Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Header() {
  return (
    <header className="bg-card border-b sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2" aria-label="Oke Raffle Home">
          <Ticket className="h-7 w-7 text-accent" />
          <span className="font-bold font-headline text-lg tracking-wide">Oke Raffle</span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Button variant="ghost" asChild>
            <Link href="/">Register</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/participants">Participants</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/raffle">Raffle Draw</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/admin">Admin</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
