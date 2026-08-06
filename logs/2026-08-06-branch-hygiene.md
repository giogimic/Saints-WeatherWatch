# 2026-08-06 — Branch hygiene

## Done
- Merged to `main`: ops A→F (#12–#17), Storm World Phase 4 (#18), Bag/Market (#19),
  discrete map HUD (#20), Storm World login-required leftover (#21)
- Deleted merged remote `giogimic/*` development branches after verifying
  `git merge-base --is-ancestor <branch> origin/main`
- **Never deleted `main`** — only `origin/main` + local `main` remain as the line of truth

## Rule going forward
After a PR merges, delete its head branch once the tip is an ancestor of `main`.
Keep unmerged work on its branch until landed.
