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
import { Users, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DraftedParticipantsDialog({
  isOpen,
  onOpenChange,
  participants,
  highlightId,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  participants: Registration[];
  highlightId?: string | null;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-fit max-w-[90vw]">
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
                className={cn(
                  "flex flex-col rounded-lg border bg-card p-3 transition-all duration-500",
                  highlightId === participant.id && "border-primary bg-primary/50 shadow-lg"
                )}
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-2xl text-primary-foreground">{participant.fullName}</p>
                  {highlightId === participant.id && (
                    <div className="flex items-center text-xs font-medium text-primary-foreground animate">
                      <Sparkles className="mr-1 h-4 w-4" />
                      New
                    </div>
                  )}
                </div>
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
