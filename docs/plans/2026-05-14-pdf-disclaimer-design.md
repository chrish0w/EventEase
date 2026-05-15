# PDF Disclaimer Templates — Design

**Date**: 2026-05-14
**Branch**: `feature/safety-disclaimer`
**Scope**: Extend the existing text-based disclaimer template system to support PDF uploads as an alternative content type. Templates and event snapshots are strictly either text or PDF.

## 1. Goals

- Allow presidents to upload PDF files as disclaimer templates, in addition to the existing markdown templates.
- Reuse the existing snapshot semantics — once an event is created, its disclaimer (text or file) is frozen, independent of later template edits or deletions.
- Display PDFs inline via the browser's native PDF viewer (iframe) for a seamless preview experience.
- Reuse the multer infrastructure introduced by the Event-Workspace merge (PR #11) to avoid new file-handling code paths.

## 2. Non-Goals (YAGNI)

- Other file formats (.docx, images, .txt) — PDF only.
- Mixed templates (text + PDF on the same template).
- Cross-type editing — converting a text template to PDF (or vice versa) requires creating a new template.
- RSVP-side disclaimer acknowledgement enforcement — out of scope, same as the original disclaimer design.
- PDF text extraction, search, OCR.
- Inline annotation, signature capture, or version history of uploaded PDFs.

## 3. Decisions Summary

| # | Decision | Choice |
|---|----------|--------|
| Q1 | Role of file upload | Alternative template type — PDF replaces the markdown body |
| Q2 | Allowed file formats | PDF only (strict MIME + extension check) |
| Q3 | Text/PDF coexistence | Strict either/or per template |
| Q4 | Snapshot strategy for PDFs | Copy the file to a per-event path at event creation |
| Q5 | PDF rendering | Inline `<iframe>` fed by a blob URL fetched through authenticated axios |
| Q6 | Type immutability | Type is locked after creation; cross-type edit requires creating a new template |
| Q7 | RSVP gating | Deferred (same as original disclaimer feature) |

## 4. Data Model

### 4.1 `DisclaimerTemplate` (extended)

`server/src/models/DisclaimerTemplate.js`

```js
{
  clubId:    ObjectId   // existing
  title:     String     // existing
  type:      String     // NEW — 'text' | 'pdf', default 'text'
  content:   String     // existing — required when type='text', null when type='pdf'
  fileUrl:   String     // NEW — relative path 'uploads/disclaimer-template-{ts}.pdf', required when type='pdf'
  createdBy: ObjectId   // existing
  updatedBy: ObjectId   // existing
  timestamps: true
}
```

Pre-save validator: enforce `(type==='text' && content)` XOR `(type==='pdf' && fileUrl)`.

### 4.2 `Event` (extended snapshot fields)

```js
{
  requiresSafetyDisclaimer: Boolean    // existing
  disclaimerTemplateId:     ObjectId   // existing (audit-only reference)
  disclaimerTitle:          String     // existing snapshot
  disclaimerType:           String     // NEW — 'text' | 'pdf', default 'text'
  disclaimerContent:        String     // existing — set when type='text'
  disclaimerFileUrl:        String     // NEW — per-event PDF copy path when type='pdf'
}
```

### 4.3 Backwards Compatibility

- Existing template documents without `type` default to `'text'` via mongoose `default`.
- Existing event snapshots without `disclaimerType` default to `'text'` via mongoose `default`.
- No migration script required for the dev/test datasets. Production-grade backfill, if needed, is a one-line `updateMany({ type: { $exists: false } }, { $set: { type: 'text' } })`.

## 5. File Storage

- Reuse the multer config from `server/src/routes/workspaces.js` — same `server/uploads/` directory, same 20MB cap.
- Template files: `uploads/disclaimer-template-{timestamp}-{rand}.pdf`.
- Event snapshot files: `uploads/disclaimer-event-{eventId}.pdf` (copied via `fs.copyFile()` from the template's PDF).
- multer `fileFilter` enforces both MIME (`application/pdf`) and extension (`.pdf` lowercased) — fail-closed on either mismatch.

## 6. Backend API

### 6.1 `server/src/routes/disclaimerTemplates.js`

```
POST   /api/disclaimer-templates          create (multipart/form-data)
  body: clubId, title, type, content? (text), file? (pdf)
  - Reject if type mismatch with provided fields.
  - On success: return populated template document.

PUT    /api/disclaimer-templates/:id      update (multipart/form-data)
  - Cross-type edit forbidden — return 400 if request type !== stored type.
  - PDF type: replacing the file deletes the old file from disk.

DELETE /api/disclaimer-templates/:id      delete
  - For PDF type, also unlink the file from disk.
  - Existing events keep their own snapshot copy and are unaffected.

GET    /api/disclaimer-templates/:id/file NEW — inline PDF download
  - Auth required.
  - res.sendFile() with Content-Disposition: inline.
  - 404 if template is not PDF type or file is missing.
```

### 6.2 `server/src/routes/events.js`

```
applyDisclaimerSnapshot() — extended:
  if (template.type === 'text'):
    payload.disclaimerType    = 'text'
    payload.disclaimerContent = template.content
    payload.disclaimerFileUrl = null
  else (pdf):
    payload.disclaimerType    = 'pdf'
    payload.disclaimerContent = null
    // copy template's PDF to per-event path (after event._id is known)
    payload.disclaimerFileUrl = `uploads/disclaimer-event-${event._id}.pdf`

Workflow change: on event creation, the disclaimer file copy must happen
*after* Event.create() so we have an _id. If the copy fails, rollback the
event document and return 500.

GET /api/events/:id/disclaimer-file       NEW — inline event PDF snapshot
  - Auth required; same pattern as 6.1.
```

### 6.3 Event Deletion

The existing `DELETE /api/events/:id` already unlinks budgets. Extend it to also remove `disclaimerFileUrl` if set.

## 7. Frontend

### 7.1 New Component: `client/src/components/PdfPreview.tsx`

A reusable PDF iframe with authenticated blob fetching:

```tsx
function PdfPreview({ url, className }: { url: string; className?: string }) {
  const [blobUrl, setBlobUrl] = useState<string>('');
  useEffect(() => {
    let revoked = '';
    api.get(url, { responseType: 'blob' }).then(res => {
      revoked = URL.createObjectURL(res.data);
      setBlobUrl(revoked);
    });
    return () => { if (revoked) URL.revokeObjectURL(revoked); };
  }, [url]);
  return blobUrl
    ? <iframe src={blobUrl} className={className ?? 'w-full h-[500px]'} title="PDF preview" />
    : <div className="text-sm text-gray-400 py-8 text-center">Loading PDF…</div>;
}
```

Used in three places: template list preview, CreateEventPage selected-template preview, EventsPage "Safety Required" modal.

### 7.2 `DisclaimersPage.tsx`

- Card list: each row shows a type badge (📄 Text / 📕 PDF). PDF rows also display the filename and file size.
- Create modal: radio toggle at the top (`Text` / `PDF`). Text branch keeps the existing markdown textarea. PDF branch shows a file input (or drag-drop zone) with `accept=".pdf"`, then renders `<PdfPreview>` once a file is selected (using a local `URL.createObjectURL` on the File object — no upload required for preview).
- Edit modal: type field is read-only with the helper text `"Type cannot be changed after creation. Create a new template if needed."` PDF templates get a "Replace PDF" button.
- Submit uses `FormData` for both create and update; axios sets `Content-Type: multipart/form-data` automatically.
- Delete confirmation: for PDF templates, warn that the file will be removed but reassure that existing events are unaffected.

### 7.3 `CreateEventPage.tsx`

- Template dropdown option labels show the type icon: `📄 Title (text)` or `📕 Title (pdf)`.
- Preview area branches on `selectedTemplate.type`:
  - `'text'` → existing `<DisclaimerMarkdown content={...} />`.
  - `'pdf'`  → `<PdfPreview url={'/disclaimer-templates/' + id + '/file'} />`.

### 7.4 `PresidentEventsPage.tsx` & `CommitteeEventsPage.tsx`

The "Safety Required" modal body branches on `event.disclaimerType`:

```tsx
{event.disclaimerType === 'pdf'
  ? <PdfPreview url={'/events/' + event._id + '/disclaimer-file'} />
  : <DisclaimerMarkdown content={event.disclaimerContent ?? ''} />}
```

### 7.5 TypeScript Interface Updates

Every file declaring `Event` or `DisclaimerTemplate` interfaces adds:

```ts
interface DisclaimerTemplate {
  // existing fields…
  type: 'text' | 'pdf';
  fileUrl?: string;
}
interface Event {
  // existing fields…
  disclaimerType?: 'text' | 'pdf';
  disclaimerFileUrl?: string | null;
}
```

## 8. Error Handling & Rollback

| Failure point | Handling |
|---|---|
| multer rejects file (size / mimetype) | 400 to client; no side effects |
| Template DB save fails after file upload | Catch block unlinks the orphan file |
| Event DB save succeeds but file copy fails | Roll back Event document, return 500 |
| File unlink fails on template/event delete | Log a warning; DB operation still succeeds |
| Client requests `:id/file` but template is text type | 404 |
| Client requests `:id/file` but disk file is missing | 404 |

## 9. Security

- All PDF endpoints behind the existing `auth` middleware — no `express.static('/uploads')`.
- Uploaded filenames are server-generated; the user-supplied filename is stored as metadata but never used for paths.
- All disk operations use `path.join(UPLOADS_DIR, basename(...))` to prevent path traversal.
- iframe renders blob URLs only — PDFs are never reachable via a stable public URL, so no leakage to crawlers or third-party hotlinking.

## 10. Manual Test Plan

1. Create a text template → bind to a new event → confirm markdown renders in event card modal.
2. Create a PDF template (upload a real PDF) → bind to a new event → confirm iframe renders.
3. Delete a PDF template that's already attached to an event → existing event still shows its PDF correctly (snapshot independence).
4. Replace the PDF on a template that's already attached to an old event → old event keeps the original PDF, a new event created after the replacement uses the new file.
5. Upload a 21MB file → 400 with size message.
6. Upload a `.docx` file → 400 with "PDF only" message.
7. Upload a 0-byte file → 400.
8. Delete an event with a PDF disclaimer → corresponding `disclaimer-event-{id}.pdf` is removed from disk.
9. Attempt to PUT a template with a different `type` than stored → 400.

## 11. Out of Scope (Follow-Ups)

- Student-side RSVP acknowledgement gate (separate work item, same as the original feature).
- File-size compression / thumbnail generation.
- PDF metadata extraction (page count, etc.) for richer UI.
- Multi-language disclaimers / per-event override on top of a template.
