'use client';

import { useEffect, useState, useMemo } from 'react';
import { useFirestore } from '@/firebase';
import { getRegistrations, getWinners } from '@/lib/data';
import { Loader2 } from 'lucide-react';
import type { Registration, Winner } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function ParticipantsPage() {
  const firestore = useFirestore();
  const [participants, setParticipants] = useState<Registration[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (firestore) {
        setLoading(true);
        const [regs, wins] = await Promise.all([
            getRegistrations(firestore),
            getWinners(firestore)
        ]);
        
        regs.sort((a, b) => a.fullName.localeCompare(b.fullName));
        setParticipants(regs);
        setWinners(wins);
        setLoading(false);
      }
    }
    loadData();
  }, [firestore]);

  const winnerMap = useMemo(() => {
    return new Map(winners.map(winner => [winner.registrationId, { prizeType: winner.prizeType, prizeName: winner.prizeName }]));
  }, [winners]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="animate-spin h-10 w-10 text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-0">
            {participants.length > 0 ? (
              participants.map((participant) => {
                const winnerInfo = winnerMap.get(participant.id);
                const prizeType = winnerInfo?.prizeType;
                return (
                  <div
                    key={participant.id}
                    className={cn("p-3 border", {
                        "bg-destructive/40": prizeType === 'grand',
                        "bg-primary/40": prizeType === 'major',
                        "bg-accent/20": prizeType === 'minor',
                    })}
                    title={`${participant.fullName}${winnerInfo ? ` - ${winnerInfo.prizeName}` : ''}`}
                  >
                    <div className="font-medium truncate text-sm">
                      {participant.fullName}
                    </div>
                    {winnerInfo && (
                        <div className="text-xs text-foreground/80 truncate">{winnerInfo.prizeName}</div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="col-span-full text-center h-24 flex items-center justify-center text-muted-foreground">
                No registrations found.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
