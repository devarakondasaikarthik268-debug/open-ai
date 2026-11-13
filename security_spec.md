# Aditya AI — Security Specification & Threat Model

## 1. Data Invariants
1. **Strict RBAC Role Hierarchy**: Users are partitioned into `student`, `faculty`, and `admin`. Role checks never rely on client-mutable flags; `isAdmin()` verifies `devarakondasaikarthik268@gmail.com` (`email_verified == true`) or `/admins/{uid}`, and `isFaculty()` verifies `/faculty_members/{uid}` or `isAdmin()`.
2. **No Self-Assigned Privilege Escalation**: On `create` of `/profiles_public/{userId}`, a user may ONLY create a profile with `role == 'student'` unless `isAdmin()` or a valid `/faculty_invites` document exists for their verified email. The `role` field is immutable on update except by `isAdmin()`.
3. **PII Isolation (Split Collection)**: Sensitive PII (`email`, `rollNumber`, `facultyId`) resides exclusively in `/users_private/{userId}` and is readable ONLY by the document owner (`isOwner(userId)`) or `isAdmin()`.
4. **Chat Confidentiality**: `/chats/{chatId}` and `/chats/{chatId}/messages/{messageId}` are strictly owned by `userId == request.auth.uid`. Messages verify parent chat ownership via `get(/databases/$(database)/documents/chats/$(chatId)).data.userId == request.auth.uid`.
5. **Assignment & Submission Integrity**: Only verified Faculty or Admin may create/update/delete `/assignments`. Students may ONLY create their own submission under `/assignments/{assignmentId}/submissions/{submissionId}` where `studentId == request.auth.uid`, `status == 'submitted'`, and parent assignment exists. Once `status == 'graded'` (terminal state), a student cannot overwrite or modify their submission or grades; only Faculty/Admin may grade.
6. **Attendance & Results Isolation**: Students can only read (`get`/`list`) their own `/attendance_records` and `/results` (`resource.data.studentId == request.auth.uid`), preventing cross-student academic scraping.
7. **Temporal Integrity**: All `createdAt` and `updatedAt` timestamps MUST equal `request.time` on create/update respectively, and `createdAt` is immutable on update.
8. **ID & Payload Bounds**: Every document ID matches `^[a-zA-Z0-9_\-]+$` (max 128 chars), and every string field enforces explicit `.size()` upper bounds.

## 2. The "Dirty Dozen" Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **Role Escalation on Profile Create**: Student attempts `setDoc('/profiles_public/uid1', { ..., role: 'admin' })`.
2. **Role Mutation on Profile Update**: Student attempts `updateDoc('/profiles_public/uid1', { role: 'faculty', updatedAt: serverTimestamp() })`.
3. **PII Cross-Read**: Student A attempts `getDoc('/users_private/studentB')`.
4. **Chat Snooping**: Student A attempts `getDoc('/chats/chatOwnedByB')` or `list` `/chats` without `where('userId', '==', uidA)`.
5. **Parent-Less / Hijacked Chat Message**: Student A attempts `setDoc('/chats/chatOwnedByB/messages/m1', { userId: uidA, ... })`.
6. **Student Creating Faculty Assignment**: Student attempts `setDoc('/assignments/a1', { title: 'Fake', ... })`.
7. **Student Self-Grading Submission**: Student attempts `updateDoc('/assignments/a1/submissions/s1', { status: 'graded', marks: 100, updatedAt: serverTimestamp() })`.
8. **Post-Terminal Submission Tampering**: Student attempts to edit `submissionText` after `status == 'graded'`.
9. **Cross-Student Result Scraping**: Student A attempts `list` `/results` without `where('studentId', '==', uidA)`.
10. **Shadow Field Injection**: User attempts `setDoc('/feedback_ratings/f1', { ..., isVerified: true })` (extra ghost key).
11. **Timestamp Forgery**: User attempts `setDoc('/chats/c1', { ..., createdAt: '2020-01-01T00:00:00Z' })` instead of `request.time`.
12. **ID Poisoning / Oversized String**: User attempts write to `/chats/${'a'.repeat(300)}` or `content` > 32,000 chars.
