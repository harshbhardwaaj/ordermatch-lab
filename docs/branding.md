# Brands, deployments, and the one database

One codebase. One database. Several audiences.

This app goes to more than one place: a private link addressed to a specific
company, and a public link addressed to nobody in particular. Those two differ
only in how they *look* and who they *greet*. The matching, the memory, the
catalog, the evals are identical, and must stay identical.

So they are not separate branches. A fork drifts. The memory fix you land on one
copy is the bug you still have on the other, and you find out from the person you
were trying to impress. The audience is a build-time setting instead.

---

## The two knobs

| Knob | Lives on | What it decides |
| --- | --- | --- |
| `NEXT_PUBLIC_BRAND` | the Vercel frontend | how it looks, and who it greets |
| `SHARED_DEMO_SESSION_ID` | the Render backend | whether visitors share one workspace |

They are independent, and both matter.

### `NEXT_PUBLIC_BRAND` (frontend)

| Value | Audience | Renders |
| --- | --- | --- |
| `neutral` | public: LinkedIn, cold outreach, anyone not written to | own mark, blue palette, no client named |
| `buildingradar` | the private link to Building Radar | their mark and palette, hero copy answering their case |

Defined in [`frontend/lib/brand.ts`](../frontend/lib/brand.ts). Palette in the
`data-brand` blocks of [`frontend/app/globals.css`](../frontend/app/globals.css).

**The default is `neutral`, on purpose.** If the variable is missing or
misspelt, the page falls back to the version that has never worn anybody else's
logo. The failure that must never happen is the other one: a public URL dressed
in a client's brand reads as an official property of theirs, or as a claim of
affiliation. Engineer against that one.

**Set it explicitly anyway, even to `neutral`.** Next.js only inlines a
`NEXT_PUBLIC_*` value it can see at build time. When it is set, the brand
comparison folds to a constant and the unused brand, its copy, its logo path and
its glyph are dropped from the JavaScript entirely. When it is unset, the
fallback still renders correctly, but both brands survive in the bundle, so the
public site would ship a client's name in its JS for anyone who opened devtools.
It would never render. It would still be there.

(The scoped `:root[data-brand=…]` palette block does remain in the stylesheet
either way. It is a handful of hex values that never apply, and stripping it
would cost more than it is worth.)

### `SHARED_DEMO_SESSION_ID` (backend)

This is not cosmetic, and getting it wrong is the one mistake here that can
actually hurt you. See
[`backend/common/middleware.py`](../backend/common/middleware.py).

| Value | Mode | Use for |
| --- | --- | --- |
| a string, e.g. `building-radar` | **shared workspace**: every visitor lands in the same data | a private link to one company |
| empty | **per-visitor**: each browser gets its own isolated copy | any public link |

Shared mode is what makes the learning story land for an invited audience: a
correction someone makes is still there tomorrow, and for their colleague. That
is the whole point of the build.

Shared mode on a *public* link means every stranger on the internet lands in the
same workspace, sees each other's work, and can hit the reset button on it. If
that workspace is also the one your addressed client is reading, someone can
vandalise your deliverable while they have it open.

**A public deployment must have this empty. No exceptions.**

---

## Why one database is fine

Both backends can point at the same Postgres, and should: the catalog is 10k rows
and there is no reason to pay for or seed a second copy.

- The catalog is read-only at runtime. Both audiences match against the identical
  10,202 items, which is what you want.
- Every order, correction, learned preference and context file is already scoped
  by `demo_session_id`. Distinct session ids mean the two demos cannot see each
  other's data, in the same database.

What makes this safe is precisely that the two backends run the *same code* and
therefore expect the *same schema*. It is not safe when they don't: an older
service pointed at this database will hit columns it has never heard of, and a
catalog forty times bigger than its matching was designed for.

---

## Deployment map

| | Public | Building Radar |
| --- | --- | --- |
| Vercel project | tracks `main` | tracks `buildingradar-demo` |
| `NEXT_PUBLIC_BRAND` | `neutral` | `buildingradar` |
| Render service | its own | its own |
| `SHARED_DEMO_SESSION_ID` | *(empty)* | `building-radar` |
| Render root directory | `backend` | `backend` |
| Render build command | `./build.sh` | `./build.sh` |
| Render start command | `./start.sh` | `./start.sh` |
| Database | shared | shared |

`buildingradar-demo` exists as a **frozen snapshot**, not as a fork. It holds the
same code as `main`. Its purpose is that once the link is sent, nothing pushed to
`main` can change what the recipient opens.

The start command is not optional: the instance is 512 MB, and the flags in
[`backend/start.sh`](../backend/start.sh) are what keep it under. A bare
`gunicorn` line got the worker killed on the first pasted order.

---

## Adding a brand

Say Acme asks for a link.

1. Add an `ACME` entry to [`frontend/lib/brand.ts`](../frontend/lib/brand.ts),
   and add `"acme"` to `BrandId`. Copy the shape of an existing one: mark,
   salutation, hero, contact headline, meta description.
2. Add their palette in a `:root[data-brand="acme"]` block (and its dark twin) in
   [`frontend/app/globals.css`](../frontend/app/globals.css).
3. If they get a mark, add it to `BrandMark` in
   [`frontend/components/brand-mark.tsx`](../frontend/components/brand-mark.tsx),
   switching on `process.env.NEXT_PUBLIC_BRAND` so the unused one is dropped from
   the other builds.
4. New Vercel project on the same repo, `NEXT_PUBLIC_BRAND=acme`.
5. If they should get a persistent shared workspace, a new Render service with
   `SHARED_DEMO_SESSION_ID=acme`. Same database, same build and start commands.
   If not, point their frontend at the public backend.

No new branch. No copy of the app.

## The rule that matters

Their mark is the **addressee**, never the byline. Every screen carries "a
prototype by Harsh Bhardwaj", and a client's logo only ever appears as the thing
the letter is addressed to. The site must never be mistakable for an official
property of the company it is written to, and their branding must never appear on
a link that was not written to them.
