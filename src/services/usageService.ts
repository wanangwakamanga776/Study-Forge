import { doc, getDoc, updateDoc, setDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

const DAILY_LIMIT = 100; // Increased limit for generous usage

export async function checkAndIncrementUsage(userId: string): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];
  const usageDocRef = doc(db, 'userUsage', `${userId}_${today}`);
  
  const docSnap = await getDoc(usageDocRef);
  
  if (!docSnap.exists()) {
    await setDoc(usageDocRef, {
      userId,
      date: today,
      count: 1,
      createdAt: serverTimestamp()
    });
    return true;
  }
  
  const currentCount = docSnap.data().count;
  if (currentCount >= DAILY_LIMIT) {
    return false; // Limit exceeded
  }
  
  await updateDoc(usageDocRef, {
    count: increment(1)
  });
  return true;
}
