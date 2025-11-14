import {
  collection,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  type Firestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  where
} from 'firebase/firestore';
import type { Registration, RaffleItem, Winner } from './types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

// Simulate database latency test
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));


export async function getRegistration(db: Firestore, email: string): Promise<Registration | null> {
  if (!db) return null;
  const registrationRef = doc(db, 'registrations', email);
  const docSnap = await getDoc(registrationRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      fullName: data.fullName,
      email: data.email,
      createdAt: data.createdAt.toDate(),
    };
  }
  return null;
}

export async function getRegistrations(db: Firestore): Promise<Registration[]> {
  if (!db) return [];
  await delay(100);
  const registrationsCol = collection(db, 'registrations');
  const q = query(registrationsCol, orderBy('createdAt', 'desc'));
  
  try {
    const registrationSnapshot = await getDocs(q);
    const registrationList = registrationSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
        id: doc.id,
        fullName: data.fullName,
        email: data.email,
        createdAt: data.createdAt.toDate(),
        } as Registration;
    });
    return registrationList;
  } catch (serverError: any) {
     if (serverError.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
            path: registrationsCol.path,
            operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
     }
     throw serverError;
  }
}

export function addRegistration(
  db: Firestore,
  data: Omit<Registration, 'id' | 'createdAt'>
) {
  if (!db) {
    const err = new Error('Firestore is not initialized');
    console.error(err);
    throw err;
  }

  const registrationWithTimestamp = {
    ...data,
    createdAt: serverTimestamp(),
  };

  const registrationRef = doc(db, 'registrations', data.email);
  
  setDoc(registrationRef, registrationWithTimestamp, { merge: true })
    .catch((serverError) => {
      const permissionError = new FirestorePermissionError({
        path: registrationRef.path,
        operation: 'create',
        requestResourceData: registrationWithTimestamp
      });
      errorEmitter.emit('permission-error', permissionError);
    });
}

// Raffle Items CRUD
export async function getRaffleItems(db: Firestore): Promise<RaffleItem[]> {
    if (!db) return [];
    const itemsCol = collection(db, 'raffleItems');
    const q = query(itemsCol, orderBy('name', 'asc'));

    try {
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as RaffleItem));
    } catch (serverError: any) {
        if (serverError.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: itemsCol.path,
                operation: 'list',
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        throw serverError;
    }
}

export async function getRaffleItem(db: Firestore, id: string): Promise<RaffleItem | null> {
    if (!db) return null;
    const itemRef = doc(db, 'raffleItems', id);
    const docSnap = await getDoc(itemRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as RaffleItem;
    }
    return null;
}

export async function addRaffleItem(db: Firestore, item: RaffleItem): Promise<void> {
    if (!db) throw new Error("Firestore is not initialized");
    const { id, ...itemData } = item;
    const itemRef = doc(db, 'raffleItems', id);
    try {
        await setDoc(itemRef, itemData);
    } catch (serverError) {
        const permissionError = new FirestorePermissionError({
            path: itemRef.path,
            operation: 'create',
            requestResourceData: item
        });
        errorEmitter.emit('permission-error', permissionError);
        throw serverError;
    }
}


export async function updateRaffleItem(db: Firestore, id: string, item: Partial<Omit<RaffleItem, 'id'>>): Promise<void> {
    if (!db) throw new Error("Firestore is not initialized");
    const itemRef = doc(db, 'raffleItems', id);
    try {
        await updateDoc(itemRef, item);
    } catch (serverError) {
        const permissionError = new FirestorePermissionError({
            path: itemRef.path,
            operation: 'update',
            requestResourceData: item
        });
        errorEmitter.emit('permission-error', permissionError);
        throw serverError;
    }
}

export async function deleteRaffleItem(db: Firestore, id: string): Promise<void> {
    if (!db) throw new Error("Firestore is not initialized");
    const itemRef = doc(db, 'raffleItems', id);
    try {
        await deleteDoc(itemRef);
    } catch (serverError) {
        const permissionError = new FirestorePermissionError({
            path: itemRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
        throw serverError;
    }
}

// Winners
export async function getWinners(db: Firestore): Promise<Winner[]> {
    if (!db) return [];
    const winnersCol = collection(db, 'winners');
    const q = query(winnersCol, orderBy('confirmedAt', 'desc'));

    try {
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id,
                confirmedAt: data.confirmedAt ? data.confirmedAt.toDate() : new Date(),
            } as Winner;
        });
    } catch (serverError: any) {
        if (serverError.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: winnersCol.path,
                operation: 'list',
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        throw serverError;
    }
}

type NewWinnerPayload = Omit<Winner, 'id' | 'confirmedAt'>

export async function addWinners(db: Firestore, newWinners: NewWinnerPayload[]): Promise<void> {
    if (!db) throw new Error("Firestore is not initialized");
    const batch = writeBatch(db);

    const winnersData = newWinners.map(winnerInfo => {
        const winnerId = `${winnerInfo.round}-${winnerInfo.registrationId}`;
        const winnerRef = doc(db, 'winners', winnerId);
        
        const winnerData = {
            ...winnerInfo,
            confirmedAt: serverTimestamp()
        };
        batch.set(winnerRef, winnerData);
        return winnerData;
    });

    batch.commit()
    .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
            path: 'winners',
            operation: 'create',
            requestResourceData: winnersData
        });
        errorEmitter.emit('permission-error', permissionError);
    });
}

// Global Settings
export async function getRegistrationStatus(db: Firestore): Promise<{ isOpen: boolean }> {
  if (!db) return { isOpen: true }; // Default to open if DB is not available
  const settingsRef = doc(db, 'settings', 'registration');
  const docSnap = await getDoc(settingsRef);
  if (docSnap.exists()) {
    return { isOpen: docSnap.data().isOpen };
  }
  // Default to open if the setting doesn't exist
  return { isOpen: true };
}

export async function setRegistrationStatus(db: Firestore, isOpen: boolean): Promise<void> {
    if (!db) throw new Error("Firestore is not initialized");
    const settingsRef = doc(db, 'settings', 'registration');
    try {
        await setDoc(settingsRef, { isOpen });
    } catch (serverError: any) {
        const permissionError = new FirestorePermissionError({
            path: settingsRef.path,
            operation: 'update',
            requestResourceData: { isOpen }
        });
        errorEmitter.emit('permission-error', permissionError);
        throw serverError;
    }
}
