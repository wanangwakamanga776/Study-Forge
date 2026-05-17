import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase'; // Keep imports consistent with the existing setup

// CORE: who is the current user?
export function getCurrentUser() {
  return auth.currentUser;
}

export function isAuthenticated() {
  return auth.currentUser !== null;
}

export function getUserId() {
  return isAuthenticated() ? auth.currentUser!.uid : 'guest';
}

// LOCAL CACHE — always fast, always first
function localKey(key: string) {
  const uid = getUserId();
  return uid === 'guest' ? `guest_${key}` : `${uid}_${key}`;
}

function localGet(key: string) {
  try {
    const raw = localStorage.getItem(localKey(key));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function localSet(key: string, value: any) {
  try {
    localStorage.setItem(localKey(key), JSON.stringify(value));
  } catch (e) {
    console.warn('localStorage write failed:', e);
  }
}

// FIRESTORE HELPERS
function userDocRef(section: string) {
  const uid = getUserId();
  return doc(db, 'users', uid, 'data', section);
}

async function dbGet(section: string) {
  try {
    const snap = await getDoc(userDocRef(section));
    return snap.exists() ? snap.data() : null;
  } catch (e) {
    console.warn('Firestore read failed, using local cache:', e);
    return null;
  }
}

async function dbSet(section: string, data: any) {
  try {
    await setDoc(userDocRef(section), { 
      ...data, 
      updated_at: serverTimestamp() 
    }, { merge: true });
    return true;
  } catch (e) {
    console.warn('Firestore write failed, queuing for retry:', e);
    queueFailedWrite(section, data);
    return false;
  }
}

// FAILED WRITE QUEUE — retries on next session
function queueFailedWrite(section: string, data: any) {
  const queue = localGet('pending_sync') || [];
  queue.push({ section, data, timestamp: Date.now() });
  localSet('pending_sync', queue);
}

export async function flushPendingSync() {
  if (!isAuthenticated()) return;
  const queue = localGet('pending_sync') || [];
  if (queue.length === 0) return;

  const remaining = [];
  for (const item of queue) {
    const success = await dbSet(item.section, item.data);
    if (!success) remaining.push(item);
  }
  localSet('pending_sync', remaining);
}

// PROGRESS — Embers, streak, Forge Score
export async function getProgress() {
  const local = localGet('progress');
  if (local) {
    if (isAuthenticated()) {
      dbGet('progress').then(remote => {
        if (remote) localSet('progress', remote);
      });
    }
    return local;
  }

  if (isAuthenticated()) {
    const remote = await dbGet('progress');
    if (remote) {
      localSet('progress', remote);
      return remote;
    }
  }

  return {
    embers_balance: 0,
    lifetime_embers: 0,
    forge_score: 0,
    current_rank: 'ember',
    streak_days: 0,
    longest_streak: 0,
    last_study_date: null,
    total_study_hours: 0,
    path_tiers: { archivist: 0, duelist: 0, architect: 0, forgemaster: 0 }
  };
}

export async function saveProgress(progressData: any) {
  localSet('progress', progressData);
  if (isAuthenticated()) {
    await dbSet('progress', progressData);
  }
}

export async function updateEmbers(newBalance: number, lifetimeTotal: number) {
  const progress = await getProgress();
  progress.embers_balance = newBalance;
  progress.lifetime_embers = lifetimeTotal;
  await saveProgress(progress);
}

// SHOP PURCHASES — the most critical writes
export async function getPurchases() {
  const local = localGet('purchases');
  if (local && isAuthenticated()) {
    dbGet('purchases').then(remote => {
      if (remote) localSet('purchases', remote);
    });
    return local;
  }
  if (isAuthenticated()) {
    const remote = await dbGet('purchases');
    if (remote) { localSet('purchases', remote); return remote; }
  }
  return { 
    owned_themes: ['default_ember'],
    owned_skins: [],
    active_theme: 'default_ember',
    active_skin: null,
    owned_items: {}
  };
}

export async function recordPurchase(itemId: string, itemType: string, emberCost: number) {
  const purchases = await getPurchases();
  const progress = await getProgress();

  if (progress.embers_balance < emberCost) {
    return { success: false, reason: 'insufficient_embers' };
  }

  progress.embers_balance -= emberCost;
  
  if (itemType === 'theme') {
    if (!purchases.owned_themes.includes(itemId)) {
      purchases.owned_themes.push(itemId);
    }
  } else if (itemType === 'skin') {
    if (!purchases.owned_skins.includes(itemId)) {
      purchases.owned_skins.push(itemId);
    }
  } else {
    if (!purchases.owned_items[itemId]) {
      purchases.owned_items[itemId] = { quantity: 0, first_purchased: Date.now() };
    }
    purchases.owned_items[itemId].quantity += 1;
    purchases.owned_items[itemId].last_purchased = Date.now();
  }

  localSet('purchases', purchases);
  localSet('progress', progress);

  if (isAuthenticated()) {
    await Promise.all([
      dbSet('purchases', purchases),
      dbSet('progress', progress)
    ]);
    await setDoc(doc(db, 'users', getUserId(), 'data', `transactions_${Date.now()}`), {
      item_id: itemId,
      item_type: itemType,
      ember_cost: emberCost,
      purchased_at: serverTimestamp(),
      balance_after: progress.embers_balance
    });
  }

  return { success: true, new_balance: progress.embers_balance };
}

export async function setActiveTheme(themeId: string) {
  const purchases = await getPurchases();
  if (!purchases.owned_themes.includes(themeId)) {
    return { success: false, reason: 'not_owned' };
  }
  purchases.active_theme = themeId;
  localSet('purchases', purchases);
  if (isAuthenticated()) await dbSet('purchases', purchases);
  return { success: true };
}

export async function setActiveSkin(skinId: string | null) {
  const purchases = await getPurchases();
  if (skinId !== null && !purchases.owned_skins.includes(skinId)) {
    return { success: false, reason: 'not_owned' };
  }
  purchases.active_skin = skinId;
  localSet('purchases', purchases);
  if (isAuthenticated()) await dbSet('purchases', purchases);
  return { success: true };
}

// SRS CARDS
export async function getAllCards() {
  const localCards = await idbGetAllCards();
  if (localCards.length > 0 && isAuthenticated()) {
    dbGet('srs_cards').then(remote => {
      if (remote) idbSetAllCards(Object.values(remote));
    });
    return localCards;
  }
  if (isAuthenticated()) {
    const remote = await dbGet('srs_cards');
    if (remote) {
      const cards = Object.values(remote);
      await idbSetAllCards(cards);
      return cards;
    }
  }
  return localCards;
}

export async function saveCard(card: any) {
  await idbPutCard(card);
  if (isAuthenticated()) {
    await setDoc(
      doc(db, 'users', getUserId(), 'data', 'srs_cards'),
      { [card.card_id || card.id]: card },
      { merge: true }
    );
  }
}

export async function saveCardsBatch(cards: any[]) {
  await idbPutCards(cards);
  if (isAuthenticated()) {
    const cardMap: any = {};
    cards.forEach(c => { cardMap[c.card_id || c.id] = c; });
    await setDoc(
      doc(db, 'users', getUserId(), 'data', 'srs_cards'),
      cardMap,
      { merge: true }
    );
  }
}

// INDEXEDDB HELPERS
function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const uid = getUserId();
    const dbName = `study_forge_${uid}`;
    const req = indexedDB.open(dbName, 1);
    req.onupgradeneeded = (e: any) => {
      const idb = e.target.result;
      if (!idb.objectStoreNames.contains('cards')) {
        idb.createObjectStore('cards', { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGetAllCards(): Promise<any[]> {
  const idb = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction('cards', 'readonly');
    const req = tx.objectStore('cards').getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(tx.error);
  });
}

async function idbPutCard(card: any) {
  const c = { ...card, id: card.id || card.card_id }; // ensure keyPath 'id' exists
  const idb = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction('cards', 'readwrite');
    tx.objectStore('cards').put(c);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function idbPutCards(cards: any[]) {
  const idb = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction('cards', 'readwrite');
    const store = tx.objectStore('cards');
    cards.forEach(c => store.put({ ...c, id: c.id || c.card_id }));
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function idbSetAllCards(cards: any[]) {
  const idb = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction('cards', 'readwrite');
    const store = tx.objectStore('cards');
    store.clear();
    cards.forEach(c => store.put({ ...c, id: c.id || c.card_id }));
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

// MILESTONES + TITLES
export async function getMilestones() {
  const local = localGet('milestones') || [];
  if (isAuthenticated()) {
    const remote = await dbGet('milestones');
    if (remote?.triggered) {
      localSet('milestones', remote.triggered);
      return remote.triggered;
    }
  }
  return local;
}

export async function triggerMilestone(milestoneId: string) {
  const current = await getMilestones();
  if (current.includes(milestoneId)) return;
  const updated = [...current, milestoneId];
  localSet('milestones', updated);
  if (isAuthenticated()) {
    await dbSet('milestones', { triggered: updated });
  }
}

export async function getTitles() {
  const local = localGet('titles') || { earned: [], active: null };
  if (isAuthenticated()) {
    const remote = await dbGet('titles');
    if (remote) { localSet('titles', remote); return remote; }
  }
  return local;
}

export async function saveTitles(titlesData: any) {
  localSet('titles', titlesData);
  if (isAuthenticated()) await dbSet('titles', titlesData);
}

export async function saveGenericLocalDB(key: string, data: any) {
  localSet(`generic_${key}`, data);
  if (isAuthenticated()) {
    await dbSet(`app_${key}`, { data });
  }
}

export async function getGenericLocalDB(key: string) {
  const local = localGet(`generic_${key}`);
  if (local) {
    if (isAuthenticated()) {
      dbGet(`app_${key}`).then(remote => {
        if (remote && remote.data) localSet(`generic_${key}`, remote.data);
      });
    }
    return local;
  }
  
  if (isAuthenticated()) {
    const remote = await dbGet(`app_${key}`);
    if (remote && remote.data) {
      localSet(`generic_${key}`, remote.data);
      return remote.data;
    }
  }
  return null;
}

export async function clearGenericLocalDB(key: string) {
  try {
    localStorage.removeItem(localKey(`generic_${key}`));
  } catch (e) {
    console.warn('localStorage clear failed:', e);
  }
}
