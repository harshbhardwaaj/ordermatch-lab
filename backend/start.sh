#!/usr/bin/env bash
# Render start command. The service's Root Directory is backend/, so the
# "Start Command" is relative to it:
#
#     ./start.sh
#
# In the repo rather than the dashboard for the same reason as build.sh: the
# flags below are load-bearing, and a flag that only exists in a web form is a
# flag nobody can find when the worker starts getting SIGKILLed.
set -o errexit

cd "$(dirname "$0")"

# glibc gives each thread its own malloc arena — by default up to 8 per core —
# and hands very little of that memory back to the OS. The catalog and its
# vectors are exactly the kind of short-lived bulk allocation that leaves the
# arenas fat, so on a 512 MB instance the process can hold far more than it is
# using. Capping the arenas is the standard fix and costs nothing here: the work
# is one worker doing one thing at a time.
export MALLOC_ARENA_MAX=2

# --workers 1: the free instance is 512 MB and each worker holds its own copy of
#   the catalog, the lexical index and the 16 MB vector matrix. A second worker
#   buys concurrency this demo does not need with memory it does not have.
# --threads 4: so a slow OpenAI call (a matching request is mostly waiting on the
#   API) does not block the health check or someone else's page load. Threads
#   share the caches; workers would not.
# --max-requests: recycle the worker periodically. Every OpenAI call builds a
#   fresh client and its TLS context, so resident memory creeps ~1.5 MB per
#   order. A restart every few hundred orders makes that a non-issue rather than
#   a slow death. The jitter stops all workers recycling in lockstep.
# --timeout 120: matching an order is several API round trips. Gunicorn's default
#   of 30s would kill a legitimately slow order mid-flight.
exec gunicorn ordermatch.wsgi:application \
  --workers 1 \
  --threads 4 \
  --max-requests 400 \
  --max-requests-jitter 50 \
  --timeout 120 \
  --access-logfile - \
  --error-logfile -
