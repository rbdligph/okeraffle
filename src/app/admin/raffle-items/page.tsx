
'use client';

import { useState, useEffect, useActionState, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { useUser, useFirestore } from '@/firebase';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getRaffleItems } from '@/lib/data';
import type { RaffleItem } from '@/lib/types';
import { createOrUpdateRaffleItem, deleteRaffleItem, type FormState } from '@/app/actions';
import { PlusCircle, Edit, Trash2, Loader2, Gift } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from '@/components/ui/badge';


function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="animate-spin mr-2" /> : null}
      {isEditing ? 'Update Prize' : 'Create Prize'}
    </Button>
  );
}

function RaffleItemDialog({
    isOpen,
    onOpenChange,
    itemToEdit,
}: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    itemToEdit?: RaffleItem | null;
}) {
    const formRef = useRef<HTMLFormElement>(null);
    const initialState: FormState = { message: '', isEditing: !!itemToEdit };
    const [state, formAction] = useActionState(createOrUpdateRaffleItem, initialState);
    const { toast } = useToast();

    useEffect(() => {
        if (state.message && !state.errors) {
            toast({ title: 'Success', description: state.message });
            onOpenChange(false);
        } else if (state.message && state.errors) {
            toast({ title: 'Error', description: state.message, variant: 'destructive' });
        }
    }, [state, toast, onOpenChange]);

    // Reset form when dialog is closed or itemToEdit changes
    useEffect(() => {
        if (!isOpen) {
            formRef.current?.reset();
        }
    }, [isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{itemToEdit ? 'Edit Prize' : 'Add a New Prize'}</DialogTitle>
                    <DialogDescription>
                        Fill in the details for the raffle prize. This will be visible on the main raffle page.
                    </DialogDescription>
                </DialogHeader>
                <form action={formAction} ref={formRef} className="space-y-4">
                    <input type="hidden" name="id" value={itemToEdit?.id || ''} />
                    <div className="space-y-2">
                        <Label htmlFor="name">Prize Name</Label>
                        <Input id="name" name="name" defaultValue={itemToEdit?.name} />
                        {state.errors?.name && <p className="text-destructive text-sm">{state.errors.name}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" name="description" defaultValue={itemToEdit?.description} />
                        {state.errors?.description && <p className="text-destructive text-sm">{state.errors.description}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="prizeType">Prize Type</Label>
                        <Select name="prizeType" defaultValue={itemToEdit?.prizeType}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a prize type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="minor">Minor</SelectItem>
                                <SelectItem value="major">Major</SelectItem>
                                <SelectItem value="grand">Grand</SelectItem>
                            </SelectContent>
                        </Select>
                        {state.errors?.prizeType && <p className="text-destructive text-sm">{state.errors.prizeType}</p>}
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">Cancel</Button>
                        </DialogClose>
                        <SubmitButton isEditing={!!itemToEdit} />
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function DeleteConfirmationDialog({ item, onConfirm }: { item: RaffleItem; onConfirm: () => void }) {
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon">
                    <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete the prize "{item.name}". This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onConfirm} className="bg-destructive hover:bg-destructive/90">
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export default function RaffleItemsPage() {
    const { user, loading } = useUser();
    const router = useRouter();
    const firestore = useFirestore();
    const [raffleItems, setRaffleItems] = useState<RaffleItem[]>([]);
    const [dataLoading, setDataLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [itemToEdit, setItemToEdit] = useState<RaffleItem | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    useEffect(() => {
        async function loadData() {
            if (user && firestore) {
                setDataLoading(true);
                const items = await getRaffleItems(firestore);
                setRaffleItems(items);
                setDataLoading(false);
            }
        }
        loadData();
    }, [user, firestore, isDialogOpen]); // Re-fetch when dialog closes

    const handleEdit = (item: RaffleItem) => {
        setItemToEdit(item);
        setIsDialogOpen(true);
    };

    const handleAddNew = () => {
        setItemToEdit(null);
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        const result = await deleteRaffleItem(id);
        if (result.success) {
            toast({ title: "Success", description: "Prize deleted successfully." });
            setRaffleItems(prev => prev.filter(item => item.id !== id));
        } else {
            toast({ title: "Error", description: result.message, variant: "destructive" });
        }
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
            <main>
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle>Manage Raffle Prizes</CardTitle>
                                <CardDescription>Add, edit, or delete prizes for the raffle draw.</CardDescription>
                            </div>
                            <Button onClick={handleAddNew}>
                                <PlusCircle className="mr-2" /> Add New Prize
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Prize Name</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {raffleItems.length > 0 ? (
                                        raffleItems.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell className="font-medium">{item.name}</TableCell>
                                                <TableCell>
                                                    <Badge variant={
                                                        item.prizeType === 'grand' ? 'destructive' :
                                                        item.prizeType === 'major' ? 'default' :
                                                        'secondary'
                                                    } className="capitalize">{item.prizeType}</Badge>
                                                </TableCell>
                                                <TableCell>{item.description}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <DeleteConfirmationDialog item={item} onConfirm={() => handleDelete(item.id)} />
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center">
                                                No prizes found. Add one to get started!
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </main>
            <RaffleItemDialog isOpen={isDialogOpen} onOpenChange={setIsDialogOpen} itemToEdit={itemToEdit} />
        </>
    );
}

