'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { getWinners } from '@/lib/data';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import type { Winner } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

type SortDirection = 'asc' | 'desc';
type SortKey = keyof Winner;

function formatRegistrationDate(date: Date) {
    return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date);
}

function WinnersTable({ 
    winners,
    onSearchChange,
    currentPage,
    totalPages,
    onPageChange,
    sortConfig,
    onSort,
}: { 
    winners: Winner[],
    onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    sortConfig: { key: SortKey; direction: SortDirection };
    onSort: (key: SortKey) => void;
}) {
  
  const SortableHeader = ({ sortKey, children }: { sortKey: SortKey, children: React.ReactNode }) => (
    <TableHead>
        <Button variant="ghost" onClick={() => onSort(sortKey)}>
            {children}
            <ArrowUpDown className={`ml-2 h-4 w-4 ${sortConfig.key !== sortKey && 'text-muted-foreground'}`} />
        </Button>
    </TableHead>
  );

  return (
    <main>
      <Card>
        <CardContent className="pt-6">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name or prize..."
              className="pl-10"
              onChange={onSearchChange}
            />
          </div>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHeader sortKey="fullName">Winner</SortableHeader>
                  <SortableHeader sortKey="prizeName">Prize Won</SortableHeader>
                  <SortableHeader sortKey="prizeType">Prize Type</SortableHeader>
                  <SortableHeader sortKey="round">Round</SortableHeader>
                  <SortableHeader sortKey="confirmedAt">Date Won</SortableHeader>
                </TableRow>
              </TableHeader>
              <TableBody>
                {winners.length > 0 ? (
                  winners.map((winner) => (
                    <TableRow key={winner.id}>
                      <TableCell className="font-medium">
                        {winner.fullName}
                      </TableCell>
                      <TableCell>{winner.prizeName}</TableCell>
                      <TableCell>
                        <Badge variant={
                            winner.prizeType === 'grand' ? 'destructive' :
                            winner.prizeType === 'major' ? 'default' :
                            'secondary'
                        } className="capitalize">{winner.prizeType}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-center">{winner.round}</TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm">
                        {formatRegistrationDate(winner.confirmedAt)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">
                      No winners found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}


export default function WinnersPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const [winners, setWinners] = useState<Winner[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'confirmedAt', direction: 'desc' });
  const itemsPerPage = 10;

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    async function loadData() {
      if (user && firestore) {
        const fetchedWinners = await getWinners(firestore);
        setWinners(fetchedWinners);
        setDataLoading(false);
      }
    }
    loadData();
  }, [user, firestore]);

  const handleSort = (key: SortKey) => {
    setSortConfig(prevConfig => ({
        key,
        direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortedWinners = useMemo(() => {
    let sortableItems = [...winners];
    sortableItems.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];

        if (aVal === undefined || bVal === undefined) return 0;

        let comparison = 0;
        if (aVal > bVal) {
            comparison = 1;
        } else if (aVal < bVal) {
            comparison = -1;
        }

        return sortConfig.direction === 'desc' ? comparison * -1 : comparison;
    });
    return sortableItems;
  }, [winners, sortConfig]);

  const filteredWinners = useMemo(() => {
    if (!searchQuery) {
        return sortedWinners;
    }
    return sortedWinners.filter((winner) => {
        const searchLower = searchQuery.toLowerCase();
        return (
            winner.fullName.toLowerCase().includes(searchLower) ||
            winner.prizeName.toLowerCase().includes(searchLower)
        );
    });
  }, [sortedWinners, searchQuery]);
  
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredWinners.length / itemsPerPage));
  const paginatedWinners = filteredWinners.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
  );


  if (loading || !user || dataLoading) {
    return (
        <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-96 w-full" />
        </div>
    );
  }

  return <WinnersTable
    winners={paginatedWinners} 
    onSearchChange={(e) => setSearchQuery(e.target.value)}
    currentPage={currentPage}
    totalPages={totalPages}
    onPageChange={setCurrentPage}
    sortConfig={sortConfig}
    onSort={handleSort}
  />;
}
