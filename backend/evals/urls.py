# Intentionally empty. EvalRunViewSet exposed every eval run — metrics and
# failure cases — to anyone, unauthenticated, on the public router. Nothing in
# the frontend reads it, and the eval commands (manage.py eval_orders /
# eval_memory) read the database directly, so the HTTP route was pure attack
# surface: a public description of exactly which cases the matcher gets wrong.
#
# The viewset and serializer are kept so the route can be reinstated behind auth
# if an internal dashboard ever needs it; only the registration is removed.
urlpatterns = []
