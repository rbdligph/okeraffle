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
import type { Registration } from '@/lib/types';
import { Users } from 'lucide-react';

export function DraftedParticipantsDialog({
  isOpen,
  onOpenChange,
  participants,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  participants: Registration[];
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex flex-col items-center">
            <Users className="h-12 w-12 text-primary mb-4" />
            <DialogTitle className="text-3xl font-headline text-center">Participants Drafted</DialogTitle>
            <DialogDescription className="text-center mt-2">
              The following {participants.length} participants have been selected for this round.
            </DialogDescription>
          </div>
        </DialogHeader>
        <div className="my-6 max-h-[50vh] overflow-y-auto pr-4">
          <div className="space-y-3">
            {participants.map((participant) => (
              <div
                key={participant.id}
                className="flex flex-col rounded-lg border bg-card p-3"
              >
                <p className="font-semibold text-2xl text-primary-foreground">{participant.fullName}</p>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter className="sm:justify-center">
          <Button onClick={() => onOpenChange(false)}>Continue to Prize Assignment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
