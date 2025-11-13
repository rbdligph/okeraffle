'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { getRegistrations, getRaffleItems, getWinners, addWinners } from '@/lib/data';
import type { Registration, RaffleItem, Winner } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Users, Trophy, Check, ArrowUpDown, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { WinnersDialog } from '@/components/winners-dialog';
import { DraftedParticipantsDialog } from '@/components/drafted-participants-dialog';

type SortKey = 'fullName' | 'round';
type SortDirection = 'asc' | 'desc';
type PrizeFilter = 'all' | 'grand' | 'major' | 'minor';

function RafflePage() {
    const { user, loading: userLoading } = useUser();
    const router = useRouter();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [allRegistrations, setAllRegistrations] = useState<Registration[]>([]);
    const [allRaffleItems, setAllRaffleItems] = useState<RaffleItem[]>([]);
    const [pastWinners, setPastWinners] = useState<Winner[]>([]);
    const [loading, setLoading] = useState(true);
    const [numWinners, setNumWinners] = useState<number>(1);
    const [currentRound, setCurrentRound] = useState<number>(1);
    const [isConfirming, setIsConfirming] = useState(false);
    
    // Round-specific state
    const [draftPool, setDraftPool] = useState<Registration[]>([]);
    const [prizeAssignments, setPrizeAssignments] = useState<Record<string, string>>({}); // { registrationId: prizeId }
    const [prizeFilter, setPrizeFilter] = useState<PrizeFilter>('all');
    const [isWinnersDialogOpen, setIsWinnersDialogOpen] = useState(false);
    const [isDraftedDialogOpen, setIsDraftedDialogOpen] = useState(false);
    const [justConfirmedWinners, setJustConfirmedWinners] = useState<Winner[]>([]);


    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'round', direction: 'asc' });

    useEffect(() => {
        if (!userLoading && !user) {
            router.push('/login');
        }
    }, [user, userLoading, router]);

    const fetchData = async () => {
        if (user && firestore) {
            setLoading(true);
            const [regs, items, winners] = await Promise.all([
                getRegistrations(firestore),
                getRaffleItems(firestore),
                getWinners(firestore),
            ]);
            
            setAllRegistrations(regs);
            setAllRaffleItems(items);
            setPastWinners(winners);

            const maxRound = winners.reduce((max, winner) => Math.max(max, winner.round), 0);
            setCurrentRound(maxRound + 1);

            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, firestore]);

    const undraftedRegistrations = useMemo(() => {
        const winnerIds = new Set(pastWinners.map(w => w.registrationId));
        return allRegistrations.filter(reg => !winnerIds.has(reg.id));
    }, [allRegistrations, pastWinners]);

     const sortedPastWinners = useMemo(() => {
        let sortableItems = [...pastWinners];

        sortableItems.sort((a, b) => {
            const aVal = a[sortConfig.key];
            const bVal = b[sortConfig.key];

            let comparison = 0;
            if (aVal! > bVal!) {
                comparison = 1;
            } else if (aVal! < bVal!) {
                comparison = -1;
            }

            return sortConfig.direction === 'desc' ? comparison * -1 : comparison;
        });

        return sortableItems;
    }, [pastWinners, sortConfig]);

    const availablePrizesForRound = useMemo(() => {
        const assignedPrizeIdsInCurrentRound = new Set(Object.values(prizeAssignments));
        const wonPrizeIdsInPastRounds = new Set(pastWinners.map(w => w.prizeId));
        
        return allRaffleItems.filter(item => {
            const isAvailable = !assignedPrizeIdsInCurrentRound.has(item.id) && !wonPrizeIdsInPastRounds.has(item.id);
            if (!isAvailable) return false;
            if (prizeFilter === 'all') return true;
            return item.prizeType === prizeFilter;
        });
    }, [allRaffleItems, prizeAssignments, pastWinners, prizeFilter]);

    const handleSort = (key: SortKey) => {
        setSortConfig(prevConfig => ({
            key,
            direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const handleDraftWinners = () => {
        if (numWinners > undraftedRegistrations.length) {
            toast({
                variant: 'destructive',
                title: 'Not enough participants',
                description: `You can only draw up to ${undraftedRegistrations.length} winner(s).`,
            });
            return;
        }

        const shuffled = [...undraftedRegistrations];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        
        const drafted = shuffled.slice(0, numWinners);
        setDraftPool(drafted);
        setIsDraftedDialogOpen(true);
    };
    
    const handleAssignPrize = (registrationId: string, prizeId: string) => {
        setPrizeAssignments(prev => {
            const newAssignments = {...prev};
            
            // If the prize is already assigned to someone else, unassign it from them.
            Object.keys(newAssignments).forEach(regId => {
                if (newAssignments[regId] === prizeId) {
                    delete newAssignments[regId];
                }
            });

            if (prizeId) {
                newAssignments[registrationId] = prizeId;
            } else {
                delete newAssignments[registrationId];
            }
            return newAssignments;
        });
    };

    const handleConfirmWinners = async () => {
        if (!firestore) return;
        if(Object.keys(prizeAssignments).length === 0) {
            toast({ variant: 'destructive', title: 'No prizes assigned' });
            return;
        }

        setIsConfirming(true);

        try {
            const winnersToSave: Winner[] = Object.entries(prizeAssignments).map(([registrationId, prizeId]) => {
                const registration = draftPool.find(p => p.id === registrationId)!;
                const prize = allRaffleItems.find(p => p.id === prizeId)!;
                return {
                    id: `${currentRound}-${registrationId}`,
                    registrationId,
                    fullName: registration.fullName,
                    prizeId,
                    prizeName: prize.name,
                    prizeType: prize.prizeType,
                    round: currentRound,
                    confirmedAt: new Date(), // This will be replaced by serverTimestamp
                };
            });

            await addWinners(firestore, winnersToSave.map(({ id, confirmedAt, ...rest}) => rest));

            toast({
                title: 'Winners Confirmed',
                description: `Round ${currentRound} winners have been saved.`,
            });
            
            setJustConfirmedWinners(winnersToSave);
            setIsWinnersDialogOpen(true);

            // Reset for next round
            setDraftPool([]);
            setPrizeAssignments({});
            fetchData(); // Refresh data

        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error confirming winners',
                description: 'Please try again.',
            });
        } finally {
            setIsConfirming(false);
        }
    };

    const resetRound = () => {
        setDraftPool([]);
        setPrizeAssignments({});
    };

    const isRoundInProgress = draftPool.length > 0;

    const SortableHeader = ({ sortKey, children }: { sortKey: SortKey, children: React.ReactNode }) => (
        <TableHead>
            <Button variant="ghost" onClick={() => handleSort(sortKey)}>
                {children}
                <ArrowUpDown className={`ml-2 h-4 w-4 ${sortConfig.key !== sortKey && 'text-muted-foreground'}`} />
            </Button>
        </TableHead>
    );

    if (loading || userLoading) {
        return <div className="flex justify-center items-center min-h-screen"> <Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;
    }

    return (
        <>
        <main className="container mx-auto p-4 md:p-8">
            <header className="mb-8">
                <h1 className="text-4xl font-bold font-headline tracking-tighter text-accent">Raffle Draw</h1>
                <p className="text-muted-foreground">Manually select winners from the registered participants and assign prizes.</p>
            </header>
            <div className="grid gap-8 lg:grid-cols-3">
                {/* Control Panel */}
                <div className="lg:col-span-1 space-y-8">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Remaining Participants</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{undraftedRegistrations.length}</div>
                            <p className="text-xs text-muted-foreground">of {allRegistrations.length} total registrations</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Round {currentRound}</CardTitle>
                            <CardDescription>Select the number of participants to draft for this round.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="num-winners">Number of Participants</Label>
                                <Input
                                    id="num-winners"
                                    type="number"
                                    min="1"
                                    max={undraftedRegistrations.length}
                                    value={numWinners || ''}
                                    onChange={(e) => setNumWinners(Math.max(1, parseInt(e.target.value, 10) || 0))}
                                    disabled={isRoundInProgress}
                                />
                            </div>
                        </CardContent>
                        <CardFooter>
                            {!isRoundInProgress ? (
                                <Button
                                    className="w-full"
                                    onClick={handleDraftWinners}
                                    disabled={undraftedRegistrations.length === 0 || numWinners <= 0}>
                                    <Trophy className="mr-2" />
                                    Draft {numWinners} Participant(s)
                                </Button>
                            ) : (
                                <Button variant="outline" className="w-full" onClick={resetRound}>
                                    Reset Round
                                </Button>
                            )}
                        </CardFooter>
                    </Card>

                    {isRoundInProgress && (
                        <Card className="bg-primary/10 border-primary">
                            <CardHeader>
                                <CardTitle className="text-primary">Confirm Round {currentRound} Winners?</CardTitle>
                                <CardDescription>This will permanently save them to the winners list and remove them from future draws.</CardDescription>
                            </CardHeader>
                            <CardFooter>
                                <Button className="w-full" onClick={handleConfirmWinners} disabled={isConfirming || Object.keys(prizeAssignments).length === 0}>
                                    {isConfirming ? <Loader2 className="mr-2 animate-spin" /> : <Check className="mr-2" />}
                                    Confirm {Object.keys(prizeAssignments).length} Winner(s) & Proceed
                                </Button>
                            </CardFooter>
                        </Card>
                    )}
                </div>

                {/* Winners Display */}
                <div className="lg:col-span-2 space-y-8">
                     {isRoundInProgress && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Assign Prizes for Round {currentRound}</CardTitle>
                                <CardDescription>Select a prize for each of the drafted participants.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                               <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">Filter Prizes:</span>
                                    {(['all', 'grand', 'major', 'minor'] as PrizeFilter[]).map(filter => (
                                        <Button
                                            key={filter}
                                            variant={prizeFilter === filter ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setPrizeFilter(filter)}
                                            className="capitalize"
                                        >
                                            {filter}
                                        </Button>
                                    ))}
                                </div>
                               {draftPool.length > 0 ? (
                                    <div className="space-y-4">
                                        {draftPool.map(winner => (
                                            <div key={winner.id} className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4 items-center p-3 rounded-lg border">
                                                <div className='space-y-1'>
                                                    <p className="font-semibold flex items-center gap-2"><User size={16} />{winner.fullName}</p>
                                                </div>
                                                 <Select onValueChange={(value) => handleAssignPrize(winner.id, value)} value={prizeAssignments[winner.id] || ''}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select a prize..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {availablePrizesForRound.map(prize => (
                                                            <SelectItem key={prize.id} value={prize.id}>
                                                                <div className="flex items-center justify-between w-full">
                                                                    <span>{prize.name}</span>
                                                                    <Badge variant={
                                                                        prize.prizeType === 'grand' ? 'destructive' :
                                                                        prize.prizeType === 'major' ? 'default' :
                                                                        'secondary'
                                                                    } className="capitalize ml-2">{prize.prizeType}</Badge>
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                        {prizeAssignments[winner.id] && !availablePrizesForRound.some(p => p.id === prizeAssignments[winner.id]) &&
                                                            (() => {
                                                                const assignedPrize = allRaffleItems.find(p => p.id === prizeAssignments[winner.id]);
                                                                return assignedPrize ? (
                                                                    <SelectItem key={assignedPrize.id} value={assignedPrize.id}>
                                                                        <div className="flex items-center justify-between w-full">
                                                                            <span>{assignedPrize.name}</span>
                                                                             <Badge variant={
                                                                                assignedPrize.prizeType === 'grand' ? 'destructive' :
                                                                                assignedPrize.prizeType === 'major' ? 'default' :
                                                                                'secondary'
                                                                            } className="capitalize ml-2">{assignedPrize.prizeType}</Badge>
                                                                        </div>
                                                                    </SelectItem>
                                                                ) : null;
                                                            })()
                                                        }
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                     <Alert>
                                        <AlertTitle>Draft Participants First</AlertTitle>
                                        <AlertDescription>Use the control panel to draft participants for this round.</AlertDescription>
                                    </Alert>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader>
                            <CardTitle>Past Winners</CardTitle>
                            <CardDescription>List of all winners from previous rounds.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="border rounded-md max-h-[600px] overflow-y-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <SortableHeader sortKey="round">Round</SortableHeader>
                                            <SortableHeader sortKey="fullName">Winner</SortableHeader>
                                            <TableHead>Prize Won</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sortedPastWinners.length > 0 ? (
                                            sortedPastWinners.map(winner => (
                                                <TableRow key={winner.id}>
                                                    <TableCell className="font-mono text-center w-20">{winner.round}</TableCell>
                                                    <TableCell className='font-medium'>{winner.fullName}</TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className='font-medium'>{winner.prizeName}</span>
                                                             <Badge variant={
                                                                winner.prizeType === 'grand' ? 'destructive' :
                                                                winner.prizeType === 'major' ? 'default' :
                                                                'secondary'
                                                            } className="capitalize w-fit mt-1">{winner.prizeType}</Badge>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={3} className="h-24 text-center">No winners have been confirmed yet.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </main>
        <WinnersDialog
            isOpen={isWinnersDialogOpen}
            onOpenChange={setIsWinnersDialogOpen}
            winners={justConfirmedWinners}
            round={currentRound - 1}
        />
        <DraftedParticipantsDialog
            isOpen={isDraftedDialogOpen}
            onOpenChange={setIsDraftedDialogOpen}
            participants={draftPool}
        />
        </>
    );
}

export default RafflePage;
