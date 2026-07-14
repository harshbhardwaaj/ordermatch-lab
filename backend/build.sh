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
