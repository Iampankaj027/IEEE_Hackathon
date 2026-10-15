# VeriCred Platform — Complete Functionality Documentation

**Problem Statement:** SKIT021
**Stack:** Node.js + Express · React 18 · PostgreSQL (Prisma) · HMAC-SHA256 Cryptography

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [User Roles & Access Control](#3-user-roles--access-control)
4. [Database Schema](#4-database-schema)
5. [Authentication System](#5-authentication-system)
6. [Credit Points System](#6-credit-points-system)
7. [Event Management](#7-event-management)
8. [Participation Claims & Auto-Verification](#8-participation-claims--auto-verification)
9. [Cryptographic Certificate Issuance](#9-cryptographic-certificate-issuance)
10. [Public Verification](#10-public-verification)
11. [Student Dashboard](#11-student-dashboard)
12. [Faculty Event Manager](#12-faculty-event-manager)
13. [Faculty Grading & Analytics Portal](#13-faculty-grading--analytics-portal)
14. [Admin Passcode Management Console](#14-admin-passcode-management-console)
15. [Public Pages](#15-public-pages-no-login-required)
16. [Full API Reference](#16-full-api-reference)
17. [End-to-End Workflow Flows](#17-end-to-end-workflow-flows)
18. [Key Files Map](#18-key-files-map)
19. [Environment Variables](#19-environment-variables)

---

## 1. Project Overview

VeriCred is a centralized institutional digital platform built for **SKIT021**, which defines the problem as:

> *"Educational institutions conduct numerous academic, technical, cultural, sports and extracurricular activities. Student participation records are often maintained across multiple departments, spreadsheets, certificates and individual systems, making verification and reporting difficult. Develop a centralized digital platform for collecting, verifying, managing and analyzing student participation data."*

VeriCred solves this by providing:

- **Centralized Event Registry** — all institutional activities logged in one place across departments
- **Dual-Path Claim Verification** — CSV roster auto-verification OR manual faculty approval
- **Cryptographic Certificate Issuance** — every certificate is signed with HMAC-SHA256; QR codes link to a tamper-detection endpoint
- **Auto Credit Point Calculation** — formula-based points from event scope × participation role
- **Smart Grading Engine** — maps student credit portfolios to institutional marks (SODECA, AICTE, etc.)
- **NAAC/IQAC Analytics** — certificates grouped by accreditation criteria for self-study reports
- **Public Verifiable Portfolios** — recruiters can verify credentials with zero login

---

## 2. Technology Stack

### Backend
| Package | Purpose |
|---------|---------|
| Node.js + Express.js | Web server and API framework |
| Prisma ORM | PostgreSQL schema management and type-safe queries |
| PostgreSQL (Neon.tech) | Cloud-hosted relational database |
| bcryptjs | Password hashing (10 salt rounds) |
| jsonwebtoken | JWT creation and verification (7-day expiry) |
| multer | CSV file upload handling (disk storage) |
| csv-parser | Streaming CSV parsing for event rosters |
| PDFKit | A4 landscape PDF certificate generation |
| qrcode | QR code PNG buffer / data URL generation |
| ExcelJS | Institutional Excel (.xlsx) marks sheet generation |
| dotenv | Environment variable management |

### Frontend
| Package | Purpose |
|---------|---------|
| React 18 | UI component framework |
| Vite | Build tool and dev server |
| React Router v6 | Client-side routing + protected routes |
| Axios | HTTP client with JWT interceptor and 401 handler |
| TailwindCSS | Utility-first styling (institutional enterprise aesthetic) |
| Lucide React | Icon library |

### Auth & Security
- JWT tokens stored in `localStorage` as `vericred_token`
- Tokens expire in 7 days
- HMAC-SHA256 certificate signatures use `crypto.timingSafeEqual` (prevents timing attacks)
- Faculty registration gated by database-backed passcodes (not a hardcoded secret)
- HOD_ADMIN cannot self-register — must be seeded directly in the database

---

## 3. User Roles & Access Control

Three roles exist in the system: `STUDENT`, `FACULTY`, `HOD_ADMIN`.

| Role | How Created | Registration |
|------|-------------|-------------|
| STUDENT | Self-registers on login page | No passcode needed |
| FACULTY | Self-registers on login page | Requires valid institutional passcode from HOD_ADMIN |
| HOD_ADMIN | Inserted directly into the database | Cannot self-register (blocked at API level) |

### Role Permissions

| Feature | STUDENT | FACULTY | HOD_ADMIN |
|---------|---------|---------|-----------|
| View events | Yes | Yes | Yes |
| Submit participation claim | Yes | No | No |
| View own certificates | Yes | No | No |
| View own public portfolio | Yes | No | No |
| Create institutional events | No | Yes | Yes |
| Upload CSV participant roster | No | Yes | Yes |
| Review/approve/reject claims | No | Yes | Yes |
| Access grading & analytics portal | No | Yes | Yes |
| Generate faculty registration passcodes | No | No | Yes |
| Revoke/delete passcodes | No | No | Yes |

### Middleware Implementation
- `authenticateUser` — extracts and verifies JWT, attaches full user object to `req.user`
- `authorizeRoles(...roles)` — factory middleware that returns 403 if `req.user.role` is not in the allowed list
- Combined guard pattern: `[authenticateUser, authorizeRoles('FACULTY', 'HOD_ADMIN')]`

Files:
- `backend/src/middlewares/auth.middleware.js`
- `backend/src/middlewares/role.middleware.js`

---

## 4. Database Schema

File: `backend/prisma/schema.prisma`

The schema has **8 models** and **5 enums**.

### Enums

```
Role:               STUDENT | FACULTY | HOD_ADMIN
EventCategory:      TECHNICAL | HACKATHON | SPORTS | CULTURAL | NSS_SOCIAL | WORKSHOP_SEMINAR
EventScope:         INTRA_COLLEGE | INTER_COLLEGE | STATE | NATIONAL | INTERNATIONAL
ParticipationRole:  WINNER_1ST | WINNER_2ND | WINNER_3RD | FINALIST | ORGANIZER | VOLUNTEER | PARTICIPANT
ClaimStatus:        PENDING | APPROVED_BY_CSV | APPROVED_BY_FACULTY | REJECTED
```

### Models

**User**
Core identity record for all system users.
```
id                String   (UUID, PK)
name              String
email             String   (unique)
passwordHash      String
role              Role
rollNo            String?  (unique — students only)
department        String
batchYear         Int?
currentSemester   Int?     (default 5)
section           String?  (default "A")
totalCreditPoints Int      (default 0 — incremented on each certificate issuance)
```

**Event**
An institutional activity that students can participate in.
```
id              String   (UUID, PK)
title           String
description     String?
category        EventCategory
scope           EventScope   (default INTRA_COLLEGE)
eventDate       DateTime
semesterTag     Int          (which semester this event falls under)
naacCriteriaTag String?      (e.g. "5.3.1 - Sports/Cultural", "3.2.2 - Workshops")
organizerDept   String
createdById     String       (FK → User)
```

**EventCsvRoster**
Faculty-uploaded master participant list for an event.
```
id                String            (UUID, PK)
eventId           String            (FK → Event, cascade delete)
studentRollNo     String            (normalized uppercase)
studentName       String?
participationRole ParticipationRole (default PARTICIPANT)
isClaimed         Boolean           (default false)
UNIQUE: (eventId, studentRollNo)
```

**ParticipationClaim**
A student's request to claim credit for attending an event.
```
id               String        (UUID, PK)
studentId        String        (FK → User)
eventId          String        (FK → Event, cascade delete)
claimedRole      ParticipationRole
achievementNotes String?       (team name, project title, etc.)
status           ClaimStatus   (default PENDING)
verifiedById     String?       (FK → User — faculty who reviewed)
verifiedAt       DateTime?
rejectionReason  String?
UNIQUE: (studentId, eventId) — one claim per student per event
```

**Certificate**
The cryptographically signed digital credential issued after claim approval.
```
id                String   (UUID, PK)
certificateNo     String   (unique — "VC-2026-9F4A2C")
claimId           String   (unique FK → ParticipationClaim)
studentId         String   (FK → User)
eventId           String   (FK → Event)
participationRole ParticipationRole
creditPoints      Int      (auto-calculated: role base × scope multiplier)
semester          Int
payloadString     String   (canonical pipe-delimited string that was signed)
cryptoSignature   String   (unique — 64-char HMAC-SHA256 hex)
qrVerificationUrl String   (full URL embedded in QR code)
pdfUrl            String?  (path to generated PDF file)
isRevoked         Boolean  (default false)
issuedAt          DateTime
```

**FacultyAssessment**
A faculty member's locked marks record for a student in a specific evaluation.
```
id                 String  (UUID, PK)
studentId          String  (FK → User)
facultyId          String  (FK → User)
semester           Int
evaluationTitle    String  (e.g. "SODECA / Co-Curricular Assessment")
totalCertsCount    Int     (snapshot of verified certs at time of locking)
totalCreditPoints  Int     (snapshot of credit points)
recommendedMarks   Float   (system-calculated)
finalMarksAllotted Float   (faculty override or same as recommended)
maxMarks           Float   (default 20)
remarks            String?
isLocked           Boolean (default true)
updatedAt          DateTime (auto-updated)
UNIQUE: (studentId, semester, evaluationTitle)
```

**FacultyPasscode**
A time-limited, use-limited registration passcode generated by HOD_ADMIN for onboarding faculty.
```
id          String   (UUID, PK)
code        String   (unique — "SKIT-IT-FAC-A7X9B2")
targetRole  Role     (FACULTY or HOD_ADMIN, default FACULTY)
department  String   (scoped to a specific department)
label       String?  (optional human label, e.g. "Sem 5 Faculty Onboarding")
maxUses     Int      (default 1 — single-use invite)
usedCount   Int      (default 0 — incremented atomically on use)
expiresAt   DateTime (hard expiration)
isRevoked   Boolean  (default false — manual kill-switch)
createdById String   (FK → User — the HOD_ADMIN who created it)
```

---

## 5. Authentication System

File: `backend/src/controllers/auth.controller.js`

### Register — `POST /api/auth/register`

**Body fields:** `name`, `email`, `password`, `role`, `department`, `rollNo` (student), `batchYear`, `currentSemester`, `section`, `facultyPasscode` (faculty)

**Validation chain:**

1. Role whitelist check — only `STUDENT` or `FACULTY` allowed; `HOD_ADMIN` returns 400
2. If `FACULTY` role:
   - `facultyPasscode` required (400 if missing)
   - Lookup passcode in DB (403 if not found)
   - Check `isRevoked` (403 if revoked)
   - Check `expiresAt < now` (403 if expired, shows expiry date in message)
   - Check `usedCount >= maxUses` (403 if exhausted)
   - Check `department` matches passcode scope (403 with mismatch message)
   - Check `targetRole` matches requested role (403 with mismatch message)
3. Check email uniqueness (409 if taken)
4. If `STUDENT`: check `rollNo` provided (400) and unique (409)
5. `bcrypt.hash(password, 10)`
6. `prisma.user.create(...)` with optional `consumedPasscodeId` link
7. If faculty passcode used: `prisma.facultyPasscode.update({ usedCount: { increment: 1 } })`
8. `jwt.sign({ id, email, role, rollNo }, JWT_SECRET, { expiresIn: '7d' })`
9. Returns: `{ success, token, user }` with 201

### Login — `POST /api/auth/login`

1. Find user by normalized email
2. `bcrypt.compare(password, user.passwordHash)` — 401 on mismatch
3. Generate JWT
4. Returns: `{ success, token, user }` (passwordHash excluded)

### Me — `GET /api/auth/me`

Protected by `authenticateUser` middleware. Returns `req.user` attached by the middleware.

---

## 6. Credit Points System

File: `backend/src/config/creditRules.js`

### Base Points by Participation Role

| Role | Base Points |
|------|------------|
| WINNER_1ST | 25 |
| WINNER_2ND | 20 |
| WINNER_3RD | 15 |
| FINALIST | 12 |
| ORGANIZER | 15 |
| VOLUNTEER | 8 |
| PARTICIPANT | 5 |

### Scope Multipliers

| Scope | Multiplier | Example (PARTICIPANT) |
|-------|-----------|----------------------|
| INTRA_COLLEGE | 1.0× | 5 pts |
| INTER_COLLEGE | 1.5× | 7.5 → 8 pts |
| STATE | 2.0× | 10 pts |
| NATIONAL | 2.5× | 12.5 → 13 pts |
| INTERNATIONAL | 3.0× | 15 pts |

**Formula:** `creditPoints = Math.ceil(ROLE_BASE_POINTS × SCOPE_MULTIPLIER)`

**Example:** National-level 1st Place Winner = `Math.ceil(25 × 2.5)` = **63 points**

### Grading Recommendation Formula

```
recommendedMarks = Math.min(maxMarks,
  Math.max(baseMinMarks,
    Math.ceil((totalCreditPoints / targetPoints) × maxMarks)
  )
)
```

**Example (SODECA preset):** Student with 75 credit points, maxMarks=50, targetPoints=100, baseMinMarks=10:
`Math.min(50, Math.max(10, Math.ceil((75/100) × 50)))` = `Math.min(50, Math.max(10, 38))` = **38 marks**

---

## 7. Event Management

Files:
- `backend/src/controllers/event.controller.js`
- `backend/src/routes/event.routes.js`

### `GET /api/events`
Access: All authenticated users

Supports optional query filters: `category`, `scope`, `department`, `semester`

Returns: Array of events ordered by `eventDate` descending. Each event includes creator info and participation counts.

### `GET /api/events/:id`
Access: All authenticated users

Returns: Full event with:
- All participation claims (with student names, roll numbers, claim status)
- CSV roster entries (with claimed status)
- Participant statistics

### `POST /api/events`
Access: FACULTY, HOD_ADMIN

Body: `title`, `category`, `eventDate`, `semesterTag`, `organizerDept` (required) + `description`, `naacCriteriaTag`, `scope` (optional)

Creates the event record and returns it with creator details.

### `POST /api/events/:id/upload-roster`
Access: FACULTY, HOD_ADMIN

Accepts: `multipart/form-data` with `file` field (.csv, max 5MB)

**CSV Upload Processing Flow:**

1. File saved to `/uploads/csv-rosters/roster-{timestamp}.csv` via multer
2. `parseParticipantCsv(filePath)` streams the file:
   - Extracts `rollNo` (required), `studentName`, `participationRole` using case-insensitive header matching
   - Normalizes role strings: "GOLD" / "1ST" / "FIRST" / "WINNER" → `WINNER_1ST`, "RUNNER UP" / "SILVER" → `WINNER_2ND`, "BRONZE" → `WINNER_3RD`, "COORDINATOR" / "LEAD" → `ORGANIZER`, etc.
   - Deduplicates by rollNo (last row wins)
3. For each CSV row:
   - Upsert `EventCsvRoster` record (update role if re-uploading)
   - Look up student in `User` table by rollNo
   - If student exists AND has a `PENDING` claim → auto-verify → issue certificate (counts as `pendingClaimsAutoVerified`)
   - If student exists AND no claim yet → create claim + issue certificate directly (counts as `directCertificatesIssued`)
4. Temporary CSV file deleted after processing
5. Returns: `{ totalRowsParsed, rosterSavedCount, pendingClaimsAutoVerified, directCertificatesIssued, issuedCertificates[] }`

---

## 8. Participation Claims & Auto-Verification

Files:
- `backend/src/controllers/claim.controller.js`
- `backend/src/routes/claim.routes.js`

### `POST /api/claims`
Access: STUDENT only

Body: `eventId`, `claimedRole` (optional, default PARTICIPANT), `achievementNotes` (optional)

**Auto-Verification Logic:**
1. Verify event exists
2. Check unique constraint — student cannot claim the same event twice (409 if duplicate)
3. Look up `EventCsvRoster` for `(eventId, student.rollNo)` match
4. **If found in CSV roster:**
   - Create claim with `status: APPROVED_BY_CSV`
   - Call `issueCertificateForClaim()` → certificate issued immediately
   - Return claim + certificate (student sees credential right away)
5. **If not found in CSV:**
   - Create claim with `status: PENDING`
   - Return claim with no certificate (goes to faculty review queue)

### `GET /api/claims/my-claims`
Access: STUDENT only

Returns: All claims by the authenticated student, ordered newest first. Each claim includes the linked certificate if issued.

### `GET /api/claims/pending`
Access: FACULTY, HOD_ADMIN

Optional filter: `?department=...`

Returns: All `PENDING` claims across all students (or filtered by dept). Each claim includes full student metadata (name, rollNo, department, semester) and event details. Ordered newest first.

### `PUT /api/claims/:id/review`
Access: FACULTY, HOD_ADMIN

Body: `action` ("APPROVE" or "REJECT"), `rejectionReason` (required if REJECT), `overrideRole` (optional — change participation role before issuing cert)

**APPROVE flow:**
1. Validate claim exists and is PENDING
2. Check no certificate already issued for this claim
3. Call `issueCertificateForClaim({ claimId, status: 'APPROVED_BY_FACULTY', verifiedById: req.user.id, overrideRole })`
4. Return claim + new certificate

**REJECT flow:**
1. Validate claim exists
2. `prisma.participationClaim.update({ status: 'REJECTED', rejectionReason })`
3. Return updated claim

---

## 9. Cryptographic Certificate Issuance

Files:
- `backend/src/utils/cryptoSigner.js`
- `backend/src/utils/certificateBuilder.js`
- `backend/src/utils/qrGenerator.js`
- `backend/src/utils/csvMatcher.js` (contains `issueCertificateForClaim`)

### Certificate Number Format
`VC-{YEAR}-{6_CHAR_HEX}` — e.g. `VC-2026-9F4A2C`

Generated using `crypto.randomBytes(3).toString('hex').toUpperCase()`.

### Canonical Payload Construction
```
payloadString = `${CERT_NO}|${ROLL_NO}|${EVENT_ID}|${ROLE}|${ISSUED_AT_ISO}`
```
All fields normalized: uppercase + trimmed. Even a 1-character difference completely changes the resulting hash.

### HMAC-SHA256 Signature
```
cryptoSignature = HMAC-SHA256(payloadString, CRYPTO_HMAC_SECRET)
```
Returns a 64-character lowercase hexadecimal string. `CRYPTO_HMAC_SECRET` must be ≥32 characters.

### QR Code Verification URL
```
https://{FRONTEND_URL}/verify/{certNo}?sig={cryptoSignature}
```
The QR code embeds the full URL. When scanned, the browser navigates to the public verification page which re-validates the signature.

### Tamper Detection
`verifyCertificateSignature(payloadString, providedSignature)`:
- Recomputes expected signature from stored `payloadString`
- Uses `crypto.timingSafeEqual()` for constant-time comparison (prevents timing-based attacks)
- Returns `false` if lengths differ or bytes don't match

### PDF Certificate Generation (A4 Landscape)
Dimensions: 841.89 × 595.28 points (PDFKit)

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  [Navy 3pt outer border + Gold 1pt rule + Slate hairline]   │
│                                                             │
│  CERT ID: VC-2026-9F4A2C          +63 PTS · SEM 5          │ ← Metadata bar
│  ─────────────────────────────────────────────────         │
│        SWAMI KESHVANAND INSTITUTE OF TECHNOLOGY             │ ← Institution header
│    CENTRALIZED DIRECTORATE OF STUDENT AFFAIRS & IQAC        │
│  ─────────────────────────────────────────────────         │
│        CERTIFICATE OF EXCELLENCE & MERIT                   │ ← Title (winner)
│        (or: CERTIFICATE OF VERIFIED PARTICIPATION)          │
│                                                             │
│                  STUDENT FULL NAME                          │ ← Large name
│              Roll No | Department                           │
│                                                             │
│  This is to certify that the above-named student...         │ ← Citation body
│  [role], [event name], [scope], [category], [date]          │
│                                                             │
│  [Authority sig block] [HMAC-SHA256 ledger] [QR code]       │ ← Footer (3 cols)
│  [64-char hex shown in full]              [96×96pt QR]       │
└─────────────────────────────────────────────────────────────┘
```

The PDF is saved to `/uploads/certificates/{certificateNo}.pdf` and served as a static file.

### Atomic Certificate Issuance Transaction
`issueCertificateForClaim()` wraps everything in a Prisma transaction:
1. Calculate `creditPoints = ROLE_BASE × SCOPE_MULTIPLIER` (ceil)
2. `generateCertificateNo()` → unique cert ID
3. `createSignedCertificateBundle()` → payloadString + cryptoSignature + qrVerificationUrl
4. `buildCertificatePdf()` → generates QR PNG buffer → embeds in A4 PDF → saves to disk
5. **Transaction:**
   - `participationClaim.update({ status, verifiedById, verifiedAt })`
   - `certificate.create({ certificateNo, payloadString, cryptoSignature, qrVerificationUrl, pdfUrl, creditPoints, ... })`
   - `user.update({ totalCreditPoints: { increment: creditPoints } })`
   - `eventCsvRoster.updateMany({ isClaimed: true })` (if applicable)

---

## 10. Public Verification

Files:
- `backend/src/controllers/publicVerify.controller.js`
- `backend/src/routes/publicVerify.routes.js`
- `frontend/src/pages/PublicVerifyPage.jsx`

### `GET /api/verify/:certificateNo`
Access: **Public — no authentication required**

Optional query param: `?sig={64_char_hex_signature}`

**Verification Tiers:**

| Tier | Condition | Result |
|------|-----------|--------|
| Registry | Certificate found + not revoked | `REGISTRY_VERIFIED` |
| Cryptographic | Signature provided + matches HMAC recomputation | `CRYPTOGRAPHICALLY_VERIFIED` |
| Tamper detected | Signature provided + does NOT match | `CRYPTOGRAPHIC_TAMPER_DETECTED` |
| Not found | Certificate number doesn't exist | 404 error |
| Revoked | Certificate marked `isRevoked: true` | Revocation notice |

Returns: `verificationDetails` with student info, event info, certificate metadata, credit points, issue date.

### Public Portfolio — `GET /api/certificates/portfolio/:rollNo`
Access: **Public — no authentication required**

Returns: Student profile (name, department, batch, semester, total credit points) + all active (non-revoked) certificates with full event details, cryptographic signatures, and credit breakdowns.

---

## 11. Student Dashboard

File: `frontend/src/pages/StudentDashboard.jsx`
Route: `/student/dashboard` (STUDENT only)

### KPI Strip (4 cards)
- **Verified Certificates** — count of issued, non-revoked certificates
- **Total Credit Score** — sum of credit points from all certificates
- **Estimated Co-Curricular Marks** — formula preview (credit pts / 60 × 20, clamped)
- **Pending Claims** — count of claims with PENDING status

### Claim Event Participation (left sidebar)
1. **Event dropdown** — shows only events the student hasn't claimed yet
2. **Role selector** — PARTICIPANT / VOLUNTEER / ORGANIZER / FINALIST / WINNER_3RD / WINNER_2ND / WINNER_1ST
3. **Achievement Notes** (optional) — free text (team name, project title, award details)
4. **Submit** → calls `POST /api/claims`
   - If auto-verified via CSV: certificate card appears immediately
   - If PENDING: status chip shows in Claims tab

### Certificates Tab
Shows all issued certificates. Each card has:
- Certificate ID, event name, category, scope, role, credit points
- **Download PDF** — opens PDF in new tab (`/uploads/certificates/{certNo}.pdf`)
- **Inspect QR** — opens `LiveCertificatePreview` modal (full A4 certificate view with QR)
- **Share on LinkedIn** — opens `LinkedInShareModal`

### Claims Status Tab
Table of all claims (all statuses). Status badge color coding:
- `PENDING` — amber/yellow
- `APPROVED_BY_CSV` — green (auto-verified)
- `APPROVED_BY_FACULTY` — green (manually approved)
- `REJECTED` — red (shows rejection reason)

### Public Portfolio URL
Displays `{FRONTEND_URL}/u/{rollNo}` with a copy-to-clipboard button. Students share this link with recruiters for credential verification.

### LinkedIn Share Modal (`LinkedInShareModal.jsx`)
Pre-fills the official LinkedIn "Add Certification" form:
- Certification Name: `[Event Title] — [Participation Role]`
- Issuing Organization: Institution name
- Issue year and month
- Credential ID: Certificate number (e.g. `VC-2026-9F4A2C`)
- Credential URL: Full public verification URL

Also provides:
- 1-click share to LinkedIn feed (pre-written caption)
- 1-click share to X / Twitter
- 1-click share to WhatsApp
- Copyable verification link and editable caption text

---

## 12. Faculty Event Manager

File: `frontend/src/pages/FacultyEventManager.jsx`
Route: `/faculty/events` (FACULTY + HOD_ADMIN)

### Create Event (left sidebar form)
Fields:
- **Title** (required)
- **Category** — TECHNICAL / HACKATHON / SPORTS / CULTURAL / NSS_SOCIAL / WORKSHOP_SEMINAR
- **Scope** — INTRA_COLLEGE / INTER_COLLEGE / STATE / NATIONAL / INTERNATIONAL
- **Event Date** (date picker)
- **Semester Tag** — which semester this event counts toward (1–8)
- **Organizer Department**
- **NAAC Criteria Tag** (optional) — free text like `"5.3.1 - Sports/Cultural"` or `"3.2.2 - Workshops/Hackathons"`
- **Description** (optional)

Submits to `POST /api/events`. On success, event list refreshes.

### Tab 1: Claim Approval Queue
Fetches `GET /api/claims/pending`.

Table columns: Student Roll No | Student Name | Dept | Event | Claimed Role | Submitted Date | Override Role dropdown | Approve button | Reject button

- **Override Role** dropdown lets faculty change the role before approving (e.g. student claimed PARTICIPANT but actually placed 2nd — change to WINNER_2ND before clicking Approve)
- **Approve** → `PUT /api/claims/:id/review { action: 'APPROVE', overrideRole }` → certificate issued
- **Reject** → modal prompts for rejection reason → `PUT /api/claims/:id/review { action: 'REJECT', rejectionReason }`

### Tab 2: Upload CSV Roster
1. Select event from dropdown
2. Download sample CSV template (shows expected columns: Roll Number, Student Name, Participation Role)
3. Choose `.csv` file (max 5MB)
4. Upload → `POST /api/events/:id/upload-roster`
5. Result banner shows: rows parsed, roster saved, claims auto-verified, direct certs issued

### Tab 3: All Events & Rosters
Table of all institutional events. Each row shows: title, category, scope, date, semester, organizer dept, claim count.

**Inspect button** → opens modal with:
- Event metadata
- Claims table (all statuses, with student details)
- CSV Roster table (all uploaded participants, with claimed status)
- Certificate links for approved claims

---

## 13. Faculty Grading & Analytics Portal

File: `frontend/src/pages/FacultyMarksPortal.jsx`
Route: `/faculty/grading` (FACULTY + HOD_ADMIN)

### Assessment Presets
One-click configuration of the grading parameters:

| Preset | Evaluation Title | Max Marks | Target Points | Min Marks |
|--------|-----------------|-----------|--------------|-----------|
| SODECA / Co-Curricular | SODECA / Co-Curricular Assessment | 50 | 100 | 10 |
| Internal Activity Sessional | Internal Activity Sessional | 20 | 60 | 0 |
| AICTE 100-Point Mandate | AICTE 100-Point Mandate Assessment | 100 | 100 | 0 |

Selecting a preset auto-fills all grading parameters and updates the recommendation formula.

### Multi-Filter Control Deck
- **Department** — "All Departments" (institution-wide) or any specific department
- **Semester** — "All Semesters (Cumulative)" or Semester 1–8
- **Section** — "All Sections" or A / B / C / D
- **Activity Domain Filter** — filter table to students who have activity in a specific category

After setting filters, click **Load Class Matrix** → calls `GET /api/faculty/grading/matrix`.

### Analytics Dashboard Panel (collapsible)

**4 Executive KPI Cards:**

1. **Participation Coverage Rate** — `X%` of students with ≥1 verified certificate, with active vs at-risk breakdown and a progress bar
2. **Verified Activity Volume** — total certificates issued + total institutional credit points pool + average per student
3. **Credit Score Distribution** — class average points, top scorer, target achievers percentage (`X% of Y students met the target threshold`)
4. **Assessment Lock Status** — `X of Y students graded & locked` with a visual completion progress bar

**Category Distribution Bar:**
Stacked horizontal bar showing proportions of all 6 activity pillars (Technical, Hackathon, Sports, Cultural, NSS/Social, Workshops). Each segment is clickable — clicking filters the grading table to that domain only.

**Scope & Level Breakdown:**
Horizontal progress bars for each scope level (INTERNATIONAL → NATIONAL → STATE → INTER_COLLEGE → INTRA_COLLEGE), showing count and percentage. Used for NIRF/NBA accreditation scoring context.

**Top 3 Performers Leaderboard:**
Gold (#1) / Silver (#2) / Bronze (#3) ranked cards showing name, roll number, credit points, certificate count, and a 360° view button.

**At-Risk Student Alert Strip:**
Shows count of zero-activity students with a "Filter At-Risk Students" button that sets the cohort filter to ZERO and scrolls to the table.

### NAAC / IQAC Criteria Summary Matrix (collapsible)
Groups all verified student certificates by their event's `naacCriteriaTag`. Shows a table with:
- Criterion tag (e.g. "5.3.1 - Sports/Cultural")
- Verified record count
- Percentage of total certificates
- Coverage progress bar

Certificates with no `naacCriteriaTag` set appear as "Uncategorized / Not Mapped". Empty state shown when no events have been tagged.

Intended for use by IQAC coordinators filling Annual Quality Assurance Reports (AQAR).

### Quick Cohort Filter Pills
Six clickable filter pills above the grading table:

| Pill | Students Shown |
|------|---------------|
| All Students (N) | Everyone in the filtered cohort |
| Active ≥1 Cert (N) | Students with at least one verified certificate |
| At-Risk / Zero (N) | Students with zero verified certificates |
| Met Target (N) | Students whose credit points ≥ targetPoints setting |
| Pending Lock (N) | Students whose assessment is not yet locked |
| Locked (N) | Students whose assessment is already locked |

### Bulk Action Toolbar
- **Sync All to Formula** — overwrites all local mark inputs with formula-computed recommended marks (does not save to server)
- **Lock All Filtered (N)** — calls `POST /api/faculty/grading/bulk-save` for all currently displayed rows
- **Instant Filtered CSV** — client-side CSV download of the current table view (no server call)
- **Institutional Excel (.xlsx)** — authenticated fetch to `GET /api/faculty/grading/export-excel`; triggers .xlsx download

### High-Density Sortable Grading Table

Sortable columns (click header to sort ascending/descending): Roll No, Name, Verified Certs, Credit Points, Final Marks

**Per-row data:**
- Roll No + department abbreviation badge (e.g. `IT`) + semester badge (`S5`) + section badge (`A`) + `★ TOP` badge (if met target)
- Student name + email
- Verified certificate count (red if zero)
- Activity breakdown pills — e.g. `Technical:2`, `Hackathon:1`, `NSS/Social:1`
- Total credit points (green if >0)
- Recommended marks badge (formula output)
- **Final marks field:**
  - Unlocked: number input (min=baseMinMarks, max=maxMarks, step=0.5) + `↺Rec` button (reset to recommended)
  - Locked: displays `X.X/maxMarks` with lock icon
- **Remarks field:**
  - Unlocked: text input
  - Locked: plain text display
- **Actions:**
  - Unlocked: `Lock` button → calls `POST /api/faculty/grading/save` → assessment saved and locked
  - Locked: `Unlock` button → allows re-editing (does not call API until re-locked)
  - `360°` button → opens `Student360Drawer`

### Student360Drawer Component
Slide-over drawer from right side showing full 360° activity record for a selected student.

Header: student name, roll number, department, batch year, semester, section

KPI strip: verified cert count, total credit points, semester toggle (current semester only vs all semesters)

Certificate list: Each certificate card shows:
- Certificate ID (e.g. `VC-2026-9F4A2C`)
- Credit points, participation role
- Event title, category, scope
- Semester, NAAC criteria tag (if set)
- Full HMAC-SHA256 cryptographic signature
- **Inspect Proof** button → opens nested `LiveCertificatePreview` modal
- **PDF** download link

Footer: Link to public portfolio + Close button

### Excel Export (.xlsx) — File Format
Generated by `backend/src/utils/excelExporter.js` using ExcelJS.

**12 columns (A–L):** S.No | Roll Number | Student Full Name | Department | Semester | Section | Total Verified Certs | Category Breakdown | Credit Points | Recommended Marks | Final Locked Marks | Faculty Remarks

**Sheet structure:**
- Row 1: Merged institution header (navy background, white 14pt bold)
- Row 2: Merged sub-header (dept · semester · evaluation title · generation date)
- Row 3: Blank separator
- Row 4: Column headers (dark background, white text, frozen — stays visible when scrolling)
- Rows 5+: Student data with alternating zebra row shading
- Summary row: Class totals and averages

Zero-activity students have their cert count cell highlighted in red bold.

Filename: `VeriCred_Assessment_{dept}_Sem{sem}_{ISO_timestamp}.xlsx`

---

## 14. Admin Passcode Management Console

File: `frontend/src/pages/AdminDashboard.jsx`
Route: `/admin/dashboard` (HOD_ADMIN only)

### Stats Dashboard (top row)
Six cards: Total Issued | Active | Consumed (fully used) | Exhausted | Expired | Revoked

Fetched from `GET /api/admin/passcodes/stats`.

### Generate New Passcode(s)
Collapsible form with fields:
- **Department** — scopes the passcode to one department
- **Target Role** — FACULTY or HOD_ADMIN
- **Label** (optional) — human-readable note (e.g. "Sem 5 Faculty Onboarding Batch")
- **Max Uses** — how many times this code can be used (default 1 for single-use invite)
- **Expires In (hours)** — default 168 (7 days)
- **Batch Count** — generate multiple codes at once (up to 50)

Calls `POST /api/admin/passcodes`. Generated codes are displayed in the table immediately.

**Generated Code Format:** `SKIT-{DEPT_ABBR}-FAC-{RANDOM_HEX6}` (e.g. `SKIT-IT-FAC-A7X9B2`)

### Passcode Registry Table
Columns:
- **Code** — masked by default (shows `SKIT-IT-FAC-••••••`) with Reveal/Hide toggle + Copy button
- **Status badge** — ACTIVE (green) / EXPIRED (red) / REVOKED (slate) / EXHAUSTED (amber)
- **Role** — FACULTY or HOD_ADMIN
- **Department** — scope of the passcode
- **Usage** — progress bar (`usedCount / maxUses`) with numbers
- **Expiry** — relative countdown ("Expires in 5d 3h" or "Expired X days ago")
- **Consumers** — list of faculty who registered using this code
- **Revoke** button — disables the passcode (irreversible without deletion)
- **Delete** button — only shown if `usedCount === 0` (never used)

### Filters
- Status filter: All / Active / Expired / Revoked / Exhausted
- Department filter: dropdown of all known departments

### Department Breakdown Cards
Below the main table: per-department summary cards showing total generated, currently active, and consumed passcode counts.

### Backend Passcode API (`backend/src/controllers/admin.controller.js`)

**`POST /api/admin/passcodes`** — Generate batch
- Validates department, targetRole (FACULTY/HOD_ADMIN), maxUses (1–100), expiresInHours (1–8760)
- Generates unique codes using `crypto.randomBytes(3).toString('hex').toUpperCase()`
- Sets `expiresAt = now + expiresInHours`
- Returns array of created passcode objects

**`GET /api/admin/passcodes`** — List (creator's own codes only)
- Filters: `?status=ACTIVE|EXPIRED|REVOKED|EXHAUSTED`, `?department=...`
- Includes list of users who consumed each code

**`GET /api/admin/passcodes/stats`** — Aggregate stats
- Returns: `{ total, active, expired, revoked, exhausted, departmentBreakdown[] }`

**`PATCH /api/admin/passcodes/:id/revoke`** — Revoke
- Only the creator can revoke
- Sets `isRevoked = true`

**`DELETE /api/admin/passcodes/:id`** — Delete
- Only the creator can delete
- Only allowed if `usedCount === 0` (prevents orphaning consumed records)

---

## 15. Public Pages (No Login Required)

### `/verify/:certificateNo` — PublicVerifyPage
File: `frontend/src/pages/PublicVerifyPage.jsx`

This page is the destination of every QR code scan.

**Authentic credential flow:**
- Green banner: "Cryptographically Verified" with checkmark
- Student info: name, roll number, department
- Event info: title, category, scope, organizer department
- Certificate metadata: cert ID, participation role, credit points awarded, semester, issue date
- Embedded `LiveCertificatePreview` component (full A4 certificate visible inline)
- "View Full Portfolio" link to `/u/{rollNo}`

**Invalid / tampered credential flow:**
- Red banner: "CRYPTOGRAPHIC TAMPER DETECTED — This credential may have been forged or modified"
- Manual certificate verification form (enter certificate number + signature manually)

**Manual verify form** (also shown on page load without `sig` param):
- Certificate number input
- Signature input
- Submit → re-runs verification

### `/u/:rollNo` — PublicStudentPortfolio
File: `frontend/src/pages/PublicStudentPortfolio.jsx`

Recruiter-facing portfolio page. No login required.

**Student header card:**
- Full name, roll number, department
- Batch year, current semester
- Total credit points (displayed prominently)

**Certificate grid:**
Each certificate card shows:
- Certificate number (e.g. VC-2026-9F4A2C)
- Credit points awarded
- Participation role (e.g. "1st Place Winner")
- Event name, category badge, scope badge
- Semester earned in
- NAAC criteria tag (if set on the event)
- Full HMAC-SHA256 signature (truncated with "Copy" button)
- **Inspect Certificate** button → opens `LiveCertificatePreview` modal
- **Verify Hash** button → navigates to `/verify/{certNo}?sig={signature}` in new tab

---

## 16. Full API Reference

### Authentication

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/auth/register` | Public | Register as STUDENT or FACULTY |
| POST | `/api/auth/login` | Public | Login, receive JWT token |
| GET | `/api/auth/me` | Private | Get current authenticated user |

### Events

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/events` | Private | List all events (query: category, scope, department, semester) |
| GET | `/api/events/:id` | Private | Get event detail with claims and CSV roster |
| POST | `/api/events` | FACULTY/HOD_ADMIN | Create a new institutional event |
| POST | `/api/events/:id/upload-roster` | FACULTY/HOD_ADMIN | Upload master CSV participant roster |

### Participation Claims

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/claims` | STUDENT | Submit new participation claim |
| GET | `/api/claims/my-claims` | STUDENT | List all own claims + linked certificates |
| GET | `/api/claims/pending` | FACULTY/HOD_ADMIN | List all pending claims (query: department) |
| PUT | `/api/claims/:id/review` | FACULTY/HOD_ADMIN | Approve or reject a claim |

### Certificates

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/certificates/my-certificates` | STUDENT | List all own active certificates |
| GET | `/api/certificates/:id/linkedin-share` | STUDENT | Get LinkedIn certification add URL |
| GET | `/api/certificates/portfolio/:rollNo` | Public | Get student public credential portfolio |

### Public Verification

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/verify/:certificateNo` | Public | Cryptographic certificate verification (query: sig) |

### Faculty Grading

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/faculty/grading/matrix` | FACULTY/HOD_ADMIN | Class grading matrix + full analytics (query: department, semester, section, maxMarks, targetPoints, baseMinMarks) |
| GET | `/api/faculty/grading/student/:studentId` | FACULTY/HOD_ADMIN | 360° student activity record (query: semester) |
| POST | `/api/faculty/grading/save` | FACULTY/HOD_ADMIN | Save and lock a single student assessment |
| POST | `/api/faculty/grading/bulk-save` | FACULTY/HOD_ADMIN | Bulk save and lock multiple assessments |
| GET | `/api/faculty/grading/export-excel` | FACULTY/HOD_ADMIN | Download .xlsx institutional marks sheet |

### Admin — Passcode Management

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/admin/passcodes` | HOD_ADMIN | Generate one or more passcodes |
| GET | `/api/admin/passcodes` | HOD_ADMIN | List passcodes (query: status, department) |
| GET | `/api/admin/passcodes/stats` | HOD_ADMIN | Aggregate passcode usage statistics |
| PATCH | `/api/admin/passcodes/:id/revoke` | HOD_ADMIN | Revoke an active passcode |
| DELETE | `/api/admin/passcodes/:id` | HOD_ADMIN | Delete an unused passcode |

---

## 17. End-to-End Workflow Flows

### Flow 1: Student Claims Participation & Gets Certificate

```
Student logs in
    → /student/dashboard
    → Clicks "Claim Participation" sidebar
    → Selects event from dropdown (only unclaimed events shown)
    → Selects role + optional achievement notes
    → Clicks Submit
    → POST /api/claims
        → System checks EventCsvRoster for (eventId, rollNo) match
        → MATCH FOUND:
            → claim.status = APPROVED_BY_CSV
            → issueCertificateForClaim() runs atomically:
                → creditPoints = role_base × scope_multiplier
                → certificateNo = VC-YYYY-XXXXXX
                → payloadString built, HMAC-SHA256 signature computed
                → QR code generated (PNG buffer)
                → A4 PDF built with embedded QR
                → certificate saved to DB
                → student.totalCreditPoints += creditPoints
            → Certificate appears immediately in UI
            → Student can download PDF, inspect QR, share to LinkedIn
        → NO MATCH:
            → claim.status = PENDING
            → PENDING badge shown in Claims tab
            → Goes to Faculty review queue
```

### Flow 2: Faculty Uploads CSV & Bulk-Verifies Students

```
Faculty logs in
    → /faculty/events
    → Creates event (title, category, scope, date, semester, NAAC tag)
    → Switches to "Upload CSV Roster" tab
    → Selects the event
    → Downloads sample CSV template
    → Uploads filled CSV file (Roll No, Student Name, Participation Role)
    → POST /api/events/:id/upload-roster (multipart)
    → Backend:
        → Parses CSV, normalizes role strings
        → Upserts EventCsvRoster rows
        → For each student found in User DB:
            → Has PENDING claim? → auto-verify → issue certificate
            → No claim yet? → create claim → issue certificate directly
    → Success banner: "45 parsed, 45 roster saved, 12 claims auto-verified, 33 direct certs issued"
    → Remaining unclaimed students can still submit claims which auto-verify
```

### Flow 3: Faculty Manual Claim Review

```
Faculty logs in
    → /faculty/events → "Claim Approval Queue" tab
    → Sees list of PENDING claims from students
    → Optional: change "Override Role" dropdown per row
      (e.g. student claimed PARTICIPANT but won 2nd place → switch to WINNER_2ND)
    → Clicks "Approve"
    → PUT /api/claims/:id/review { action: 'APPROVE', overrideRole }
    → Certificate issued with selected role + credit points
    → Row disappears from pending queue
    → OR: Clicks "Reject" → enters rejection reason → POST rejection
    → Student's claim shows REJECTED status with reason
```

### Flow 4: Faculty Grades Students (Marks Portal)

```
Faculty logs in
    → /faculty/grading
    → Clicks "SODECA / Co-Curricular" preset button
      (auto-sets: maxMarks=50, targetPoints=100, baseMinMarks=10)
    → Selects Department + Semester + Section filters
    → Clicks "Load Class Matrix"
    → GET /api/faculty/grading/matrix → returns all students + analytics
    → Analytics panel shows:
      - 76% participation coverage
      - 142 total verified certs
      - Top 3 performers leaderboard
      - 5 at-risk zero-activity students (click to filter)
    → Reviews NAAC criteria matrix (how many certs map to each accreditation criterion)
    → Clicks "Sync All to Formula" → all mark inputs auto-fill with recommended values
    → Reviews each student row, adjusts marks if needed
    → Clicks "Lock" per row, or "Lock All Filtered (45)" for bulk save
    → POST /api/faculty/grading/bulk-save
    → All assessments locked in DB
    → Clicks "Institutional Excel (.xlsx)" → downloads formatted marks sheet
```

### Flow 5: HOD_ADMIN Onboards New Faculty

```
HOD_ADMIN logged in (credentials seeded directly in DB, no self-registration)
    → /admin/dashboard
    → Clicks "Generate New Faculty Registration Passcode"
    → Fills form:
        department = "Information Technology"
        targetRole = FACULTY
        maxUses = 5
        expiresInHours = 168 (7 days)
        batchCount = 1
    → POST /api/admin/passcodes
    → Code generated: "SKIT-IT-FAC-C3A901"
    → Admin copies code (reveal + copy button in table)
    → Shares code with 5 IT faculty members via email/WhatsApp
    → Each faculty uses code during self-registration on login page
    → usedCount increments per use (0 → 1 → 2 → ... → 5)
    → At usedCount = 5 (= maxUses), code shows EXHAUSTED badge
    → Code can be revoked early if needed
```

### Flow 6: Recruiter Verifies a Student Credential

```
Recruiter receives student's certificate (PDF or digital)
    → Scans QR code on certificate
    → Browser navigates to:
      https://vericred.skit.ac.in/verify/VC-2026-9F4A2C?sig=a3f7e9...b2d1
    → GET /api/verify/VC-2026-9F4A2C?sig=a3f7e9...b2d1
    → Backend:
        1. Finds certificate by certificateNo in DB
        2. Checks not revoked
        3. Recomputes HMAC-SHA256 from stored payloadString
        4. constant-time comparison with provided sig
        5. Match → CRYPTOGRAPHICALLY_VERIFIED
    → PublicVerifyPage shows:
        Green banner: "Cryptographically Verified & Tamper-Proof"
        Student: Rahul Sharma | 23ESKIT045 | Information Technology
        Event: National Level Hackathon — Smart India Hackathon 2025
        Role: WINNER_1ST | Credit Points: +63 | Semester 5
        Issue Date: 2025-11-14
        [Full certificate visible inline]
    → Recruiter clicks "View Full Portfolio" → /u/23ESKIT045
    → Sees all of student's verified credentials with HMAC signatures
```

---

## 18. Key Files Map

```
vericred-platform/
│
├── backend/
│   ├── prisma/
│   │   └── schema.prisma              ← All 8 DB models, 5 enums, relations
│   │
│   ├── src/
│   │   ├── server.js                  ← Express entry point, route mounting, static file serving, CORS
│   │   │
│   │   ├── config/
│   │   │   ├── db.js                  ← Prisma singleton client
│   │   │   └── creditRules.js         ← Role base points, scope multipliers, grading formula
│   │   │
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.js     ← JWT verify → req.user attachment (401 on failure)
│   │   │   ├── role.middleware.js     ← authorizeRoles() factory (403 on role mismatch)
│   │   │   └── upload.middleware.js   ← multer config (CSV only, 5MB max, disk storage)
│   │   │
│   │   ├── utils/
│   │   │   ├── cryptoSigner.js        ← Certificate number gen, canonical payload, HMAC-SHA256 sign/verify
│   │   │   ├── certificateBuilder.js  ← PDFKit A4 certificate with embedded QR code
│   │   │   ├── qrGenerator.js         ← QR code PNG buffer and data URL generation
│   │   │   ├── csvMatcher.js          ← CSV parse, role normalize, auto-verify, issueCertificateForClaim()
│   │   │   └── excelExporter.js       ← ExcelJS .xlsx marks sheet (12 cols, professional formatting)
│   │   │
│   │   ├── controllers/
│   │   │   ├── auth.controller.js           ← register, login, getCurrentUser
│   │   │   ├── event.controller.js          ← createEvent, listEvents, getEventById, uploadEventCsv
│   │   │   ├── claim.controller.js          ← submitClaim, reviewClaim, getStudentClaims, getPendingClaims
│   │   │   ├── certificate.controller.js    ← getMyCertificates, getLinkedInShareUrl, getPublicStudentPortfolio
│   │   │   ├── publicVerify.controller.js   ← verifyCertificatePublic (2-tier HMAC verification)
│   │   │   ├── admin.controller.js          ← createPasscodes, listPasscodes, revokePasscode, deletePasscode, getPasscodeStats
│   │   │   └── facultyGrading.controller.js ← getClassGradingMatrix, getStudentActivityDetails, saveFacultyAssessment, bulkSaveFacultyAssessments, exportClassAssessmentExcel
│   │   │
│   │   └── routes/
│   │       ├── auth.routes.js              ← /api/auth/*
│   │       ├── event.routes.js             ← /api/events/*
│   │       ├── claim.routes.js             ← /api/claims/*
│   │       ├── certificate.routes.js       ← /api/certificates/*
│   │       ├── publicVerify.routes.js      ← /api/verify/*
│   │       ├── admin.routes.js             ← /api/admin/*
│   │       └── facultyGrading.routes.js    ← /api/faculty/grading/*
│   │
│   └── uploads/
│       ├── certificates/              ← Generated PDF certificates (served as static files)
│       ├── csv-rosters/               ← Temporary uploaded CSV files (deleted after processing)
│       └── reports/                   ← Generated Excel .xlsx files
│
└── frontend/
    ├── src/
    │   ├── api/
    │   │   └── axiosInstance.js       ← Axios with base URL, JWT interceptor, 401 → logout handler
    │   │
    │   ├── context/
    │   │   └── AuthContext.jsx        ← Global auth state: user, token, isAuthenticated, login/register/logout
    │   │
    │   ├── App.jsx                    ← React Router config, ProtectedRoute HOC with role checking
    │   ├── main.jsx                   ← React app entry point
    │   │
    │   ├── pages/
    │   │   ├── LoginPage.jsx              ← Login/Register tabs, public cert verify, public portfolio lookup
    │   │   ├── StudentDashboard.jsx       ← Claims form, certificates tab, claims status tab, KPIs, portfolio URL
    │   │   ├── FacultyEventManager.jsx    ← Create event, claim approval queue, CSV upload, event registry
    │   │   ├── FacultyMarksPortal.jsx     ← Presets, filters, analytics dashboard, NAAC matrix, grading table, exports
    │   │   ├── AdminDashboard.jsx         ← Passcode generation, registry, stats, revoke/delete
    │   │   ├── PublicVerifyPage.jsx       ← Cryptographic verification result page (zero login)
    │   │   └── PublicStudentPortfolio.jsx ← Student credential showcase page (zero login)
    │   │
    │   └── components/
    │       ├── layout/
    │       │   └── Navbar.jsx              ← Role-based nav, quick cert verify bar, user badge, logout
    │       │
    │       ├── certificate/
    │       │   └── LiveCertificatePreview.jsx  ← A4 certificate modal/inline with action bar (copy, print, PDF, download)
    │       │
    │       ├── student/
    │       │   └── LinkedInShareModal.jsx  ← LinkedIn certifications form, social share buttons, caption
    │       │
    │       └── faculty/
    │           └── Student360Drawer.jsx    ← Slide-over 360° student activity record with nested cert preview
    │
    └── .env                           ← VITE_API_BASE_URL=http://localhost:5000/api
```

---

## 19. Environment Variables

### Backend (`backend/.env`)

```env
# PostgreSQL connection string (Neon.tech or local)
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"

# JWT signing secret — must be at least 32 characters
JWT_SECRET="your-long-random-jwt-secret-here"

# HMAC-SHA256 secret for certificate signing — must be at least 32 characters
# Changing this WILL invalidate all existing certificates
CRYPTO_HMAC_SECRET="your-long-random-hmac-secret-here"

# Frontend base URL — embedded in every QR code verification URL
FRONTEND_URL="http://localhost:5173"

# Institution name — appears on certificates and Excel exports
ISSUER_INSTITUTION_NAME="Swami Keshvanand Institute of Technology, Management & Gramothan"

# Server port (default: 5000)
PORT=5000

# Environment
NODE_ENV=development
```

### Frontend (`frontend/.env`)

```env
# Backend API base URL — must use http:// not https:// for local development
VITE_API_BASE_URL=http://localhost:5000/api
```

---

### Setup & Run Commands

```bash
# Backend
cd backend
npm install
npx prisma generate          # Generate Prisma client
npx prisma migrate deploy    # Apply schema to database (or: npx prisma db push)
node create-admin.js         # Seed HOD_ADMIN account into database
npm run dev                  # Start backend on port 5000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev                  # Start frontend on port 5173
```

### Default Admin Credentials
```
Email:    admin@skit.ac.in
Password: Admin@Vericred2026
Role:     HOD_ADMIN
```
*(Created via `node create-admin.js` from the backend directory)*
