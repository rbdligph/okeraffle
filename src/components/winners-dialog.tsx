
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Winner } from '@/lib/types';
import { Badge } from './ui/badge';
import { Trophy } from 'lucide-react';
import { useMemo } from 'react';
import { Confetti } from './confetti';

export function WinnersDialog({
  isOpen,
  onOpenChange,
  winners,
  round,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  winners: Winner[];
  round: number;
}) {
  const prizeOrder: Record<Winner['prizeType'], number> = {
    grand: 1,
    major: 2,
    minor: 3,
  };

  const sortedWinners = useMemo(() => {
    return [...winners].sort((a, b) => prizeOrder[a.prizeType] - prizeOrder[b.prizeType]);
  }, [winners, prizeOrder]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {isOpen && <Confetti />}
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex flex-col items-center">
            <Trophy className="h-16 w-16 text-yellow-400 mb-4" />
            <DialogTitle className="text-3xl font-headline text-center">Congratulations to the Winners!</DialogTitle>
            <DialogDescription className="text-center mt-2">Here are the winners for Round {round}.</DialogDescription>
          </div>
        </DialogHeader>
        <div className="my-6 max-h-[50vh] overflow-y-auto pr-4">
          <div className="space-y-4">
            {sortedWinners.map((winner) => (
              <div
                key={winner.id}
                className="flex items-center justify-between rounded-lg border bg-card p-4 shadow-sm"
              >
                <div>
                  <p className="text-2xl font-semibold text-primary-foreground">{winner.fullName}</p>
                  <p className="text-sm text-muted-foreground">{winner.prizeName}</p>
                </div>
                <Badge
                  variant={
                    winner.prizeType === 'grand'
                      ? 'destructive'
                      : winner.prizeType === 'major'
                      ? 'default'
                      : 'secondary'
                  }
                  className="capitalize text-sm"
                >
                  {winner.prizeType} Prize
                </Badge>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter className="sm:justify-center">
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
