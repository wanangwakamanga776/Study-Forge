import { 
  signInWithPopup, 
  signOut as firebaseSignOut, 
  onAuthStateChanged, 
  User,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { useState, useEffect } from 'react';
import { auth, googleProvider } from '../lib/firebase';
import { flushPendingSync, saveProgress, getPurchases, getAllCards, saveCardsBatch } from './storageManager';

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    if (error.code === 'auth/unauthorized-domain') {
      const currentHost = window.location.hostname;
      throw new Error(`Security Lock: The domain "${currentHost}" is not authorized. PLEASE FIX: 1. Go to Firebase Console -> Authentication -> Settings -> Authorized Domains. 2. Add "${currentHost}". 3. Also add your preview link domains.`);
    }
    if (error.code === 'auth/operation-not-supported-in-this-environment') {
      throw new Error("The Forge cannot open a Gate here. Popups are restricted. Please try opening this page in a direct browser tab instead of an iframe.");
    }
    throw error;
  }
};

export const loginWithEmail = async (email: string, pass: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, pass);
    return result.user;
  } catch (error: any) {
    console.error("Email Login Error:", error);
    throw error;
  }
};

export const signUpWithEmail = async (email: string, pass: string) => {
  try {
    // 1. Capture all guest data BEFORE creating account
    const guestProgress = JSON.parse(
      localStorage.getItem('guest_progress') || 'null'
    );
    const guestPurchases = JSON.parse(
      localStorage.getItem('guest_purchases') || 'null'
    );
    const guestCards = await getAllCards();
    const guestMilestones = JSON.parse(
      localStorage.getItem('guest_milestones') || '[]'
    );

    const result = await createUserWithEmailAndPassword(auth, email, pass);
    
    // Migrate guest data to the new account
    if (guestProgress) await saveProgress(guestProgress);
    if (guestCards.length > 0) await saveCardsBatch(guestCards);

    // Clean up guest localStorage keys
    const guestKeys = Object.keys(localStorage)
      .filter(k => k.startsWith('guest_'));
    guestKeys.forEach(k => localStorage.removeItem(k));

    return result.user;
  } catch (error: any) {
    console.error("Email SignUp Error:", error);
    throw error;
  }
};

export const resetPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    console.error("Password Reset Error:", error);
    throw error;
  }
};

export const logout = async () => {
  try {
    const uid = auth.currentUser?.uid;
    // Clear this user's local cache keys
    if (uid) {
      const userKeys = Object.keys(localStorage)
        .filter(k => k.startsWith(`${uid}_`));
      userKeys.forEach(k => localStorage.removeItem(k));
      
      // Clear their IndexedDB
      indexedDB.deleteDatabase(`study_forge_${uid}`);
    }
    await firebaseSignOut(auth);
  } catch (error) {
    console.error("Logout Error:", error);
    throw error;
  }
};

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setLoading(false);
      if (user) {
        await flushPendingSync();
      }
    });
    return unsubscribe;
  }, []);

  return { user, loading };
};
