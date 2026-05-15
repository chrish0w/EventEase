# Safety Disclaimer Templates — Design

**Date**: 2026-05-06
**Branch**: `feature/safety-disclaimer`
**Scope**: Multi-template disclaimer library at the club level, plus event-creation binding and display in event lists. Student RSVP acknowledgement is intentionally deferred until the RSVP system exists.

## 1. Goals

- Let presidents maintain a per-club library of safety disclaimer templates (markdown).
- Let committee members reuse those templates when creating events.
- Snapshot the disclaimer content onto each event so subsequent template edits/deletions cannot retroactively change what an attendee sees.
- Decouple the "requires disclaimer" flag from the existing `category` enum so any event type can require a disclaimer.

## 2. Non-Goals (YAGNI)

- Student-side RSVP acknowledgement checkbox (no RSVP system yet — added in a follow-up branch).
- Template version history.
- Template tags / categories.
- Per-event override editor on top of a template.
- PDF / file attachments.
- Cross-club or global templates.

## 3. Decisions Summary

| # | Decision | Choice |
|---|----------|--------|
| Q1 | Template scope | Multi-template library per club |
| Q2 | Event ↔ disclaimer binding | Independent toggle, decoupled from `category` |
| Q3 | Permissions | President: manage. Committee: read-only / use only |
| Q4 | Content format | Markdown rendered via `react-markdown` + `remark-gfm` |
| Q5 | Storage strategy | Snapshot title + content onto event at create/update time |
| Q6 | Sidebar tab | "Safety Disclaimers" with ⚠️ icon (replaces `Safety Files` placeholder) |
| Q7 | Branch scope | Template management + create-event binding + list display modal. RSVP checkbox deferred. |
| Q8 | Validation when toggle is ON | Template selection mandatory; rejected by both client and server |

## 4. Data Model

### 4.1 New: `DisclaimerTemplate`

`server/src/models/DisclaimerTemplate.js`

```js
{
  clubId:    ObjectId, ref: 'Club', required, indexed
  title:     String,   required
  content:   String,   required          // markdown
  createdBy: ObjectId, ref: 'User'
  updatedBy: ObjectId, ref: 'User'
  // timestamps: createdAt, updatedAt
}
// Compound unique index: { clubId: 1, title: 1 }
```

### 4.2 Modified: `Event`

Add three fields:

```js
disclaimerTemplateId: { type: ObjectId, ref: 'DisclaimerTemplate', default: null }  // provenance only
disclaimerTitle:      { type: String,   default: null }   // snapshot
disclaimerContent:    { type: String,   default: null }   // snapshot (markdown)
```

Pre-save hook changes:

- Remove: `if (this.category === 'outdoor') this.requiresSafetyDisclaimer = true`
- Add validator: when `requiresSafetyDisclaimer === true`, both `disclaimerTitle` and `disclaimerContent` must be non-empty; otherwise throw.

The snapshot fields are the source of truth for rendering. `disclaimerTemplateId` is informational ("From template: X") and may dangle if the template is later deleted.

## 5. Backend API

New router file: `server/src/routes/disclaimerTemplates.js`, mounted at `/api/disclaimer-templates` in `server/src/index.js`.

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET    | `/api/disclaimer-templates?clubId=:id` | Club member | List templates for a club |
| POST   | `/api/disclaimer-templates`            | President of `clubId` | Create template |
| GET    | `/api/disclaimer-templates/:id`        | Club member | Get one template |
| PUT    | `/api/disclaimer-templates/:id`        | President of owning club | Update title/content |
| DELETE | `/api/disclaimer-templates/:id`        | President of owning club | Delete (events keep snapshot) |

### 5.1 President check

Inline middleware that resolves `clubId` (from body, params, or template lookup) and verifies a `ClubMembership` document with `{ userId, clubId, role: 'president' }` exists.

### 5.2 Events route changes (`server/src/routes/events.js`)

`POST /api/events` and `PUT /api/events/:id`:

- If body includes `disclaimerTemplateId`, server fetches that template, verifies it belongs to the event's `clubId`, then copies `title` → `event.disclaimerTitle` and `content` → `event.disclaimerContent`.
- If `requiresSafetyDisclaimer === true` but `disclaimerTemplateId` is missing or invalid for this club → `400`.
- Snapshot lives on the server side; clients never send disclaimer content directly.

## 6. Frontend

### 6.1 New page — `DisclaimersPage.tsx`

Path: `/clubs/:clubId/disclaimers`. Single page used by both presidents and committees, with role-conditional UI:

- List of templates as cards: title, "Updated N days ago by Author", collapsed markdown preview with Expand.
- Presidents: `[+ New Template]`, `Edit`, `Delete` buttons visible.
- Committees: read-only — no action buttons.
- Edit modal: split view, markdown textarea on the left, live preview on the right.

### 6.2 Routing

Add to `client/src/App.tsx`:

```tsx
<Route path="/clubs/:clubId/disclaimers" element={<DisclaimersPage />} />
```

### 6.3 Sidebar wiring

Replace the `{ icon: '🗂️', label: 'Safety Files', path: null }` entry in:

- `PresidentDashboard.tsx`
- `PresidentBudgetPage.tsx`
- `PresidentEventsPage.tsx`
- `PresidentMembersPage.tsx`

with `{ icon: '⚠️', label: 'Safety Disclaimers', path: '/clubs/:clubId/disclaimers' }` (clubId templated by existing sidebar render logic).

Add the same entry to committee-side dashboards (`CommitteeDashboard.tsx`, `CommitteeEventsPage.tsx`) where it does not yet exist.

### 6.4 CreateEventPage integration

Replace the existing `category === 'outdoor'` orange box (lines 406–411) with:

1. An independent **Requires Safety Disclaimer** checkbox bound to `form.requiresSafetyDisclaimer`. Defaults to `true` when the user picks `category === 'outdoor'`, but remains user-overridable.
2. When the checkbox is on, render a template `<select>` populated from `GET /api/disclaimer-templates?clubId=:id` and a live markdown preview of the chosen template.
3. Empty-state CTA: "No templates yet. [Create one first →]" linking to `/clubs/:clubId/disclaimers`.
4. Client-side validation: block submit if checkbox is on and no template is selected. Server enforces the same rule.
5. Submit payload sends only `disclaimerTemplateId`; the server snapshots `disclaimerTitle` / `disclaimerContent`.

### 6.5 Event list display

In `CommitteeEventsPage.tsx` and `PresidentEventsPage.tsx`, turn the existing ⚠️ Safety badge into a button that opens a modal showing `disclaimerTitle` and `disclaimerContent` rendered via the shared `DisclaimerMarkdown` component.

### 6.6 Shared component

`client/src/components/DisclaimerMarkdown.tsx` — wraps `react-markdown` + `remark-gfm` + tailwind `prose` styling. Reused by Templates page, CreateEvent preview, and Events list modal.

### 6.7 Dependencies

```
react-markdown ^9
remark-gfm     ^4
```

## 7. Error Handling

| Scenario | Behaviour |
|----------|-----------|
| Toggle ON, no template selected | Client: disabled submit + inline error. Server: `400 "Disclaimer template required"`. |
| `disclaimerTemplateId` belongs to a different club | Server: `400 "Template does not belong to this club"`. |
| Template deleted after event creation | Event still renders snapshot. UI shows `From template: (deleted)`. |
| Duplicate template title within a club | Server: `409 "Template name already exists"` (unique index). |
| Markdown content with embedded HTML | `react-markdown` escapes HTML by default; no extra sanitiser needed. |
| Non-president calls POST/PUT/DELETE on templates | Server: `403 "President only"`. |
| Committee user views DisclaimersPage | All mutation buttons hidden client-side; server enforces independently. |

## 8. Manual Test Plan

- [ ] President can create / edit / delete a template.
- [ ] Committee user opens DisclaimersPage; list is visible but `+ New`, `Edit`, `Delete` buttons are not rendered.
- [ ] Creating an event with `category === 'outdoor'` defaults the toggle to ON; toggle can be turned off manually.
- [ ] Creating an indoor event with the toggle manually enabled allows template selection.
- [ ] Toggle ON without selecting a template is rejected by both client and server.
- [ ] After event creation, edit the chosen template; the existing event still shows the original snapshot when its modal is opened.
- [ ] Delete the chosen template; the existing event's modal still renders content; provenance label shows `(deleted)`.
- [ ] Cross-club: a president of club A submits a `disclaimerTemplateId` belonging to club B → server returns `400`.

## 9. Out of Scope (Future Work)

- Student RSVP acknowledgement checkbox — single-line addition once the RSVP system lands.
- Template version history if compliance review ever needs it.
- Template tagging or grouping if libraries grow past ~20 templates.
- File attachments — tracked separately under "Health & Safety file uploads" in `docs/PROGRESS.md`.
