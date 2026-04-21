import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { useState, useEffect } from 'react';
import { auth, googleProvider } from '../lib/firebase';

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
    console.error("Google Sign In Error Detailed:", {
      code: error.code,
      message: error.message,
      email: error.customData?.email,
      credential: GoogleAuthProvider.credentialFromError(error)
    });
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
    const result = await createUserWithEmailAndPassword(auth, email, pass);
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
    await signOut(auth);
  } catch (error) {
    console.error("Logout Error:", error);
    throw error;
  }
};

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { user, loading };
};
