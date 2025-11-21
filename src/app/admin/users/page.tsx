
'use client';

import { useState, useEffect, useActionState, useRef, useTransition, useMemo } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getRegistrations } from '@/lib/data';
import type { Registration } from '@/lib/types';
import { bulkAddUsers, type BulkUploadState, setManualConfirmation } from '@/app/actions';
import { PlusCircle, Edit, Trash2, Loader2, Upload, Search, ArrowUpDown, ChevronLeft, ChevronRight, CheckCircle, XCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

type SortDirection = 'asc' | 'desc';
type SortKey = keyof Registration;

function formatRegistrationDate(date: Date) {
    return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date);
}

function BulkUploadDialog({ isOpen, onOpenChange, onUploadComplete }: { isOpen: boolean, onOpenChange: (open: boolean) => void, onUploadComplete: () => void }) {
    const initialState: BulkUploadState = { message: '' };
    const [state, bulkAddAction] = useActionState(bulkAddUsers, initialState);
    const [isPending, startTransition] = useTransition();
    const [fileContent, setFileContent] = useState<any[]>([]);
    const [fileName, setFileName] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    useEffect(() => {
        if (!state.message) return;
        
        if (state.successCount !== undefined) {
             toast({
                title: 'Bulk Upload Finished',
                description: `${state.successCount} users added. ${state.errors?.length || 0} users failed.`,
            });
            if(state.successCount > 0) {
                onUploadComplete();
            }
             if((state.errors?.length || 0) === 0){
                onOpenChange(false);
             }
        } else {
             toast({
                variant: 'destructive',
                title: 'Upload Error',
                description: state.message
            });
        }
    }, [state, toast, onUploadComplete, onOpenChange]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            const rows = text.trim().split('\n').filter(row => row.trim() !== '');
            if (rows.length < 2) return;
            const headers = rows[0].split(',').map(h => h.trim());
            const data = rows.slice(1).map(row => {
                const values = row.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g)?.map(v => v.replace(/^"|"$/g, '').trim()) || [];
                const obj = headers.reduce((obj, header, index) => {
                    obj[header as keyof Registration] = values[index];
                    return obj;
                }, {} as any);
                return obj;
            });
            setFileContent(data);
        };
        reader.readAsText(file);
    };

    const handleUpload = () => {
        if (fileContent.length === 0) {
            toast({ variant: 'destructive', title: 'No data', description: 'Please select a valid CSV file.' });
            return;
        }
        startTransition(() => {
            bulkAddAction(fileContent);
        });
    };
    
    const handleCloseDialog = () => {
        if (isPending) return;
        setFileContent([]);
        setFileName('');
        if(fileInputRef.current) fileInputRef.current.value = '';
        onOpenChange(false);
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleCloseDialog}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Bulk Upload Users</DialogTitle>
                    <DialogDescription>
                        Upload a CSV file with columns: `fullName`, `email`.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="csv-file">CSV File</Label>
                        <Input
                            id="csv-file"
                            type="file"
                            accept=".csv"
                            onChange={handleFileChange}
                            ref={fileInputRef}
                        />
                         {fileName && <p className="text-sm text-muted-foreground">Selected: {fileName}</p>}
                    </div>

                    {state.errors && state.errors.length > 0 && (
                        <Alert variant="destructive">
                            <AlertTitle>Upload Errors</AlertTitle>
                            <AlertDescription>
                                <ul className="list-disc pl-5 max-h-40 overflow-y-auto">
                                    {state.errors.map((err, i) => <li key={i}>{err}</li>)}
                                </ul>
                            </AlertDescription>
                        </Alert>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="secondary" onClick={() => handleCloseDialog()} disabled={isPending}>Cancel</Button>
                    <Button onClick={handleUpload} disabled={isPending || fileContent.length === 0}>
                        {isPending ? <Loader2 className="mr-2 animate-spin" /> : <Upload className="mr-2" />}
                        Upload {fileContent.length > 0 ? `${fileContent.length} users` : ''}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function ConfirmationButton({ email, isConfirmed, onStatusChange }: { email: string, isConfirmed: boolean, onStatusChange: () => void }) {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const handleClick = () => {
        startTransition(async () => {
            const result = await setManualConfirmation(email, !isConfirmed);
            if (result.success) {
                toast({ title: 'Success', description: result.message });
                onStatusChange();
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.message });
            }
        });
    };

    return (
        <Button
            variant={isConfirmed ? "destructive" : "default"}
            size="sm"
            onClick={handleClick}
            disabled={isPending}
        >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isConfirmed ? 'Un-confirm' : 'Confirm'}
        </Button>
    );
}


function AdminDashboard({ 
    registrations,
    onSearchChange,
    currentPage,
    totalPages,
    onPageChange,
    sortConfig,
    onSort,
    onBulkUpload,
    onStatusChange
}: { 
    registrations: Registration[],
    onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    sortConfig: { key: SortKey; direction: SortDirection };
    onSort: (key: SortKey) => void;
    onBulkUpload: () => void;
    onStatusChange: () => void;
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                placeholder="Search by name or email..."
                className="pl-10"
                onChange={onSearchChange}
                />
            </div>
            <div className="flex gap-2">
                <Button onClick={onBulkUpload} variant="outline">
                    <Upload className="mr-2 h-4 w-4" />
                    Bulk Upload Users
                </Button>
            </div>
           </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Email</TableHead>
                  <SortableHeader sortKey="confirmed">Confirmed</SortableHeader>
                  <SortableHeader sortKey="createdAt">Registered At</SortableHeader>
                  <SortableHeader sortKey="confirmedAt">Confirmed At</SortableHeader>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registrations.length > 0 ? (
                  registrations.map((reg) => (
                    <TableRow key={reg.id}>
                      <TableCell className="font-medium">{reg.fullName}</TableCell>
                      <TableCell>{reg.email}</TableCell>
                       <TableCell>
                          {reg.confirmed ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-muted-foreground" />
                          )}
                        </TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm">
                        {formatRegistrationDate(reg.createdAt)}
                      </TableCell>
                       <TableCell className="text-right text-muted-foreground text-sm">
                        {reg.confirmedAt ? formatRegistrationDate(reg.confirmedAt) : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                          <ConfirmationButton email={reg.email} isConfirmed={reg.confirmed} onStatusChange={onStatusChange} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">
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
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const fetchRegistrations = async () => {
      if (user && firestore) {
        setDataLoading(true);
        const regs = await getRegistrations(firestore);
        setRegistrations(regs);
        setDataLoading(false);
      }
    };

  useEffect(() => {
    fetchRegistrations();
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
        
        if (aVal === undefined || aVal === null) return 1;
        if (bVal === undefined || bVal === null) return -1;


        let comparison = 0;
        if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
            comparison = aVal === bVal ? 0 : aVal ? -1 : 1;
        } else if (aVal instanceof Date && bVal instanceof Date) {
            comparison = aVal.getTime() - bVal.getTime();
        } else if (typeof aVal === 'string' && typeof bVal === 'string') {
            comparison = aVal.localeCompare(bVal);
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

  const handleBulkUpload = () => {
    setIsBulkUploadOpen(true);
  };


  if (loading || !user || dataLoading) {
    return (
        <div className="flex justify-center items-center min-h-[calc(100vh-8rem)]">
            <Loader2 className="animate-spin h-10 w-10 text-primary" />
        </div>
    );
  }

  return (
    <>
      <AdminDashboard 
        registrations={paginatedRegistrations} 
        onSearchChange={(e) => setSearchQuery(e.target.value)}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        sortConfig={sortConfig}
        onSort={handleSort}
        onBulkUpload={handleBulkUpload}
        onStatusChange={fetchRegistrations}
      />
      <BulkUploadDialog isOpen={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen} onUploadComplete={fetchRegistrations} />
    </>
  );
}
