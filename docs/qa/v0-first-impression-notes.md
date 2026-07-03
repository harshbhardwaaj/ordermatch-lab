# V0 First Impression Notes

**Date**: July 2, 2026  
**Reviewer type**: AI self-review  
**Scope**: Phase 4 dark entry screen and guided route shell  
**Status**: Not fully closed until Harsh runs the real 60-second human test.

## Test Method

I reviewed the opening page as if seeing it cold for no more than 60 seconds, using the questions from `docs/qa/reviewer-test-plan.md`:

- Who is this for?
- What problem is it about?
- Why did Harsh build it?
- What is the primary next action?

## Findings

**Who is this for?**  
The opening uses "For Comena / From Harsh" in the first viewport. It is framed as a continuation of the email, which should make sense to a reviewer arriving from Harsh's message.

**What problem is it about?**  
The first screen does not explain the full problem yet. It creates curiosity and shows a small animated order-line hint with a raw customer line turning into "match found, review needed." The detailed product explanation is deferred to the prototype route.

**Why did Harsh build it?**  
The page signals that Harsh built something after the email, then lets the product route carry the explanation. This is lighter than the previous version and should be tested with a real reviewer to make sure it is still explicit enough.

**What is the primary next action?**  
The `Show me` button is the dominant action in the first screen. It routes to `/prototype` in one click.

## Pass Signals

- Comena appears in the first viewport.
- The page does not open with a resume or full biography.
- The primary action routes to the product route.
- The first screen has no visible navigation fighting the main action.
- Deeper routes use simple labels: What I built, How it works, Why me, Next step.
- Deeper routes now continue the warm dark-brass entry theme instead of switching into a normal light SaaS shell.
- Narrative fallback state components exist for loading, empty, error, and partial content, but are not displayed as a landing-page gallery.
- The route shell is guided but non-linear after the entry screen.
- Copy avoids live backend claims and marks the route shell as v0 where needed.

## Gaps And Risks

- The prototype route is only a route-ready shell until Phase 5 builds the product workbench.
- The How it works, Why me, and Next step routes are placeholders until later phases.
- The state components are not yet connected to real link checks or data-loading behavior.
- A real reviewer may still expect product UI immediately after clicking `Show me`; Phase 5 should be prioritized next.
- The entry is intentionally playful. A real reviewer should confirm it still feels credible and not vague.
- The left rail is clearer now, but should still be checked by an actual user for hover and mobile menu comfort.

## Recommendation

Harsh should run the real 60-second first impression test before T039 is checked. Ask one person, or run it cold yourself, and confirm they can answer:

1. This is for Comena or Comena-like industrial order automation.
2. The page is asking them to inspect what Harsh built.
3. Harsh built it as candidate proof after the email.
4. The main action is to click `Show me`.
