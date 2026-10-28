# PCG ePTW

Electronic Permit to Work & Safety Control System for Premier Centre Group.

## Run the local pilot

```powershell
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). No credentials are needed for the explicitly labeled local demo. Its account is simulated; changes persist in browser local storage. Sample permits use an explicit **28 October 2026, 11:50 MYT** snapshot. Newly created permits use their actual validity. Use Settings → Reset local demo to restore sample records. Demo document uploads retain metadata only.

## Simple mode and digital acknowledgement

The default home now has three actions: **Create permit → Review & sign → Check a signature record**. A short form at `/new-permit` creates a draft from basic work details. The full safety form and operational tools remain available under **More tools**; the detailed dashboard is at `/overview`.

At `/sign`, choose a permit, open its summary, enter your name and role, type the same name to sign, and confirm the acknowledgement. The resulting receipt records the name, role, timestamp in MYT, permit snapshot, unique reference and SHA-256 checksums. Its verification page flags modified receipts and later permit changes. You can look up an `ACK-…` reference, open the local link, use its QR, or print/save the receipt as PDF. Signing adds an audit event and never changes or approves the permit status.

This feature remains an explicitly labeled **local demonstration**. Names, roles and times are self-declared; a checksum detects changes but does not authenticate identity. Records and their QR/verification links work in the browser where they were created. Authenticated, server-held signing and cross-device verification are not enabled. Signing is disabled in connected mode until that service is implemented. Existing safety approval and activation gates remain in place.

## Implementation status

This is the initial build requested in section 58 of the brief, with reviewable screens for the later lifecycle. It is **not the completed production V1** and must not authorize real work.

Delivered:

- Next.js 16 App Router, strict TypeScript, Tailwind, React Hook Form and Zod; pinned dependencies and lockfile.
- Responsive navy application shell, mobile navigation, command search, dashboard, filtered permit register and CSV export.
- Eight-step creation wizard: work information, people, unlimited workers, activity selection, risk calculations, PPE, checklists, specialist control capture, documents, declaration and submission checks.
- Explicit Save Draft at every step; debounced local autosave and recovery in demo mode.
- Contractor directory, worker view, risk register, reports, audit explorer and master-data reference screens.
- Permit detail, approval review, mandatory critical-information acknowledgement, stop-work and resumption dialogs, QR verification and A4 print / browser Save as PDF.
- Demo lifecycle actions, extension history, holder transfer and end-of-day sign-out. Every local action records a demonstration audit event.
- Cookie-based Supabase password authentication, session refresh, server-validated mutations, live permission lookup and database-enforced permissions.
- PostgreSQL schema, role/permission seeds, RLS, private storage policies, signed-document access, sequence numbering, serialized transitions, immutable approvals and audit events.
- Installable PWA manifest and network-only safety pages. Offline fallback explicitly refuses verification; no permit or API responses are cached.

Connected mode supports authentication, permission-filtered permit reads, draft saving, uploads, submission, review, configured approval steps and guarded transitions. It intentionally blocks issuance without a linked authenticated holder, activation without the required independent specialist records, and closure without distinct authenticated closure acknowledgements. These later record-entry interfaces and RPCs are **not implemented yet**. Extension, transfer and sign-out actions are local-demo only. Approval rework after an already instantiated approval cycle is conservatively blocked pending a versioned approval-cycle module.

## Architecture

- **UI**: `src/components` contains the shell, dashboard, wizard, permit review and supporting workspaces.
- **Business rules and validation**: `src/lib/domain.ts` defines status transitions, draft schemas, risk bands and submission requirements.
- **Transport**: `src/app/api` authenticates requests, validates payloads and calls narrowly scoped database functions. No service-role key is used.
- **Persistence**: Supabase PostgreSQL stores JSON drafts plus normalized submitted risk/worker snapshots. Transition functions lock each permit, verify permissions and atomically append audit events.
- **Authorization**: `roles`, `permissions`, `role_permissions` and `user_roles`; permissions are queried from the database. RLS controls reads. Ordinary clients have no direct insert/update/delete grants on safety tables. Protected functions live in the unexposed `private` schema with explicit execute grants and fixed search paths.
- **Documents**: private `permit-documents` bucket; permit UUID prefixes; immutable object names; authorized short-lived signed downloads.
- **Verification**: random UUID token and a narrowly projected public response; no worker identities, contact details, internal risk records or approval comments. Connected verification refreshes every 10 seconds and on focus, and fails closed when unavailable. Connected operational data refreshes every 15 seconds while visible and on focus.
- **Future modules**: normalized tables represent extensions, transfers, sessions, closure, amendments, environmental/activity controls and specialist testing. No AI or MKSS integration is included.

## Connect Supabase later

The user chose local demo mode; no cloud project was created or changed.

1. Create a dedicated development Supabase project, or start the local Supabase stack with Docker using the committed configuration.
2. Apply `supabase/migrations/20261028115944_pcg_foundation.sql`, then `supabase/seed.sql` with the Supabase SQL editor or a verified CLI workflow. The seed provisions reference data, not accounts.
3. Copy `.env.example` to `.env.local`; set the Supabase project URL, **publishable** key and the actual application origin. Restart Next.js.
4. Provision accounts through Supabase Auth. Insert matching `profiles` rows, then assign `user_roles` to approved users. Do not grant roles based on editable user metadata. There is deliberately no automatic administrator signup.
5. Have HSE review the risk matrix, contractor rules, approval template, R/I/H labels, validity limits, gas limits and all controls. R/I/H meanings remain undefined. Gas limits start unapproved with no invented thresholds.
6. Test RLS, Auth cookies, Storage and transactions against the actual Supabase environment before enabling operational use.

Bootstrap example, executed by a trusted database administrator after replacing the UUID:

```sql
insert into public.profiles(id, full_name)
values ('REPLACE-WITH-AUTH-USER-UUID', 'PCG Administrator');
insert into public.user_roles(user_id, role_id)
select 'REPLACE-WITH-AUTH-USER-UUID', id
from public.roles where name = 'Super Admin';
```

## Remaining work before production

Follow the phased order in the source brief:

1. Run the migration and security advisors on a real Supabase instance; verify actual Auth/Storage behavior, concurrent sessions and backup/restore. Current SQL tests use embedded PostgreSQL with mocked Auth and Storage schemas.
2. Replace static master-data selectors with authorized configuration APIs and versioned, HSE-approved rules; add relational contractor/worker selection and authenticated holder assignment. The current master-data screens show reference values; they are not configuration editors.
3. Implement typed specialist records, calculated atmospheric results from approved configured limits, test schedules/calibration, independent LOTO verification/release and evidence, periodic fire checks, lifting/height/environmental controls and per-worker acknowledgements. Current wizard specialist fields capture information; they are not a certified entry authorization workflow.
4. Add versioned approval cycles and rework, distinct actor acknowledgements, signature storage if required, complete document version records, and conflict detection.
5. Implement connected extension, shift transfer, work-session start/stop, formal sign-out, closure and administrative amendment services. Preserve original values and enforce limits in transactions.
6. Schedule expiry/monitoring jobs after review. `private.expire_permits()` exists but is not scheduled. Add nearing-expiry/certificate/gas-test notifications and durable notification acknowledgement; wire Realtime or reliable polling to operational boards. Never infer current safety from an unrefreshed screen.
7. Add server-pagination and full reporting; current connected register fetch is capped at 500 visible permits, and audit fetch at 100 events. CSV is the initial export; browser print provides PDF.
8. Add deployment headers/CSP tuned for the chosen host, durable per-user rate limits, monitoring, MFA/SSO policy, account recovery/provisioning UX, operational security review, accessibility review and formal HSE UAT against the original paper form. The brief was supplied; the original paper form was not.

## Verification

```powershell
npm run lint
npm run typecheck
npm test
npm run build
# With npm run dev running separately:
npx playwright test
```

Browser tests use the installed Windows Chrome by default. Set `PLAYWRIGHT_CHROME_PATH` to another Chrome executable when needed. Screenshots are written to `test-results/` (ignored by Git).

Safety tests cover rejected direct writes, row isolation, invalid state transitions, incomplete submissions, numbering uniqueness, immutable audit history, expired public verification and demo critical-control gates. These tests do not replace Supabase integration testing or PCG HSE approval.
