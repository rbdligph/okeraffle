'use client';

import { useEffect, useState, useMemo } from 'react';
import { useFirestore } from '@/firebase';
import { subscribeToRegistrations, subscribeToWinners } from '@/lib/data';
import { Loader2 } from 'lucide-react';
import { Confetti } from '@/components/confetti';
import type { Registration, Winner } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export default function ParticipantsPage() {
  const firestore = useFirestore();
  const [participants, setParticipants] = useState<Registration[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [prevWinnersCount, setPrevWinnersCount] = useState(0);

  useEffect(() => {
    if (!firestore) return;

    setLoading(true);

    const unsubscribeRegs = subscribeToRegistrations(firestore, (regs) => {
      const confirmedRegs = regs.filter(reg => reg.confirmed);
      confirmedRegs.sort((a, b) => a.fullName.localeCompare(b.fullName));
      setParticipants(confirmedRegs);
    });

    const unsubscribeWinners = subscribeToWinners(firestore, (wins) => {
      setWinners(wins);

      // Check if we have new winners to show confetti
      // We only show confetti if we already had some data (not on first load)
      // and the number of winners increased.
      if (!loading && wins.length > prevWinnersCount && prevWinnersCount > 0) {
        setShowConfetti(true);
      }
      setPrevWinnersCount(wins.length);

      // Once we have initial data (or updates), we can stop loading.
      // Note: This might cause a quick flash if one loads before the other, 
      // but typically onSnapshot fires fast for initial data.
      // For better UX, we could track loaded state for both.
      setLoading(false);
    });

    return () => {
      unsubscribeRegs();
      unsubscribeWinners();
    };
  }, [firestore, loading, prevWinnersCount]);

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
    <div className="container mx-auto p-4 md:p-8">
      {showConfetti && <Confetti onComplete={() => setShowConfetti(false)} />}
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
                      <div className="text-xs text-foreground/80 truncate">{winnerInfo.prizeName} <Badge variant={
                        prizeType === 'grand' ? 'destructive' :
                          prizeType === 'major' ? 'default' :
                            'secondary'
                      } className="capitalize">{prizeType}</Badge> </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="col-span-full text-center h-24 flex items-center justify-center text-muted-foreground">
                No confirmed participants found.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
