
'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { getRegistration, setRegistrationStatus as dbSetRegistrationStatus, confirmRegistration, getRegistrationStatus, addRaffleItem, updateRaffleItem, deleteRaffleItem as dbDeleteRaffleItem } from '@/lib/data';
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
    id: z.string().optional(),
    name: z.string().min(3, { message: "Prize name must be at least 3 characters." }),
    description: z.string().min(3, { message: "Description must be at least 3 characters." }),
    prizeType: z.enum(['minor', 'major', 'grand'], { required_error: "You must select a prize type." }),
});

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
    const { firestore } = initializeFirebase();
    if (!firestore) {
        return { message: "Database not available.", errors: {} };
    }

    const validatedFields = raffleItemSchema.safeParse({
        id: formData.get('id') || undefined,
        name: formData.get('name'),
        description: formData.get('description'),
        prizeType: formData.get('prizeType'),
    });
    
    if (!validatedFields.success) {
        return {
            message: 'Please review your entry and try again.',
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    const { id, ...itemData } = validatedFields.data;

    try {
        if (id) {
            await updateRaffleItem(firestore, id, itemData);
        } else {
            // Firestore will auto-generate an ID if we don't provide one.
            const newId = doc(collection(firestore, 'raffleItems')).id;
            await addRaffleItem(firestore, { id: newId, ...itemData });
        }
        revalidatePath('/admin/raffle-items');
        revalidatePath('/raffle');
        return { message: `Successfully ${id ? 'updated' : 'created'} prize.` };
    } catch (error: any) {
        return { message: `Failed to save prize: ${error.message}` };
    }
}


export async function deleteRaffleItem(id: string): Promise<{ success: boolean; message?: string }> {
    const { firestore } = initializeFirebase();
    if (!firestore) {
        return { success: false, message: "Database not available." };
    }
    
    try {
        await dbDeleteRaffleItem(firestore, id);
        revalidatePath('/admin/raffle-items');
        revalidatePath('/raffle');
        return { success: true };
    } catch (e: any) {
        return { success: false, message: e.message };
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
