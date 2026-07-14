#!/usr/bin/env bash
# Render build command. Point the service's "Build Command" at:
#
#     ./backend/build.sh
#
# Kept in the repo rather than typed into the Render dashboard so that what
# runs on deploy is reviewable, versioned, and the same for everyone — a
# migration that only exists in a web form is a migration nobody can find
# when the deploy breaks at 11pm.
set -o errexit  # any failing step fails the build, rather than shipping a half-migrated app

pip install -r requirements.txt

# Additive only: new tables and a new column with a default. Safe to run
# against the existing database — no data is dropped or rewritten.
python manage.py migrate --noinput

# Idempotent (every write is update_or_create / get_or_create), so re-running
# it on each deploy refreshes the seed templates without duplicating them or
# touching any real visitor's session data.
python manage.py seed_sample_data

# The ~10k catalog, loaded from the checked-in fixture rather than regenerated.
#
# generate_catalog is an authoring tool and must never run on a deploy. SKUs are
# referenced by every correction, learned preference and context.md, so they have
# to be stable: regenerating on deploy would let an edit to the generator shift a
# SKU underneath a memory that points at it. Loading is also idempotent, so a
# redeploy leaves the rows (and anything derived from them, like embeddings)
# alone instead of churning them.
python manage.py load_catalog

# Semantic vectors for the catalog, so retrieval understands "Kugellager" is a
# ball bearing (matching/embeddings.py). Idempotent by content hash: the first
# run buys ~10k embeddings for about $0.006, every run after it buys nothing and
# takes a second. If there is no API key, or the API is down, it warns and moves
# on rather than failing the build — retrieval degrades to lexical-only, which
# still works.
python manage.py embed_catalog
