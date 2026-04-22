import { 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import { storage, auth } from '../lib/firebase';
import { saveUserStats } from './dataService';

/**
 * Uploads a user's avatar to Firebase Storage and updates their profile.
 */
export const uploadAvatar = async (file: File): Promise<string> => {
  const user = auth.currentUser;
  if (!user) throw new Error("No user logged in.");

  // 1. Validate file type
  if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type)) {
    throw new Error("Invalid file type. Use PNG, JPG, or WEBP.");
  }

  // 2. Prepare Storage Reference
  const storageRef = ref(storage, `avatars/${user.uid}/${Date.now()}_${file.name}`);

  try {
    // 3. Upload to Storage
    const snapshot = await uploadBytes(storageRef, file);
    
    // 4. Get the URL
    const photoURL = await getDownloadURL(snapshot.ref);

    // 5. Update Firebase Auth Profile
    await updateProfile(user, { photoURL });

    // 6. Update Firestore Profile
    await saveUserStats(user.uid, { avatarUrl: photoURL });

    return photoURL;
  } catch (error) {
    console.error("Avatar Update Error:", error);
    throw new Error("Failed to upload avatar.");
  }
};

/**
 * Updates the user's display name in Auth.
 */
export const updateDisplayName = async (name: string): Promise<void> => {
  const user = auth.currentUser;
  if (!user) throw new Error("No user logged in.");

  try {
    await updateProfile(user, { displayName: name });
    await saveUserStats(user.uid, { name: name });
  } catch (error) {
    console.error("Name Update Error:", error);
    throw new Error("Failed to update name.");
  }
};
