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
  getDocFromServer,
  onSnapshot
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { UserStats, Deck } from '../types';
import { generateId } from '../lib/utils';

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
  const userDocRef = doc(db, 'users', userId, 'stats', 'main');
  try {
    await setDoc(userDocRef, {
      ...stats,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error as FirestoreError, 'write', `users/${userId}/stats/main`);
  }
};

export const incrementUserStats = async (userId: string, xpInc: number, embersInc: number) => {
  const userDocRef = doc(db, 'users', userId, 'stats', 'main');
  try {
    await updateDoc(userDocRef, {
      xp: increment(xpInc),
      embers: increment(embersInc),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error as FirestoreError, 'write', `users/${userId}/stats/main`);
  }
};

export const loadUserStats = async (userId: string): Promise<UserStats | null> => {
  const userDocRef = doc(db, 'users', userId, 'stats', 'main');
  try {
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      return docSnap.data() as UserStats;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error as FirestoreError, 'get', `users/${userId}/stats/main`);
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

export const getTotalUserCount = async (): Promise<number> => {
  try {
    const q = query(collection(db, 'users'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.size;
  } catch (error) {
    console.error("Error getting user count:", error);
    return 0;
  }
};

// Community Library Functions

export const publishDeck = async (deck: Deck) => {
  if (!auth.currentUser) return;
  const deckDocRef = doc(db, 'publicDecks', deck.id);
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
      collection(db, 'publicDecks'),
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
  const newId = generateId();
  const deckDocRef = doc(db, 'users', targetUserId, 'decks', newId);
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
    handleFirestoreError(error as FirestoreError, 'write', `users/${targetUserId}/decks/${newId}`);
    return null;
  }
};

export interface AboutMeData {
  message: string;
  images: string[];
  updatedAt?: any;
  updatedBy?: string;
}

export const getAboutMe = async (): Promise<AboutMeData | null> => {
  const docRef = doc(db, 'global', 'aboutMe');
  try {
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as AboutMeData;
    }
    return null;
  } catch (error) {
    // If not found, don't throw error just return null
    if ((error as FirestoreError).code === 'not-found') return null;
    handleFirestoreError(error as FirestoreError, 'get', 'global/aboutMe');
    return null;
  }
};

export const getGlobalAnnouncement = async (): Promise<{ message: string; active: boolean } | null> => {
  const docRef = doc(db, 'global', 'announcement');
  try {
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as { message: string; active: boolean };
    }
    return null;
  } catch (error) {
    if ((error as FirestoreError).code === 'not-found') return null;
    handleFirestoreError(error as FirestoreError, 'get', 'global/announcement');
    return null;
  }
};

export const updateGlobalAnnouncement = async (message: string, active: boolean) => {
  const docRef = doc(db, 'global', 'announcement');
  try {
    await setDoc(docRef, {
      message,
      active,
      updatedAt: serverTimestamp(),
      updatedBy: auth.currentUser?.email || 'Admin'
    });
  } catch (error) {
    handleFirestoreError(error as FirestoreError, 'write', 'global/announcement');
  }
};

export const updateAboutMe = async (data: AboutMeData) => {
  const docRef = doc(db, 'global', 'aboutMe');
  try {
    await setDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
      updatedBy: auth.currentUser?.email || 'Admin'
    });
  } catch (error) {
    handleFirestoreError(error as FirestoreError, 'write', 'global/aboutMe');
  }
};
// Private Content Sync
export const syncUserCollection = <T>(
  userId: string, 
  collectionName: 'decks' | 'quizzes' | 'tasks' | 'forgeCasts' | 'lessons' | 'sessions', 
  callback: (data: T[]) => void
) => {
  const q = query(collection(db, 'users', userId, collectionName), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as T));
    callback(items);
  }, (error) => {
    handleFirestoreError(error, 'list', `users/${userId}/${collectionName}`);
  });
};

export const saveUserItem = async (
  userId: string, 
  collectionName: 'decks' | 'quizzes' | 'tasks' | 'forgeCasts' | 'lessons' | 'sessions', 
  item: any
) => {
  const docRef = doc(db, 'users', userId, collectionName, item.id);
  try {
    await setDoc(docRef, {
      ...item,
      updatedAt: serverTimestamp(),
      createdAt: item.createdAt || Date.now()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error as FirestoreError, 'write', `users/${userId}/${collectionName}/${item.id}`);
  }
};

export const deleteUserItem = async (
  userId: string, 
  collectionName: 'decks' | 'quizzes' | 'tasks' | 'forgeCasts' | 'lessons' | 'sessions', 
  itemId: string
) => {
  const docRef = doc(db, 'users', userId, collectionName, itemId);
  try {
    // Note: We'd normally use deleteDoc but for safety and sync, sometimes we just filter locally.
    // For cloud sync, we actually want to delete from Firestore.
    const { deleteDoc } = await import('firebase/firestore');
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error as FirestoreError, 'write', `users/${userId}/${collectionName}/${itemId}`);
  }
};

export const subscribeUserStats = (userId: string, callback: (stats: Partial<UserStats> | null) => void) => {
  const docRef = doc(db, 'users', userId, 'stats', 'main');
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data() as Partial<UserStats>);
    } else {
      callback(null);
    }
  }, (error) => {
    handleFirestoreError(error, 'get', `users/${userId}/stats/main`);
  });
};

export const syncUserStats = async (userId: string, stats: Partial<UserStats>) => {
  return saveUserStats(userId, stats);
};

export const subscribeAboutMe = (callback: (data: AboutMeData | null) => void) => {
  const docRef = doc(db, 'global', 'aboutMe');
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data() as AboutMeData);
    } else {
      callback(null);
    }
  }, (error) => {
    // If not found, don't throw error
    if (error.code === 'not-found') {
      callback(null);
      return;
    }
    handleFirestoreError(error, 'get', 'global/aboutMe');
  });
};

// Announcement & Feedback Systems

export const publishAnnouncement = async (announcement: any) => {
  const docRef = doc(db, 'announcements', announcement.id);
  try {
    await setDoc(docRef, {
      ...announcement,
      updatedAt: serverTimestamp(),
      createdAt: announcement.createdAt || Date.now()
    });
  } catch (error) {
    handleFirestoreError(error as FirestoreError, 'write', `announcements/${announcement.id}`);
  }
};

export const subscribeAnnouncements = (callback: (data: any[]) => void) => {
  const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    callback(items);
  }, (error) => {
    handleFirestoreError(error, 'list', 'announcements');
  });
};

export const deleteAnnouncement = async (id: string) => {
  const docRef = doc(db, 'announcements', id);
  try {
    const { deleteDoc } = await import('firebase/firestore');
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error as FirestoreError, 'write', `announcements/${id}`);
  }
};

export const submitFeedback = async (feedback: any) => {
  const feedbackId = generateId();
  const docRef = doc(db, 'feedback', feedbackId);
  try {
    await setDoc(docRef, {
      ...feedback,
      id: feedbackId,
      createdAt: Date.now()
    });
  } catch (error) {
    handleFirestoreError(error as FirestoreError, 'write', `feedback/${feedbackId}`);
  }
};

export const subscribeFeedback = (callback: (data: any[]) => void) => {
  const q = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    callback(items);
  }, (error) => {
    handleFirestoreError(error, 'list', 'feedback');
  });
};

export const updateFeedbackStatus = async (id: string, status: 'pending' | 'resolved' | 'archived', isPinned: boolean = false) => {
  const docRef = doc(db, 'feedback', id);
  try {
    await updateDoc(docRef, { status, isPinned });
  } catch (error) {
    handleFirestoreError(error as FirestoreError, 'update', `feedback/${id}`);
  }
};
