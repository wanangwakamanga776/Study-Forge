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
  where,
  getDocs,
  getDocFromServer
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { UserStats, Deck } from '../types';

/**
 * Validates the connection to the Forge's Archives (Firestore).
 */
export const testArchivesConnection = async () => {
  try {
    // Attempt a cold-start read to verify domain and permissions
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error: any) {
    if (error.message?.includes('offline')) {
      console.warn("The Forge is currently in disconnected mode. Verify your Firebase network settings.");
    }
  }
};

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

// Community Library Functions

export const publishDeck = async (deck: Deck) => {
  if (!auth.currentUser) return;
  const deckDocRef = doc(db, 'decks', deck.id);
  try {
    await setDoc(deckDocRef, {
      ...deck,
      creatorId: auth.currentUser.uid,
      creatorName: auth.currentUser.displayName || 'Anonymous',
      isPublic: true,
      createdAt: Date.now(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error as FirestoreError, 'write', `decks/${deck.id}`);
  }
};

export const getPublicDecks = async (category?: string, searchTerm?: string): Promise<Deck[]> => {
  try {
    let q = query(
      collection(db, 'decks'),
      where('isPublic', '==', true),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    
    // Note: Firestore doesn't support complex text search without external services, 
    // so we'll fetch then filter client-side for simplicity in this demo.
    const querySnapshot = await getDocs(q);
    let decks = querySnapshot.docs.map(doc => doc.data() as Deck);
    
    if (category && category !== 'All') {
      decks = decks.filter(d => d.category === category);
    }
    
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      decks = decks.filter(d => d.title.toLowerCase().includes(s));
    }
    
    return decks;
  } catch (error) {
    handleFirestoreError(error as FirestoreError, 'list', 'decks');
    return [];
  }
};

export const cloneDeck = async (targetUserId: string, deck: Deck) => {
  const newId = crypto.randomUUID();
  const deckDocRef = doc(db, 'users', targetUserId, 'myDecks', newId);
  try {
    await setDoc(deckDocRef, {
      ...deck,
      id: newId,
      originalId: deck.id,
      creatorId: targetUserId, // User now "owns" their copy
      isPublic: false,
      createdAt: Date.now(),
      updatedAt: serverTimestamp()
    });
    return { ...deck, id: newId, originalId: deck.id, isPublic: false };
  } catch (error) {
    handleFirestoreError(error as FirestoreError, 'write', `users/${targetUserId}/myDecks/${newId}`);
    return null;
  }
};
