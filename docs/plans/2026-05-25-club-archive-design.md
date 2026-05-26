# Club Archive (Soft Delete + Restore) — Design

Date: 2026-05-25
Author: Willy
Branch: `feature/club-archive`

## Goal

Allow an Organisation Admin to delete (archive) a club within their own
organisation. Deletion is a soft delete: the club and all related data stay in
the database. An archived club disappears from every normal view. The admin can
later restore an archived club, bringing it and all its related data back
unchanged.

## Approach

Stamp the archive marker on the `Club` document only.

Events, tasks, budgets, memberships, follows, invitations and join requests are
all reachable only *through* the club. Once the club is hidden from every list,
that related data becomes unreachable in the UI, so we do not stamp each related
collection. This keeps restore perfectly safe — one field flip fully restores
the club with no risk of a partially-restored state.

### Data model

`Club` gains one field:

```js
archivedAt: { type: Date, default: null }
```

- Active club: `archivedAt === null`.
- Archived club: `archivedAt` holds the archive timestamp.

MongoDB `{ archivedAt: null }` matches both an explicit `null` and a missing
field, so existing club documents are treated as active without a migration.

### Backend endpoints (`server/src/routes/clubs.js`)

All three are admin-only and verify the club belongs to the admin's org
(same guard pattern as the existing `assign-president` / update routes).

| Method & path | Action |
|---|---|
| `DELETE /clubs/:id` | Set `archivedAt = new Date()`. Reject if already archived. |
| `POST /clubs/:id/restore` | Set `archivedAt = null`. Reject if not archived. |
| `GET /clubs/org/archived` | List archived clubs for the admin's org. |

### Read sites to filter (hide archived clubs)

Add `archivedAt: null` to these listing queries:

1. `clubs.js` GET `/` — org admin's club list.
2. `clubs.js` GET `/my` — populate clubId with `match: { archivedAt: null }`, then drop null entries.
3. `clubs.js` GET `/browse` — club browse filter.
4. `clubs.js` GET `/following` — populate clubId with `match: { archivedAt: null }`, drop nulls.
5. `clubs.js` GET `/org/users` — `Club.find({ orgId, archivedAt: null })` so archived clubs' members are excluded.
6. `events.js` browse — `Club.find({ ...clubFilter, archivedAt: null })`.

Single-record fetch by id:

- `clubs.js` GET `/:id/detail` — return 404 if the club is archived (so a stale
  link cannot open an archived club).
- Other `findById` sites (budget/events workspace ops) are reachable only after
  navigating from a list, so they need no change; an archived club is already
  unreachable there. (If we later expose direct links we revisit this.)

### Frontend (`client/src/pages/AdminDashboard.tsx`)

- Each active club row gets an **Archive** button with a confirm dialog
  ("Archive <club>? Members lose access until it is restored.").
- New **Archived Clubs** section listing archived clubs, each with a **Restore**
  button.
- `fetchData` additionally calls `GET /clubs/archived`.

## Out of scope

- Stamping/filtering individual related collections (events, tasks, budgets).
- Hard delete / permanent removal.
- Automated tests — the repo has no test framework; verification is done at
  runtime. (Testing remains team future scope.)

## Verification

- Start the server; archive a club via the admin dashboard and confirm it
  disappears from the club list, browse, `/my`, following, and org users.
- Confirm its events/budgets are no longer reachable from the UI.
- Restore it and confirm everything reappears unchanged.
