#!/usr/bin/env bash
# Render build command. The service's Root Directory is backend/, so the
# "Build Command" is relative to it:
#
#     ./build.sh
#
# Kept in the repo rather than typed into the Render dashboard so that what
# runs on deploy is reviewable, versioned, and the same for everyone — a
# migration that only exists in a web form is a migration nobody can find
# when the deploy breaks at 11pm.
set -o errexit  # any failing step fails the build, rather than shipping a half-migrated app

pip install -r requirements.txt

# Safe to run against the existing database: no order, correction, preference or
# context file is dropped or rewritten.
#
# One exception, and it is deliberate: 0003 drops and re-adds the embedding
# column to change it from JSON to raw bytes, so the vectors are thrown away.
# embed_catalog below re-buys them (~$0.006, about a minute). They are the only
# thing here that is safe to lose, because they are derived data and nothing
# references them by value.
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
