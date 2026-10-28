# Plan: Remedy-of-the-Day habit tracker and multiplayer scoreboard

Status: **planned, not built.** Phase 1 can be built inside HOM-COMPASS alone.
Phases 2–3 add tables to the Common Room database (Supabase project
`iltosbkrqufpjprxbnmz`), which is shared with the Common Room app. Nothing is
changed there until the owner approves the migration in Appendix A.

## Goal

Make studying one remedy a day a habit, then let classmates keep each other
going with a shared scoreboard.

- Every day the app shows one of Boericke's 640 remedies (built: each
  remedy appears once per 640-day cycle, chosen by local calendar date).
- The student marks it **Studied** once they have read it.
- The app keeps a **streak** (days in a row) and a **calendar** of studied days.
- Students who opt in appear on a **scoreboard** for their class group, with
  weekly, monthly and all-time views.

## Phase 1 — Personal habit tracker (this device only)

No account needed; works offline; included in the existing backup file.

**What the student sees**

- Remedy of the Day page: a **Mark as studied** button under the remedy. After
  tapping, it turns into "Studied today ✓" with the current streak. It can be
  undone the same day.
- A small **streak card** on the Dashboard: current streak, best streak and
  a 7-day strip of ticks.
- A **Study log** page: a month calendar (studied days filled in), current and
  best streak, total remedies studied, and "this cycle: 37 of 640".
- Earlier days (already browsable with the ‹ › buttons) show whether that day
  was studied, and can be marked **late** within the grace window (below).

**Rules (proposed — see decisions)**

- One remedy per calendar day; the day is the device's local date.
- A day counts for the streak if it was marked on that day, or within a
  1-day grace (catch up yesterday's remedy this morning). Later catch-ups count
  towards the total but not the streak.
- Streak = consecutive counted days ending today or yesterday.

**Data** — a new store `hom-compass.study-log` (zustand + `safeStorage`,
versioned, validated on load, exported and restored by the existing backup):

```ts
interface StudyEntry {
  day: string;        // "2026-10-28" (local calendar date of the remedy)
  slug: string;       // Boericke chapter, e.g. "oophorinum"
  studiedAt: string;  // ISO time the button was pressed
  late: boolean;      // marked after the grace window
}
```

Streaks and totals are computed from the entries; nothing derived is stored.

**Effort:** about 1–2 days including tests (streak maths is the part worth
unit-testing: month and year boundaries, daylight-saving changes, grace day).

## Phase 2 — Multiplayer scoreboard (Common Room accounts)

HOM-COMPASS already signs students in with their Common Room account (for
remedy notes). The scoreboard reuses those accounts and Common Room's existing
**class groups** (`groups`, `group_members`, join codes), so classmates are
already grouped.

**What the student sees**

- A **Scoreboard** page with a group picker (their Common Room groups) and
  tabs **This week · This month · All time**.
- Rows: rank, name and colour from their Common Room profile, current streak,
  days studied in the period. Top three get a podium; the student's own row
  is always visible ("You").
- **Opt-in:** "Show me on the scoreboard for this group" (off until switched
  on). Turning it off removes the student from that board immediately.
- When signed in, **Mark as studied** also syncs to Common Room. Local entries
  made before signing in are uploaded once (still subject to the date rules,
  so old days don't count for competitions).

**Scoring (proposed)**

- 1 point per remedy studied on its day (or within the grace day).
- Ties broken by current streak, then by who studied earlier that day.
- Weekly board resets every Monday (India time); the previous week's top
  three are kept as a small "last week" banner. This mirrors Common Room's gym
  pact (`gym_week_results`) so the two apps feel alike.

**Fairness and abuse**

- The server records the time; the client can only log **today** or
  **yesterday** (India time, ±1 day for travellers). Backfilling weeks is
  impossible.
- One entry per student per day (primary key), so tapping twice does nothing.
- The day's remedy is checked against a server-side schedule table, so a
  student can't log a different, easier remedy.
- Honest limit: the app can't prove someone *read* the remedy. Phase 3's
  optional quiz is the answer if that matters.

**Privacy**

- Only display name, colour, streak and counts are shared — never notes,
  patients or anything clinical.
- Scores are visible only to members of the same group, and only for students
  who opted in. Implemented with row-level security plus a `security definer`
  function that returns aggregates, so raw study logs are never readable by
  other students.
- Leaving a group or deleting the account removes the student from every board.

**Effort:** about 3–4 days: migration on a Supabase branch first, RLS tests
(another student can't read or write your log; non-members can't see a
group's board), the scoreboard UI, sync and offline handling.

## Phase 3 — Keeping it going (optional)

- **Daily reminder** at a chosen time, using Common Room's existing push
  notifications (`push_subscriptions`); skipped if already studied.
- **Badges**: 7-day, 30-day and 100-day streaks; "full cycle" for all 640.
- **Quick check** (optional): three questions generated from the remedy's
  Boericke text (modalities, mind, keynote). Passing marks the day
  "Studied ✓✓" and could be worth 2 points.
- **Weekly recap** notification: your days, your rank, the group's streak.

**Effort:** about 2–3 days, the quiz being most of it.

## Decisions needed from the owner

1. **What counts as done:** just tapping "Studied", or opening the full chapter
   first, or passing the quick check?
2. **Grace day:** allow catching up yesterday's remedy for the streak (proposed),
   or strictly same-day only?
3. **Whose scoreboard:** existing Common Room class groups (proposed), a
   separate invite-code "study circle", or one global board?
4. **Scoring style:** weekly race with resets (proposed), monthly, or one
   long all-time table?
5. **Default visibility:** opt-in per group (proposed), or on by default for
   class members?
6. **Day boundary for competitions:** India time for everyone (proposed, fair
   resets), or each student's local midnight?

## Appendix A — Proposed Common Room migration (draft, not applied)

Applied only after approval, first on a Supabase branch, with RLS tests.

```sql
-- Daily schedule, generated by a script from the same algorithm as the app
create table public.remedy_daily_schedule (
  study_date  date primary key,
  remedy_slug text not null check (char_length(remedy_slug) between 1 and 120)
);
alter table public.remedy_daily_schedule enable row level security;
create policy "schedule readable by signed-in users" on public.remedy_daily_schedule
  for select to authenticated using (true);

-- One row per student per day
create table public.remedy_study_log (
  user_id     uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  study_date  date not null,
  remedy_slug text not null,
  studied_at  timestamptz not null default now(),
  primary key (user_id, study_date)
);
alter table public.remedy_study_log enable row level security;
create policy "read own log" on public.remedy_study_log
  for select to authenticated using (user_id = auth.uid());
create policy "log today or yesterday, matching the schedule" on public.remedy_study_log
  for insert to authenticated with check (
    user_id = auth.uid()
    and study_date between ((now() at time zone 'Asia/Kolkata')::date - 1)
                       and ((now() at time zone 'Asia/Kolkata')::date + 1)
    and remedy_slug = (select s.remedy_slug from public.remedy_daily_schedule s
                       where s.study_date = remedy_study_log.study_date)
  );
create policy "undo own entry" on public.remedy_study_log
  for delete to authenticated using (user_id = auth.uid());

-- Opt-in per group
create table public.remedy_board_optin (
  user_id  uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  primary key (user_id, group_id)
);
alter table public.remedy_board_optin enable row level security;
create policy "manage own opt-in" on public.remedy_board_optin
  for all to authenticated using (user_id = auth.uid()) with check (
    user_id = auth.uid()
    and exists (select 1 from public.group_members m
                where m.group_id = remedy_board_optin.group_id and m.user_id = auth.uid())
  );

-- Aggregates only, for members of the group, for opted-in students
create or replace function public.remedy_scoreboard(p_group uuid, p_from date, p_to date)
returns table (user_id uuid, name text, color text, days int, streak int, is_me boolean)
language sql stable security definer set search_path = public as $$
  -- returns nothing unless the caller belongs to p_group
  -- streak computed with gaps-and-islands over remedy_study_log
  ...
$$;
revoke all on function public.remedy_scoreboard(uuid, date, date) from public;
grant execute on function public.remedy_scoreboard(uuid, date, date) to authenticated;
```

The schedule table is filled for a year ahead by a small script that runs the
same deck-shuffle as `src/features/remedy/dailyRemedy.ts`, so the app, the
server and Common Room always agree on the day's remedy.
