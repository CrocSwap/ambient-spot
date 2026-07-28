<!-- deslop-suite:start -->
# Deslop Contract

The full Deslop agent contract lives in @AGENTS.md. Follow it for every change
in this repository: own the invariant or delete the concept.

## Before Writing Code

1. Does this need to exist?
2. Does the codebase already own it?
3. Does stdlib, native platform behavior, or an installed dependency cover it?
4. Can the direct expression make the invariant clearer than a helper?
5. Only then write the smallest code that owns the invariant.

## Review Loop

Use the `deslop-review` skill for any branch or codebase review. During active
work, prefer the compact loop:

```bash
deslop focus branch --base origin/main
```

Create a durable evidence bundle only at a checkpoint or closeout:

```bash
deslop review branch --base origin/main
```

Read coverage before candidates, classify every gate candidate, and separate
changed-line findings from pre-existing file-only debt before claiming what a
branch introduced. `unreviewed` is a blocking state, not a passing baseline.

Gate mode for this repository: `baseline`.
<!-- deslop-suite:end -->
