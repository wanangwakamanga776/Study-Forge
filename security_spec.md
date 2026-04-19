# Security Specification - Study Forge Cloud Sync

## Data Invariants
1. A user document can only be accessed or modified by the authenticated user who owns it (UID match).
2. XP, Level, Embers, and Streak must always be non-negative.
3. `updatedAt` field must be a valid server timestamp.
4. Users cannot modify their own roles or privileges (not currently implemented, but protected by schema).
5. Only specific keys (`xp`, `level`, `embers`, `streak`, `lastActiveDate`, `currentTheme`, `unlockedThemes`, `updatedAt`) are allowed.

## The "Dirty Dozen" Payloads (Red Team Tests)
1. **Identity Theft:** Attempt to read another user's stats: `get /users/victimUID` as `attackerUID`. (Expected: Denied)
2. **Shadow Update:** Attempt to set `isAdmin: true` on own profile. (Expected: Denied)
3. **Ghost Field:** Attempt to add `maliciousField: "hack"` to the document. (Expected: Denied)
4. **Illegal XP:** Attempt to set `xp: -1000`. (Expected: Denied)
5. **Level Skip:** Attempt to set `level: 999` while `xp` is 0. (Expected: Denied - partially caught by app logic, but rules should restrict keys)
6. **Time Spoof:** Attempt to set `updatedAt` to a past or future date instead of server time. (Expected: Denied)
7. **Identity Poisoning:** Attempt to create a document with a 2MB string as `userId`. (Expected: Denied by ID validation)
8. **Ember Injection:** Increasing `embers` without a corresponding change in `xp` (Relational logic check).
9. **Unauthenticated Read:** Reading `/users/uid` without being logged in. (Expected: Denied)
10. **Theme Theft:** Attempting to add a theme to `unlockedThemes` without spending Embers (Rules can't fully check currency flow without high complexity, but can prevent direct tampering of keys if restricted).
11. **Massive Payload:** Writing a payload with 500 fields. (Expected: Denied by size logic)
12. **Status Locking:** Attempt to modify `updatedAt` to an older value. (Expected: Denied)

## Test Runner (Logic Mapping)
- `isValidUserStats(data)`: Enforces schema, types, and non-negative values.
- `match /users/{userId}`: `allow read, write: if request.auth.uid == userId`.
