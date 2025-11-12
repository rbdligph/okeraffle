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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { getRaffleItems } from '@/lib/data';
import type { RaffleItem } from '@/lib/types';
import { createOrUpdateRaffleItem, deleteRaffleItem, bulkAddRaffleItems, type FormState, type BulkUploadState } from '@/app/actions';
import { PlusCircle, Edit, Trash2, Loader2, Upload, Search, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useFormStatus } from 'react-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

type SortDirection = 'asc' | 'desc';
type SortKey = keyof RaffleItem;

function SubmitButton({ isEditing }: { isEditing: boolean }) {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Save Changes' : 'Add Item'}
        </Button>
    );
}

function ItemForm({ item, onFormSubmitted }: { item?: RaffleItem | null, onFormSubmitted: () => void }) {
    const initialState: FormState = { message: '', isEditing: !!item };
    const [state, formAction] = useActionState(createOrUpdateRaffleItem, initialState);
    const { toast } = useToast();
    const isEditing = !!item;

    useEffect(() => {
        if (state.message && !state.errors) {
            toast({ title: 'Success', description: state.message });
            onFormSubmitted();
        } else if (state.message && state.errors) {
            if (state.errors.form) {
                 toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: state.errors.form.join('\n') || state.message,
                });
            }
        }
    }, [state, toast, onFormSubmitted]);
    
    return (
        <form action={formAction} className="space-y-4">
             {isEditing && <input type="hidden" name="isEditing" value="true" />}
            <div className="space-y-2">
                <Label htmlFor="id">Item ID</Label>
                <Input id="id" name="id" defaultValue={item?.id || ''} required placeholder="e.g., PRIZE-001" disabled={isEditing} />
                 {state.errors?.id && <p className="text-sm font-medium text-destructive">{state.errors.id.join(', ')}</p>}
            </div>
            <div className="space-y-2">
                <Label htmlFor="name">Item Name</Label>
                <Input id="name" name="name" defaultValue={item?.name || ''} required placeholder="e.g., Grand Prize" />
                 {state.errors?.name && <p className="text-sm font-medium text-destructive">{state.errors.name.join(', ')}</p>}
            </div>
             <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" defaultValue={item?.description || ''} required placeholder="e.g., A brand new car" />
                 {state.errors?.description && <p className="text-sm font-medium text-destructive">{state.errors.description.join(', ')}</p>}
            </div>
            <div className="space-y-2">
                <Label htmlFor="prizeType">Prize Type</Label>
                <Select name="prizeType" required defaultValue={item?.prizeType || ''}>
                    <SelectTrigger id="prizeType">
                        <SelectValue placeholder="Select a prize type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="minor">Minor</SelectItem>
                        <SelectItem value="major">Major</SelectItem>
                        <SelectItem value="grand">Grand</SelectItem>
                    </SelectContent>
                </Select>
                 {state.errors?.prizeType && <p className="text-sm font-medium text-destructive">{state.errors.prizeType.join(', ')}</p>}
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="secondary">Cancel</Button>
                </DialogClose>
                <SubmitButton isEditing={isEditing} />
            </DialogFooter>
        </form>
    );
}

function BulkUploadDialog({ isOpen, onOpenChange, onUploadComplete }: { isOpen: boolean, onOpenChange: (open: boolean) => void, onUploadComplete: () => void }) {
    const initialState: BulkUploadState = { message: '' };
    const [state, bulkAddAction] = useActionState(bulkAddRaffleItems, initialState);
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
                description: `${state.successCount} items added. ${state.errors?.length || 0} items failed.`,
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
                    obj[header as keyof RaffleItem] = values[index];
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
                    <DialogTitle>Bulk Upload Items</DialogTitle>
                    <DialogDescription>
                        Upload a CSV file with columns: `id`, `name`, `description`, `prizeType`. The prizeType must be one of 'minor', 'major', or 'grand'.
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
                        Upload {fileContent.length > 0 ? `${fileContent.length} items` : ''}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function RaffleItemsDashboard({
    items,
    onSearchChange,
    currentPage,
    totalPages,
    onPageChange,
    sortConfig,
    onSort,
    onAddNew,
    onBulkUpload,
    onEdit,
    onDelete,
} : {
    items: RaffleItem[];
    onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    sortConfig: { key: SortKey; direction: SortDirection };
    onSort: (key: SortKey) => void;
    onAddNew: () => void;
    onBulkUpload: () => void;
    onEdit: (item: RaffleItem) => void;
    onDelete: (item: RaffleItem) => void;
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
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                     <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                        placeholder="Search by ID, name, description..."
                        className="pl-10"
                        onChange={onSearchChange}
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={onBulkUpload} variant="outline">
                            <Upload className="mr-2 h-4 w-4" />
                            Bulk Upload
                        </Button>
                        <Button onClick={onAddNew}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add New Item
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <SortableHeader sortKey="id">Item ID</SortableHeader>
                                <SortableHeader sortKey="name">Item Name</SortableHeader>
                                <TableHead>Description</TableHead>
                                <SortableHeader sortKey="prizeType">Prize Type</SortableHeader>
                                <TableHead className="w-[120px] text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.length > 0 ? (
                                items.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-mono">{item.id}</TableCell>
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell className="text-muted-foreground">{item.description}</TableCell>
                                        <TableCell>
                                            <Badge variant={
                                                item.prizeType === 'grand' ? 'destructive' :
                                                item.prizeType === 'major' ? 'default' :
                                                'secondary'
                                            } className="capitalize">{item.prizeType}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => onEdit(item)}>
                                                <Edit className="h-4 w-4" />
                                                <span className="sr-only">Edit</span>
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => onDelete(item)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                                <span className="sr-only">Delete</span>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24">
                                        No raffle items found. Add one to get started!
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
    );
}


export default function RaffleItemsPage() {
    const { user, loading: userLoading } = useUser();
    const router = useRouter();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [items, setItems] = useState<RaffleItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<RaffleItem | null>(null);
    const [deleting, setDeleting] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'name', direction: 'asc' });
    const itemsPerPage = 10;

    useEffect(() => {
        if (!userLoading && !user) {
            router.push('/login');
        }
    }, [user, userLoading, router]);

    const fetchItems = async () => {
        if (user && firestore) {
            setLoading(true);
            try {
                const fetchedItems = await getRaffleItems(firestore);
                setItems(fetchedItems);
            } catch (error) {
                toast({ variant: 'destructive', title: 'Error fetching items', description: 'Please try again.' });
            } finally {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, firestore]);
    
    const handleAddNew = () => {
        setSelectedItem(null);
        setIsFormOpen(true);
    };
    
    const handleBulkUpload = () => {
        setIsBulkUploadOpen(true);
    };

    const handleEdit = (item: RaffleItem) => {
        setSelectedItem(item);
        setIsFormOpen(true);
    };
    
    const handleDelete = (item: RaffleItem) => {
        setSelectedItem(item);
        setIsDeleteConfirmOpen(true);
    };
    
    const confirmDelete = async () => {
        if (!selectedItem) return;
        setDeleting(true);
        const result = await deleteRaffleItem(selectedItem.id);
        if (result.error) {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        } else {
            toast({ title: 'Success', description: 'Item deleted successfully.' });
            fetchItems();
        }
        setDeleting(false);
        setIsDeleteConfirmOpen(false);
        setSelectedItem(null);
    };
    
    const onFormSubmitted = () => {
        setIsFormOpen(false);
        setSelectedItem(null);
        fetchItems();
    };
    
    const handleSort = (key: SortKey) => {
        setSortConfig(prevConfig => ({
            key,
            direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const sortedItems = useMemo(() => {
        let sortableItems = [...items];
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
    }, [items, sortConfig]);
    
    const filteredItems = useMemo(() => {
        if (!searchQuery) {
            return sortedItems;
        }
        return sortedItems.filter((item) => {
            const searchLower = searchQuery.toLowerCase();
            return (
                item.id.toLowerCase().includes(searchLower) ||
                item.name.toLowerCase().includes(searchLower) ||
                item.description.toLowerCase().includes(searchLower)
            );
        });
    }, [sortedItems, searchQuery]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));
    const paginatedItems = filteredItems.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    if (userLoading || loading) {
        return (
            <div className="flex justify-center items-center min-h-[calc(100vh-8rem)]">
                <Loader2 className="animate-spin h-10 w-10 text-primary" />
            </div>
        );
    }

  return (
    <>
    <main>
        <RaffleItemsDashboard 
            items={paginatedItems}
            onSearchChange={(e) => setSearchQuery(e.target.value)}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            sortConfig={sortConfig}
            onSort={handleSort}
            onAddNew={handleAddNew}
            onBulkUpload={handleBulkUpload}
            onEdit={handleEdit}
            onDelete={handleDelete}
        />
    </main>

    {/* Add/Edit Dialog */}
    <Dialog open={isFormOpen} onOpenChange={(isOpen) => { if (!isOpen) setSelectedItem(null); setIsFormOpen(isOpen);}}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{selectedItem ? 'Edit Item' : 'Add New Item'}</DialogTitle>
            </DialogHeader>
            <ItemForm item={selectedItem} onFormSubmitted={onFormSubmitted} />
        </DialogContent>
    </Dialog>
    
    {/* Bulk Upload Dialog */}
    <BulkUploadDialog isOpen={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen} onUploadComplete={fetchItems} />

    {/* Delete Confirmation Dialog */}
    <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Are you sure?</DialogTitle>
                <DialogDescription>
                    This will permanently delete the item "{selectedItem?.name}". This action cannot be undone.
                </DialogDescription>
            </DialogHeader>
            <DialogFooter>
                <Button variant="secondary" onClick={() => setIsDeleteConfirmOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
                    {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Delete
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}
