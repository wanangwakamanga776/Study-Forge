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
  if (!user) throw new Error("No apprentice logged in.");

  // 1. Validate file type
  if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type)) {
    throw new Error("Invalid material. Use PNG, JPG, or WEBP.");
  }

  // 2. Prepare Storage Reference
  const storageRef = ref(storage, `avatars/${user.uid}/${Date.now()}_${file.name}`);

  try {
    // 3. Upload to the Forge (Storage)
    const snapshot = await uploadBytes(storageRef, file);
    
    // 4. Get the URL
    const photoURL = await getDownloadURL(snapshot.ref);

    // 5. Update Firebase Auth Profile
    await updateProfile(user, { photoURL });

    return photoURL;
  } catch (error) {
    console.error("Avatar Smelting Error:", error);
    throw new Error("The Forge failed to upload your avatar.");
  }
};

/**
 * Updates the user's display name in Auth.
 */
export const updateDisplayName = async (name: string): Promise<void> => {
  const user = auth.currentUser;
  if (!user) throw new Error("No apprentice logged in.");

  try {
    await updateProfile(user, { displayName: name });
  } catch (error) {
    console.error("Name Smelting Error:", error);
    throw new Error("The Forge failed to update your name.");
  }
};
