# Kickoff Prompt — paste this into a fresh Claude Code session

> Copy everything inside the fenced block below. Paste it as the first message. The rest of this file is documentation about the prompt — don't paste this part.

---

```
You are the orchestrator for a UI-first build inside this repo:

  C:\Users\saman\OneDrive\Documents\data-365-projects\automation

Your first job is to read these two files in full, in order, before doing anything else:

  1. CLAUDE.md             — project map, ownership, rules, Do/Don't
  2. PROMPT_UI_BUILD.md    — full Phase 1 playbook (Stage 0, Stage 1, Stage 2)

After reading both, execute Stage 0 ONLY:

  - Bootstrap with create-t3-app into the existing empty directory shell
  - Set up the OneDrive node_modules junction (Stage 0.2 in the playbook)
  - Install deps, init shadcn/ui, add the listed primitives
  - Create the theme provider, design tokens (light + dark), mock fixtures,
    tRPC router skeleton, app shell (sidebar, top bar, theme toggle)
  - git init + initial commit at the end of Stage 0

STOP after the Stage 0 commit. Do NOT spawn subagents. Do NOT begin Stage 1.

Report back:

  - Files created (counts, no full listing)
  - pnpm install / shadcn init / typecheck output: pass/fail summary
  - Any deviations from the playbook and why
  - The exact command to run the dev server
  - A go/no-go on whether the project boots (open http://localhost:3000,
    confirm the dashboard shell renders, theme toggle works)

If anything fails, STOP and surface the error verbatim. Do not retry destructively.

Constraints (from CLAUDE.md — re-read if you forget):

  - Phase 1 is UI-only with mock data. No real APIs.
  - No Prisma, no NextAuth providers, no global state libs.
  - Frozen files (after Stage 0): src/components/ui/*, src/components/layout/*,
    src/components/providers/*, src/server/api/root.ts, src/server/mocks/*, src/lib/*.
  - Use pnpm. Node 20 LTS. TypeScript strict.
  - No `any`, no `// @ts-ignore` without comment, no console.log in commits.

After Stage 0 is committed and verified, wait for the human to say "go Stage 1"
before dispatching subagents.
```

---

## Why this prompt is short

The full playbook is in `PROMPT_UI_BUILD.md` (~900 lines). Pasting the whole thing into a session burns context, gives the agent permission to do everything at once, and makes it harder to catch mid-flight failures. This kickoff prompt does three things only:

1. Points the agent at the two files it needs to read.
2. Authorises **Stage 0 only** — bounded scope, ~30 minutes of work.
3. Hard-stops after the Stage 0 commit so a human can verify before the parallel subagents start.

## How to use it

1. Open a fresh Claude Code session in `C:\Users\saman\OneDrive\Documents\data-365-projects\automation`.
2. Paste the fenced block above as the first message.
3. Wait for the Stage 0 report.
4. Run `pnpm dev`, open `http://localhost:3000`, confirm the dashboard shell renders and the theme toggle works.
5. If it looks right, reply with: `go Stage 1`.

## What "go Stage 1" should look like (next prompt)

When you're ready for the parallel build, the follow-up prompt is also short. Something like:

```
Dispatch the 6 subagents from Stage 1 of PROMPT_UI_BUILD.md, each in its own
git worktree as specified. Run them in parallel. After all 6 commit their
branches, run Stage 2 (merge, typecheck, lint, axe, Lighthouse, screenshots).
Stop and report after Stage 2 is committed.

If any subagent fails or stalls, STOP the whole stage and surface the failure.
Do not partial-merge.
```

You can also run subagents in pairs (2 at a time) instead of all 6 at once if you want safer pacing. The playbook supports that — each agent's section is self-contained.

## What if Stage 0 fails?

Most likely causes and fixes:

| Symptom | Likely cause | Fix |
|---|---|---|
| `create-t3-app` refuses to write to non-empty dir | the `.gitkeep` files in the shell | Stage 0.1 has a fallback (write to `automation-tmp`, then `robocopy`) |
| `pnpm install` is slow or fails with file-locked errors | OneDrive sync grabbing files | Confirm the `node_modules` junction is in place before install |
| `mklink /J` says "Access is denied" | running as standard user with admin path | Junctions to `C:\dev\...` should not need admin; check that `C:\dev\` exists and is writable |
| `pnpm dlx shadcn-ui@latest init` asks unexpected questions | shadcn updated CLI prompts | Answer with the values listed in Stage 0.4. If new prompts appear, surface them — don't guess. |

## Don't paste the playbook itself

`PROMPT_UI_BUILD.md` is **read by the agent**, not pasted by you. The agent has Read access to it via the working directory. Pasting the playbook content into the chat wastes context and changes nothing.
