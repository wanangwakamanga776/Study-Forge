import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  increment,
  serverTimestamp,
  FirestoreError,
  query,
  collection,
  orderBy,
  limit,
  getDocs
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { UserStats } from '../types';

interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: {
    userId: string;
    email: string;
    emailVerified: boolean;
    isAnonymous: boolean;
    providerInfo: any[];
  }
}

const handleFirestoreError = (error: FirestoreError, operation: FirestoreErrorInfo['operationType'], path: string) => {
  const user = auth.currentUser;
  const errorInfo: FirestoreErrorInfo = {
    error: error.message,
    operationType: operation,
    path: path,
    authInfo: {
      userId: user?.uid || 'unauthenticated',
      email: user?.email || 'N/A',
      emailVerified: user?.emailVerified || false,
      isAnonymous: user?.isAnonymous || false,
      providerInfo: user?.providerData || []
    }
  };
  
  if (error.code === 'permission-denied') {
    throw new Error(JSON.stringify(errorInfo));
  }
  throw error;
};

export const saveUserStats = async (userId: string, stats: Partial<UserStats>) => {
  const userDocRef = doc(db, 'users', userId);
  try {
    await setDoc(userDocRef, {
      ...stats,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error as FirestoreError, 'write', `users/${userId}`);
  }
};

export const incrementUserStats = async (userId: string, xpInc: number, embersInc: number) => {
  const userDocRef = doc(db, 'users', userId);
  try {
    await updateDoc(userDocRef, {
      xp: increment(xpInc),
      embers: increment(embersInc),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error as FirestoreError, 'write', `users/${userId}`);
  }
};

export const loadUserStats = async (userId: string): Promise<UserStats | null> => {
  const userDocRef = doc(db, 'users', userId);
  try {
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      return docSnap.data() as UserStats;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error as FirestoreError, 'get', `users/${userId}`);
    return null;
  }
};

export const getTopForgers = async (limitCount: number = 10): Promise<UserStats[]> => {
  try {
    const q = query(
      collection(db, 'users'),
      orderBy('xp', 'desc'),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as UserStats);
  } catch (error) {
    handleFirestoreError(error as FirestoreError, 'list', 'users');
    return [];
  }
};
