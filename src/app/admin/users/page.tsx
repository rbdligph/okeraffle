'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { getRegistrations } from '@/lib/data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import type { Registration } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';

type SortDirection = 'asc' | 'desc';
type SortKey = keyof Registration;

function formatRegistrationDate(date: Date) {
    return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date);
}

function AdminDashboard({ 
    registrations,
    onSearchChange,
    currentPage,
    totalPages,
    onPageChange,
    sortConfig,
    onSort,
}: { 
    registrations: Registration[],
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
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name or email..."
              className="pl-10"
              onChange={onSearchChange}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Email</TableHead>
                  <SortableHeader sortKey="createdAt">Registered At</SortableHeader>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registrations.length > 0 ? (
                  registrations.map((reg) => (
                    <TableRow key={reg.id}>
                      <TableCell className="font-medium">{reg.fullName}</TableCell>
                      <TableCell>{reg.email}</TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm">
                        {formatRegistrationDate(reg.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center h-24">
                      No registrations found.
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


export default function UsersPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'createdAt', direction: 'desc' });
  const itemsPerPage = 10;

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    async function loadData() {
      if (user && firestore) {
        const regs = await getRegistrations(firestore);
        setRegistrations(regs);
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

  const sortedRegistrations = useMemo(() => {
    let sortableItems = [...registrations];
    sortableItems.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];

        let comparison = 0;
        if (aVal > bVal) {
            comparison = 1;
        } else if (aVal < bVal) {
            comparison = -1;
        }

        return sortConfig.direction === 'desc' ? comparison * -1 : comparison;
    });
    return sortableItems;
  }, [registrations, sortConfig]);

  const filteredRegistrations = useMemo(() => {
    if (!searchQuery) {
        return sortedRegistrations;
    }
    return sortedRegistrations.filter((reg) => {
        const searchLower = searchQuery.toLowerCase();
        return (
            reg.fullName.toLowerCase().includes(searchLower) ||
            reg.email.toLowerCase().includes(searchLower)
        );
    });
  }, [sortedRegistrations, searchQuery]);
  
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredRegistrations.length / itemsPerPage));
  const paginatedRegistrations = filteredRegistrations.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
  );


  if (loading || !user || dataLoading) {
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-10 w-24" />
            </div>
            <Skeleton className="h-96 w-full" />
        </div>
    );
  }

  return <AdminDashboard 
    registrations={paginatedRegistrations} 
    onSearchChange={(e) => setSearchQuery(e.target.value)}
    currentPage={currentPage}
    totalPages={totalPages}
    onPageChange={setCurrentPage}
    sortConfig={sortConfig}
    onSort={handleSort}
  />;
}
