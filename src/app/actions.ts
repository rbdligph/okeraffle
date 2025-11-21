
'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { getRegistration, setRegistrationStatus as dbSetRegistrationStatus, confirmRegistration, getRegistrationStatus, addRaffleItem, updateRaffleItem as dbUpdateRaffleItem, deleteRaffleItem as dbDeleteRaffleItem, getRaffleItem, setRegistrationConfirmation as dbSetRegistrationConfirmation } from '@/lib/data';
import { initializeFirebase } from '@/firebase';
import { collection, getDocs, query, where, type Firestore, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

const registrationSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }).refine(
    (email) => email.endsWith('@cody.inc'),
    { message: 'Only emails from "@cody.inc" are allowed.' }
  ),
});

const userRegistrationSchema = z.object({
    fullName: z.string().min(2, { message: 'Full name must be at least 2 characters.' }),
    email: z.string().email({ message: 'Please enter a valid email address.' }),
});

const bulkUserRegistrationSchema = z.array(userRegistrationSchema);

const raffleItemSchema = z.object({
    id: z.string().min(1, { message: 'Item ID is required.' }),
    name: z.string().min(3, { message: 'Item name must be at least 3 characters.' }),
    description: z.string().min(3, { message: 'Description must be at least 3 characters.' }),
    prizeType: z.enum(['minor', 'major', 'grand'], { required_error: 'Prize type is required.' }),
});

const bulkRaffleItemSchema = z.array(raffleItemSchema);

export type FormState = {
  message: string;
  isEditing?: boolean;
  errors?: {
    id?: string[];
    name?: string[];
    description?: string[];
    prizeType?: string[];
    form?: string[];
    fullName?: string[];
    email?: string[];
  };
};

export type BulkUploadState = {
    message: string;
    errors?: string[];
    successCount?: number;
}

export async function createOrUpdateRaffleItem(prevState: FormState, formData: FormData): Promise<FormState> {
    const isEditing = !!formData.get('isEditing');
    
    const validatedFields = raffleItemSchema.safeParse({
        id: formData.get('id'),
        name: formData.get('name'),
        description: formData.get('description'),
        prizeType: formData.get('prizeType'),
    });

    if (!validatedFields.success) {
        return {
            message: 'Please review your entries and try again.',
            isEditing,
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    const { firestore } = initializeFirebase();
    if (!firestore) {
        return {
            message: 'Database service is not available. Please try again later.',
            isEditing,
            errors: { form: ['Database service is not available.'] }
        };
    }
    
    const itemData = validatedFields.data;

    try {
        if (!isEditing) {
            const existingItem = await getRaffleItem(firestore, itemData.id);
            if (existingItem) {
                return {
                    message: 'This Item ID is already in use.',
                    isEditing,
                    errors: { id: ['This Item ID must be unique.'] }
                };
            }
            await addRaffleItem(firestore, itemData);
        } else {
            const { id, ...updateData } = itemData;
            await dbUpdateRaffleItem(firestore, id, updateData);
        }
        revalidatePath('/admin/raffle-items');
        revalidatePath('/raffle');
        return { message: 'Item saved successfully.' };
    } catch (error: any) {
        return {
            message: 'An unexpected error occurred.',
            isEditing,
            errors: { form: [error.message] }
        };
    }
}


export async function deleteRaffleItem(itemId: string) {
    const { firestore } = initializeFirebase();
    if (!firestore) {
        throw new Error('Database service is not available.');
    }
    
    try {
        await dbDeleteRaffleItem(firestore, itemId);
        revalidatePath('/admin/raffle-items');
        revalidatePath('/raffle');
        return { message: 'Item deleted successfully.' };
    } catch (error: any) {
        return { error: error.message };
    }
}

export async function registerUser(prevState: FormState, formData: FormData): Promise<FormState> {
    const { firestore } = initializeFirebase();
    if (!firestore) {
        return {
            message: 'Database service is not available. Please try again later.',
        };
    }

    const { isOpen } = await getRegistrationStatus(firestore);
    if (!isOpen) {
        return { message: 'Sorry, registration is currently closed.' };
    }

    const validatedFields = registrationSchema.safeParse({
        email: formData.get('email'),
    });

    if (!validatedFields.success) {
        return {
            message: 'Please review your entry and try again.',
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }
  
    const { email } = validatedFields.data;
  
    const existingRegistration = await getRegistration(firestore, email);

    if (!existingRegistration) {
        return {
            message: 'This email is not registered for the event. Please contact an admin.',
            errors: { email: ['This email is not pre-registered.'] }
        };
    }

    if (existingRegistration.confirmed) {
        redirect(`/success?name=${encodeURIComponent(existingRegistration.fullName)}&existing=true`);
    }

    await confirmRegistration(firestore, email);
    revalidatePath('/admin/users');

    // In a real application, you would use a service like Resend or SendGrid here.
    console.log(`-- Confirmation Email Sent (Simulation) --
To: ${email}
Subject: Your Oke Raffle Registration is Confirmed!
Body: Hi ${existingRegistration.fullName}, thank you for registering for our event. Good luck!
------------------------------------------`);

    redirect(`/success?name=${encodeURIComponent(existingRegistration.fullName)}`);
}

export async function bulkAddRaffleItems(prevState: BulkUploadState, items: any[]): Promise<BulkUploadState> {
    const validatedFields = bulkRaffleItemSchema.safeParse(items);

    if (!validatedFields.success) {
        return {
            message: 'CSV data is invalid. Please check the format.',
            errors: validatedFields.error.issues.map(issue => `Row ${issue.path[0]}: ${issue.message}`),
        };
    }
    
    const { firestore } = initializeFirebase();
    if (!firestore) {
        return { message: 'Database service is not available.' };
    }

    const uniqueItemIds = new Set<string>();
    const duplicateRows: string[] = [];
    for (let i = 0; i < validatedFields.data.length; i++) {
        const item = validatedFields.data[i];
        if (uniqueItemIds.has(item.id)) {
            duplicateRows.push(`Row ${i+2}: Duplicate Item ID \"${item.id}\" found in CSV.`);
        }
        uniqueItemIds.add(item.id);
    }
    if (duplicateRows.length > 0) {
        return { message: "CSV contains duplicate Item IDs.", errors: duplicateRows };
    }
    
    let successCount = 0;
    const errors: string[] = [];
    
    try {
        const existingItemsQuery = query(collection(firestore, "raffleItems"), where('__name__', 'in', Array.from(uniqueItemIds)));
        const existingItemsSnapshot = await getDocs(existingItemsQuery);
        const existingItemIds = new Set(existingItemsSnapshot.docs.map(doc => doc.id));

        const batch = writeBatch(firestore);

        for (let i = 0; i < validatedFields.data.length; i++) {
            const item = validatedFields.data[i];
            if (existingItemIds.has(item.id)) {
                errors.push(`Row ${i + 2}: Item ID \"${item.id}\" already exists in the database.`);
                continue;
            }
            
            const { id, ...itemData } = item;
            const newItemRef = doc(firestore, 'raffleItems', id);
            batch.set(newItemRef, itemData);
            successCount++;
        }

        if (successCount > 0) {
            await batch.commit();
        }

        revalidatePath('/admin/raffle-items');
        revalidatePath('/raffle');
        return {
            message: `Upload complete.`,
            successCount,
            errors,
        };
    } catch (error: any) {
        return {
            message: 'An unexpected error occurred during bulk upload.',
            errors: [error.message],
        };
    }
}

export async function bulkAddUsers(prevState: BulkUploadState, users: any[]): Promise<BulkUploadState> {
    const validatedFields = bulkUserRegistrationSchema.safeParse(users);

    if (!validatedFields.success) {
        return {
            message: 'CSV data is invalid. Please check the format.',
            errors: validatedFields.error.issues.map(issue => `Row ${issue.path[0]}: ${issue.message}`),
        };
    }
    
    const { firestore } = initializeFirebase();
    if (!firestore) {
        return { message: 'Database service is not available.' };
    }

    const uniqueEmails = new Set<string>();
    const duplicateRows: string[] = [];
    for (let i = 0; i < validatedFields.data.length; i++) {
        const user = validatedFields.data[i];
        if (uniqueEmails.has(user.email)) {
            duplicateRows.push(`Row ${i+2}: Duplicate email "${user.email}" found in CSV.`);
        }
        uniqueEmails.add(user.email);
    }
    if (duplicateRows.length > 0) {
        return { message: "CSV contains duplicate emails.", errors: duplicateRows };
    }
    
    let successCount = 0;
    const errors: string[] = [];
    
    try {
        const existingUsersQuery = query(collection(firestore, "registrations"), where('email', 'in', Array.from(uniqueEmails)));
        const existingUsersSnapshot = await getDocs(existingUsersQuery);
        const existingEmails = new Set(existingUsersSnapshot.docs.map(doc => doc.data().email));

        const batch = writeBatch(firestore);

        for (let i = 0; i < validatedFields.data.length; i++) {
            const user = validatedFields.data[i];
            if (existingEmails.has(user.email)) {
                errors.push(`Row ${i + 2}: Email "${user.email}" already exists in the database.`);
                continue;
            }
            
            const newUserRef = doc(firestore, 'registrations', user.email);
            batch.set(newUserRef, {
                ...user,
                createdAt: serverTimestamp(),
                confirmed: false,
                confirmedAt: null,
            });
            successCount++;
        }

        if (successCount > 0) {
            await batch.commit();
        }

        revalidatePath('/admin/users');
        return {
            message: `Upload complete.`,
            successCount,
            errors,
        };
    } catch (error: any) {
        return {
            message: 'An unexpected error occurred during bulk upload.',
            errors: [error.message],
        };
    }
}


export async function setRegistrationStatus(isOpen: boolean): Promise<{ success: boolean; message: string }> {
    const { firestore } = initializeFirebase();
    if (!firestore) {
        return { success: false, message: 'Database service is not available.' };
    }
    try {
        await dbSetRegistrationStatus(firestore, isOpen);
        revalidatePath('/'); // Revalidate the homepage to show the change
        revalidatePath('/admin'); // Revalidate the admin page
        return { success: true, message: `Registration is now ${isOpen ? 'open' : 'closed'}.` };
    } catch (error: any) {
        return { success: false, message: error.message || 'An unexpected error occurred.' };
    }
}

export async function setManualConfirmation(email: string, confirm: boolean): Promise<{ success: boolean; message: string }> {
    const { firestore } = initializeFirebase();
    if (!firestore) {
        return { success: false, message: 'Database service is not available.' };
    }
    try {
        await dbSetRegistrationConfirmation(firestore, email, confirm);
        revalidatePath('/admin/users');
        return { success: true, message: `User confirmation status updated.` };
    } catch (error: any) {
        return { success: false, message: error.message || 'An unexpected error occurred.' };
    }
}
