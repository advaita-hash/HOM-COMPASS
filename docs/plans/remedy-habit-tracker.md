# Plan: Remedy-of-the-Day habit tracker and class scoreboard

Status: **proposed. Nothing in this plan is built.** Phase 1 runs only inside
HOM-COMPASS, on the student's device. Phases 2 and 3 add new tables and
functions to the Common Room database (Supabase project
`iltosbkrqufpjprxbnmz`). That database is shared with the live Common Room app
and the gym app, so nothing is applied there until the owner approves
Appendix A and it passes the tests on a Supabase branch.

This version incorporates two reviews of the first draft: a security review
of the database design and a product review of the habit and motivation
design.

## In one minute

- Each day the app shows one Boericke remedy. This part is built: every one
  of the 640 remedies appears once per 640-day cycle.
- **Phase 1 (on the phone only):** at the end of the remedy page the student
  taps **Done** and can add a one-line takeaway to their notes. The dashboard
  shows whether today is done. A gentle streak counts days in a row, with
  room for missed days, exams and travel. The next day, the app asks what
  they remember from yesterday's remedy.
- **Phase 2 (with classmates):** students can join a weekly class board
  showing "days studied this week, out of 7". Joining is voluntary. The board
  shows no streaks, no study times and no zero scores, and the bottom half
  has no rank numbers. Faculty see only the class total. There is one
  optional daily reminder.
- **Phase 3 (later):** recall practice without points, quiet milestone
  badges, monthly personal stats, Hindi and Marathi text.
- **Privacy:** classmates see only a name, a colour and a weekly count. Notes,
  patients and clinical data are never shared.
- **Owner decisions:** the list at the end gives a proposed default for each.

## Principles

- The streak should count study, not app opens, so the Done control goes
  after the content.
- Encourage, never shame. Missed days are expected. The board is weekly and
  cooperative, not an attendance register.
- Use a scholarly tone: no flames, confetti, podiums or "streak lost" messages.
- The server is the source of truth for scores. The device is the source of
  truth for personal history.
- New database objects only. The one exception is a single trigger on
  Common Room's `group_members`, which the owner must approve.

---

## Phase 1: Personal habit (on-device, no account)

Works offline, needs no sign-in, and is included in the existing backup file.
About 2–3 days including tests.

### 1.1 The Done control (the habit action)

- It goes at the **end** of the Remedy of the Day page, after the drug picture
  (`DrugPictureView`) and the book links (`BookCrossLinks`). It is not under
  the lede.
- When the chapter is opened from Remedy of the Day (`?from=rotd`), the same
  control also appears at the end of the Boericke chapter.
- The control is **"Done: one thing I'll remember"**, with an optional
  one-line input. If the student types a takeaway, it is saved as a general
  note on that remedy in the existing notepad (`useNotepad().add(...)`, and
  it then shows in `useRemedyPad(remedy)`). A plain **Mark done** button
  without a note is always available.
- After tapping, a quiet confirmation shows "Day 12 ✓", and tomorrow's remedy
  is revealed in the same card ("Tomorrow: Thuja"). This uses the existing
  "Tomorrow" teaser.
- Undo is allowed the same day and the next day.
- The app does not gate on reading time or on opening the full chapter. Short
  chapters are already shown in full, and timers are easy to game and
  annoying.

### 1.2 The cue (on the dashboard)

- The dashboard hero changes state: **"Today's remedy · not studied yet"**
  becomes **"Studied ✓ · Tomorrow: X"**. The hero stays a single link with no
  controls inside it.
- The page title shows a small dot until today is done.
- A separate **streak card** sits below the hero. It could replace the
  placeholder "Repertory chapters: —" stat card. The card shows:
  - the main number, **days studied this month**;
  - the current streak and best streak;
  - a 7-day strip;
  - a link that opens the study log as a sheet (a month calendar plus
    "this cycle: 37 of 640").
- Day 1 shows a one-line coach mark on the remedy page: "Study one remedy a
  day. Tap Done at the end."

### 1.3 Forgiving streak rules

- **Counted day:** the day's remedy was marked done on that day, or on the
  next day (a 1-day grace).
- **Automatic rest day:** one missed day in any rolling 7 days does not break
  the streak. There is nothing to earn or spend. Two missed days in a row
  always break it. A rest day keeps the streak alive but does not add to it.
- **Pause (exams or travel):** a toggle that freezes the streak for up to 14
  days, once per calendar month. Paused days count as neither studied nor
  missed. A pause starts today and cannot be applied to past days. It ends
  early when the student marks a day done.
- **Today not yet done** never breaks the streak. The streak is shown as of
  yesterday until today is marked.
- **When a streak breaks:** never show "Streak lost". Show "Welcome back · 9
  days studied this month", and keep "Best streak" visible.

### 1.4 Catch-up rules

- Any past day in the current 640-day cycle can be marked **"Caught up"**. On
  earlier days the button reads "Mark as caught up", not "Done".
- Caught-up days count for **cycle coverage** ("37 of 640") and the **personal
  total**.
- They **never** count for the streak, the class board or any points.
- Caught-up entries stay on the device. They are never uploaded to the board.

### 1.5 Yesterday-recall card (the reward)

- If yesterday was studied, the dashboard shows a card: **"Yesterday:
  Pulsatilla. What do you remember?"**
- Tapping **Show** reveals 3 short lines drawn from that remedy's `distill()`
  output, taken in turn from mind, generals, and worse/better. It also shows
  the student's own takeaway note, if there is one.
- The student rates themselves **Knew it / Partly / Forgot**. The rating is
  stored on yesterday's entry and is used only for personal stats. It earns
  no points.
- This is spaced retrieval built from existing code, and it makes the habit
  about learning rather than the counter.

### 1.6 Data

There is a new store, `hom-compass.study-log`. It uses zustand and
`safeStorage`, is versioned, is validated on load, and is included in the
existing backup and restore.

```ts
interface StudyEntry {
  day: string;          // "2026-10-28": local calendar date of the remedy (what pickDaily uses)
  slug: string;         // Boericke chapter, e.g. "oophorinum"
  markedAt: string;     // device ISO time the control was pressed
  kind: 'on-time' | 'caught-up'; // on-time = marked on its day or the next day
  withNote: boolean;    // a takeaway was written (for the "meaningful marks" metric)
  recall?: 'knew' | 'partly' | 'forgot'; // set by the next day's recall card
  sync?: 'pending' | 'synced' | 'personal'; // Phase 2 only; 'personal' = never uploaded
}
interface StudyPause { from: string; to: string } // inclusive local dates
```

Streaks, totals and coverage are computed from the entries. Nothing derived
is stored.

**Prerequisite:** `pickDaily` must sort slugs by code point rather than
`localeCompare`. Otherwise the remedy depends on the browser's language (the
ROTD review found this for lt/lv/cs/sk/et/cy). Done in commit 0bd3207.

### 1.7 Accessibility requirements

- The Done control is a toggle with `aria-pressed`. A polite live region
  announces "Marked done. Day 12."
- The 7-day strip has a text equivalent, for example "Studied 5 of the last 7
  days", and each day has an `aria-label`.
- The calendar is a grid with a label on each day. It shows a check for
  studied days and a dot for rest or paused days, so colour is not the only
  signal.
- Tap targets are at least 44 px. Milestone motion respects
  `prefers-reduced-motion`. Haptics (`navigator.vibrate`) are optional and
  used only where supported.
- Text must meet a contrast of at least 4.5:1, including on the dashboard
  hero gradient.

### 1.8 Tests (unit)

Streak maths at:
- month and year boundaries;
- daylight-saving changes;
- the grace day;
- a rest day, two missed days in a row, and a rest day inside a pause;
- a pause that ends early;
- a catch-up next to a streak (it must not join the streak);
- a tab left open past midnight.

### 1.9 Metrics (Phase 1)

Phase 1 is local-only and sends nothing, so it is measured in the Phase 2
pilot and through feedback from the pilot class. No hidden telemetry.

- **Habit:** % of students who mark at least once and are still studying 4 or
  more days a week in week 4.
- **Meaning:** share of marks made with a takeaway note. Target above 40%.
- **Learning:** "Knew it" rate on recall cards.
- **Comeback:** studies again within 7 days of a broken streak.

---

## Phase 2: Weekly class board (Common Room accounts)

About 4–5 days for the board, sync and migration tests, plus about 2 days for
reminders. Run it as a **pilot with 1 or 2 class groups for 4 weeks** before
opening it to everyone.

HOM-COMPASS already signs students in with their Common Room account (for
remedy notes). The board reuses those accounts and Common Room's existing
class groups (`groups`, `group_members`, join codes through `join_group`).

### 2.1 What the board shows

- **One board per group: this week (Monday to Sunday), "days studied out of
  7".** There is no monthly or all-time ranking. Those are personal stats only.
- **Shared ranks:** students with equal days share a rank (for example 1, 1,
  3). There are **no tie-breaks**, and study times are never used or shown.
  Students with the same rank are listed alphabetically.
- **No public streaks.** A student's streak is visible only to that student.
- **Rows with 0 days are hidden.** The student's own row always shows.
- **Rank numbers appear only in the top half.** Rows in the bottom half,
  including the student's own, show "4 of 7 days" without a rank.
- **Everyone with 7 of 7 days gets a "7/7 week" mark.** There is no podium.
- **Cooperative headline:** "Class today: 18 of 42 studied" and "Class week:
  210 of 294 remedy-days". The weekly goal defaults to 5 days per opted-in
  student.
- **"Last week" is plain text,** for example "Last week: 9 classmates studied
  all 7 days". It is computed live, with no stored results table. The gym
  pact's `gym_week_results` table is not a model to copy, because clients can
  write any row in it.
- **No notifications about other people.** For example, never "Priya
  overtook you".

### 2.2 Who is on it and who can see it

- **Opt-in per group, off by default.** The app asks only after **3 studied
  days**: "Study with your class? Classmates see only your name and days this
  week."
- **Reciprocity:** individual rows are visible only to members who have
  opted in themselves.
- **Minimum group size:** individual rows appear only when **at least 4
  members have opted in**. Below that, everyone sees "2 of 4 needed: invite
  your class".
- **Faculty see the class total only.** Common Room has no faculty role
  (`group_members.role` is only `admin` or `member`), so this works through
  reciprocity. Faculty do not opt in, so they see only the class total. See
  the decisions list for the remaining gap.
- **Class total:** any group member can see it, but it counts **opted-in
  students only**. It shows numbers only when at least 4 have opted in.
- **Leaving a group** removes the opt-in for that group. Rejoining requires
  opting in again.
- **Deleting the account** deletes everything. **"Delete my study history"**
  in settings deletes all synced log rows and opt-ins.

### 2.3 Invites

- When the group is too small to show a board: "You're the first. Invite your
  class."
- The invite is a WhatsApp share (`https://wa.me/?text=…`) of the group's
  Common Room join code, prefilled in the student's language. Joining still
  goes through Common Room's rate-limited `join_group`.

### 2.4 Days, time zones and sync

- **Logging day = the student's local remedy date.** This is the date
  `pickDaily` uses. Logging is checked against the client's UTC offset inside
  the server function (Appendix A).
- **Week rollover:** "this week" on the board changes at **Monday 00:00 India
  time**. Each row counts study dates from Monday to Sunday.
- **Server schedule is the source of truth when signed in.** The app fetches
  the server's remedy for today and the next few days. It uses the local
  algorithm only offline. The server works out the remedy from the date
  (the client sends only the date), so the slugs cannot disagree.
- **Offline sync:** on-time entries are queued on the device. They upload
  when the phone is back online, if the day is **up to 3 days back** (local).
  Older unsynced entries become personal-only (`sync: 'personal'`) and are
  never dropped. Days waiting to upload show "Waiting to sync". If the
  upload fails, the app shows a non-blaming "Couldn't sync" message and keeps
  the entry.
- **Honour system:** the server records the time it received each entry. It
  cannot verify device time or prove reading. The stakes are classmates, not
  prizes.
- **Undo** reaches the server only for today and yesterday (local).
- **Two devices:** the app merges by taking the union of days and keeping the
  earliest `markedAt` locally. The student's own synced rows are readable for
  this.
- **Local history from before sign-in** stays personal. It is never
  bulk-uploaded.

### 2.5 One daily reminder

- **Off by default.** The student chooses a time. The proposed default is
  7:30 pm in the student's time zone, with quiet hours from 10 pm to 7 am.
- **At most one reminder a day.** It is skipped if today is already done.
  Tapping it opens `/remedy-of-the-day`.
- **HOM-COMPASS owns it:** it has its own push subscription table, sender and
  keys (Appendix A, migration B). Common Room's `push_subscriptions` cannot be
  reused. Those subscriptions belong to Common Room's origin and service
  worker. Its assignment cron job would also start pushing to HOM-COMPASS,
  and `reminder_log` only works for assignments.
- **iOS:** web push works only after the app is added to the home screen. The
  settings page says so.
- **Loss-framed wording** ("Keep your 12-day run going") is used at most once
  per streak, never repeated.

### 2.6 Language

- New strings (about 30) go through a small string table from the start, so
  Hindi and Marathi can be added (Phase 3) without rework.
- Numbers and dates are formatted with `Intl` in the user's locale.
- Long and Devanagari names are cut off with an ellipsis, and the full name
  is kept in `title` and `aria-label`.

### 2.7 Metrics and guardrails

Metrics are computed by the owner from aggregates, not shown in the app.

- **Board effect:** change in weekly study days per student after opting in
  compared with before.
- **Guardrails:**
  - board opt-out rate (alarm above 15%). Opting out deletes the opt-in row,
    so this needs `remedy_board_optin_events` (append-only, written by the
    opt-in/opt-out RPCs, readable only by the service role) or a pilot survey;
  - notification-disable rate;
  - comeback rate.
- **Pilot exit:** keep the board if opt-outs stay below 15% and the week-4
  habit rate is no worse than in classes without the board.
- The Phase 1 "meaning" and "learning" numbers stay on the device, so during
  the pilot they come from a short survey, not from the database.

---

## Phase 3: Keeping it going (later)

About 2–3 days.

- **Recall without points:** self-check cards drawn from `distill()` fields
  (mind, generals, worse/better). They are not graded multiple choice and earn
  no points, only a personal "recalled ✓✓" mark. If graded questions are ever
  added, a person must review them for each remedy, and they must be
  versioned.
- **Badges with a scholarly tone:**
  - 7, 30 and 100 days studied;
  - "7/7 week";
  - "Full cycle" for all 640 remedies.
  
  They use a small book or leaf mark with no confetti, and they are personal
  only.
- **Monthly personal stats:** days per month, coverage, the recall "Knew it"
  rate and best streak. There is no monthly ranking.
- **Hindi and Marathi** for all habit and board strings and the reminder
  text. A native speaker reviews the tone.

---

## Appendix A: Proposed Common Room migrations (draft, not applied)

**Rules for applying:**
- The owner approves the migrations.
- They are applied first on a **Supabase branch**, and every test in A.7
  must pass there.
- Then they are applied to production.
- The approved files are committed to the repo that owns Common Room's
  migration history, and a copy goes in HOM-COMPASS. Otherwise the next
  Common Room `db push` or branch reset would drift.

**Facts confirmed read-only from the live catalog (2026-10-28):**
- `public.is_member(gid uuid) returns boolean` is `STABLE SECURITY DEFINER`.
  It checks `group_members` for `auth.uid()`. Only `authenticated` and
  `service_role` can execute it.
- `group_members` has primary key `(group_id, user_id)` and `role in
  ('admin','member')`. It has a `BEFORE DELETE OR UPDATE OF role` trigger,
  `keep_one_admin`.
- The project's default privileges grant new **tables** `arwdDxtm` and new
  **functions** `EXECUTE` **directly to `anon` and `authenticated`**.
  Revoking from `public` alone is therefore not enough, and every object
  below revokes explicitly.
- `pg_cron` and `pg_net` are installed. `pgtap` is not, so install it on the
  branch only.

**Conventions used below:**
- Writes go only through `SECURITY DEFINER` RPCs that set the user, the
  remedy and the time on the server.
- Every function has `set search_path = ''` and fully qualified names.
- `auth.uid()` is wrapped as `(select auth.uid())` in policies.
- Every new table, function and trigger gets a `comment on … is 'HOM-COMPASS: …'`
  marking HOM-COMPASS as its owner (add these when the final SQL is written).

### A.1 Migration A: schedule and study log

```sql
-- Remedy schedule: server source of truth. Seeded by migration; no client writes.
create table public.remedy_daily_schedule (
  study_date    date primary key,
  remedy_slug   text not null check (remedy_slug ~ '^[a-z0-9-]{1,120}$'),
  book_checksum text not null check (book_checksum ~ '^[0-9a-f]{64}$')
);
comment on table public.remedy_daily_schedule is
  'HOM-COMPASS: Remedy of the Day schedule (owner: HOM-COMPASS).';
alter table public.remedy_daily_schedule enable row level security;
create policy "remedy_daily_schedule: read" on public.remedy_daily_schedule
  for select to authenticated using (true);

-- One row per student per day. Written only by log_remedy_study().
create table public.remedy_study_log (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  study_date  date not null,                         -- student's local remedy date
  remedy_slug text not null check (remedy_slug ~ '^[a-z0-9-]{1,120}$'),
  studied_at  timestamptz not null default now(),    -- set by the server, never by the client
  constraint remedy_study_log_pkey primary key (user_id, study_date)
);
comment on table public.remedy_study_log is
  'HOM-COMPASS: remedy study log (owner: HOM-COMPASS). Writes via RPC only.';
alter table public.remedy_study_log enable row level security;
create policy "remedy_study_log: read own" on public.remedy_study_log
  for select to authenticated using (user_id = (select auth.uid()));
-- No insert/update/delete policies: all writes go through the RPCs below.

-- Pure date helper so boundaries can be tested with a fixed p_now.
-- Returns null for an offset outside real-world UTC-12:00 .. UTC+14:00.
create function public.remedy_local_today(p_utc_offset_min int, p_now timestamptz default now())
returns date
language sql stable
set search_path = ''
as $$
  select case
    when p_utc_offset_min between -720 and 840
    then ((p_now at time zone 'UTC') + make_interval(mins => p_utc_offset_min))::date
  end
$$;

-- Log a day. The client sends only the date and its UTC offset (minutes east of UTC).
-- Accepts local today and up to 3 days back (offline sync). Duplicate = no-op.
create function public.log_remedy_study(p_date date, p_utc_offset_min int)
returns table (study_date date, remedy_slug text, studied_at timestamptz)
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_today date := public.remedy_local_today(p_utc_offset_min);
  v_slug  text;
begin
  if v_uid is null then
    raise exception 'Sign in first' using errcode = '28000';
  end if;
  if v_today is null then
    raise exception 'Bad time zone offset' using errcode = '22023';
  end if;
  if p_date is null or p_date not between v_today - 3 and v_today then
    raise exception 'Only the last 3 days can be logged' using errcode = '22023';
  end if;

  select s.remedy_slug into v_slug
  from public.remedy_daily_schedule s
  where s.study_date = p_date;
  if v_slug is null then
    raise exception 'No remedy scheduled for %', p_date using errcode = 'P0002';
  end if;

  insert into public.remedy_study_log (user_id, study_date, remedy_slug)
  values (v_uid, p_date, v_slug)
  on conflict on constraint remedy_study_log_pkey do nothing;  -- named constraint avoids
                                                               -- clashing with OUT columns
  return query
    select l.study_date, l.remedy_slug, l.studied_at
    from public.remedy_study_log l
    where l.user_id = v_uid and l.study_date = p_date;
end $$;

-- Undo: only local today or yesterday, matching the app's undo.
create function public.unlog_remedy_study(p_date date, p_utc_offset_min int)
returns boolean
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_today date := public.remedy_local_today(p_utc_offset_min);
  v_n     int;
begin
  if v_uid is null then
    raise exception 'Sign in first' using errcode = '28000';
  end if;
  if v_today is null then
    raise exception 'Bad time zone offset' using errcode = '22023';
  end if;
  if p_date is null or p_date not between v_today - 1 and v_today then
    raise exception 'Only today or yesterday can be undone' using errcode = '22023';
  end if;
  delete from public.remedy_study_log l
  where l.user_id = v_uid and l.study_date = p_date;
  get diagnostics v_n = row_count;
  return v_n > 0;
end $$;
```

What this allows: an honest client is exact. A dishonest client that lies
about its offset gains up to about 8.5 hours for an Indian student and at most
two calendar days in the worst case (offsets span −12 h to +14 h). It can never
log more than 3 days back, never a date beyond its claimed local day, and never
more than 7 days in a week. To tighten this, accept only the user's stored or
last-seen offset.

### A.2 Migration A: opt-in, cleanup on leaving, history deletion

```sql
create table public.remedy_board_optin (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  group_id   uuid not null references public.groups(id)   on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, group_id)
);
comment on table public.remedy_board_optin is
  'HOM-COMPASS: per-group scoreboard opt-in (owner: HOM-COMPASS).';
create index remedy_board_optin_group_idx on public.remedy_board_optin (group_id, user_id);
alter table public.remedy_board_optin enable row level security;
create policy "remedy_board_optin: read own" on public.remedy_board_optin
  for select to authenticated using (user_id = (select auth.uid()));
create policy "remedy_board_optin: add own (member)" on public.remedy_board_optin
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_member(group_id));
create policy "remedy_board_optin: remove own" on public.remedy_board_optin
  for delete to authenticated using (user_id = (select auth.uid()));
-- No update policy or grant: to move groups, delete and insert.

-- Needs owner approval: the only change touching an existing Common Room table.
-- Leaving a group (or being removed by an admin) drops the opt-in, so rejoining
-- does not put the student back on the board without asking.
-- Runs AFTER delete, so the existing BEFORE trigger keep_one_admin is unaffected.
create function public.remedy_optin_on_leave()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  delete from public.remedy_board_optin o
  where o.user_id = old.user_id and o.group_id = old.group_id;
  return old;
end $$;
-- also on UPDATE: an admin can move a member row to another group or user
create trigger group_members_drop_remedy_optin
  after delete or update of group_id, user_id on public.group_members
  for each row execute function public.remedy_optin_on_leave();

-- "Delete my study history" (settings). Account deletion already cascades.
create function public.delete_my_remedy_history()
returns integer
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_n   int;
begin
  if v_uid is null then
    raise exception 'Sign in first' using errcode = '28000';
  end if;
  delete from public.remedy_study_log l where l.user_id = v_uid;
  get diagnostics v_n = row_count;
  delete from public.remedy_board_optin o where o.user_id = v_uid;
  return v_n;
end $$;
```

### A.3 Migration A: scoreboard and class total (aggregates only)

```sql
-- Weekly board. Returns 0 rows unless the caller is signed in, is a member of
-- p_group, has opted in to p_group, asks for this or last week (Monday, India
-- time), and at least 4 opted-in members remain. Lists only students who are
-- opted in AND still members. No user ids, no times, no streaks.
create function public.remedy_scoreboard(p_group uuid, p_week_start date)
returns table (display_name text, color text, days_this_week int, place int, is_me boolean)
language sql stable security definer
set search_path = ''
as $$
  with cur as (
    select d - (extract(isodow from d)::int - 1) as this_monday
    from (select (now() at time zone 'Asia/Kolkata')::date as d) t
  ),
  allowed as (
    select 1
    from cur
    where (select auth.uid()) is not null
      and public.is_member(p_group)
      and exists (select 1 from public.remedy_board_optin o
                  where o.group_id = p_group and o.user_id = (select auth.uid()))
      and p_week_start in (cur.this_monday, cur.this_monday - 7)
  ),
  board as (
    select gm.user_id
    from public.group_members gm
    join public.remedy_board_optin o
      on o.group_id = gm.group_id and o.user_id = gm.user_id
    where gm.group_id = p_group
      and exists (select 1 from allowed)
  ),
  totals as (
    select b.user_id, count(l.study_date)::int as days
    from board b
    left join public.remedy_study_log l
      on l.user_id = b.user_id
     and l.study_date between p_week_start and p_week_start + 6
    where (select count(*) from board) >= 4
    group by b.user_id
  ),
  ranked as (
    select t.user_id, t.days,
           rank() over (order by t.days desc)              as r,      -- shared ranks, no tie-break
           count(*) filter (where t.days > 0) over ()      as shown
    from totals t
  )
  select p.name,
         p.color,
         r.days,
         case when r.days > 0 and r.r <= ceil(r.shown / 2.0) then r.r::int end,  -- top half only
         r.user_id = (select auth.uid())
  from ranked r
  join public.profiles p on p.id = r.user_id
  where r.days > 0 or r.user_id = (select auth.uid())                          -- hide zero rows
  order by r.days desc, p.name;
$$;
comment on function public.remedy_scoreboard(uuid, date) is
  'HOM-COMPASS: weekly class board, aggregates only (owner: HOM-COMPASS).';

-- Class total. Any member may call it (faculty included). Counts opted-in
-- students only; numbers are null until at least 4 have opted in.
create function public.remedy_class_total(p_group uuid)
returns table (members int, opted_in int, studied_today int, week_days int, week_goal int)
language sql stable security definer
set search_path = ''
as $$
  with wk as (
    select d, d - (extract(isodow from d)::int - 1) as monday
    from (select (now() at time zone 'Asia/Kolkata')::date as d) t
  ),
  ok as (
    select 1 where (select auth.uid()) is not null and public.is_member(p_group)
  ),
  mem as (
    select gm.user_id from public.group_members gm
    where gm.group_id = p_group and exists (select 1 from ok)
  ),
  board as (
    select m.user_id from mem m
    join public.remedy_board_optin o on o.group_id = p_group and o.user_id = m.user_id
  ),
  n as (
    select (select count(*) from mem)::int as members,
           (select count(*) from board)::int as opted_in
  )
  select n.members,
         n.opted_in,
         case when n.opted_in >= 4 then
           (select count(*)::int from board b
              join public.remedy_study_log l on l.user_id = b.user_id
              cross join wk where l.study_date = wk.d) end,
         case when n.opted_in >= 4 then
           (select count(*)::int from board b
              join public.remedy_study_log l on l.user_id = b.user_id
              cross join wk where l.study_date between wk.monday and wk.d) end,
         case when n.opted_in >= 4 then n.opted_in * 5 end
  from n
  where exists (select 1 from ok);
$$;
```

Notes:
- Non-members, `anon` and unknown group ids all get 0 rows, so the functions
  do not reveal whether a group exists.
- The "studied today" figure uses the India date, which suits Indian
  classes.
- The finest detail shown is a weekly count for this week and last week. A
  classmate who checks every day could infer which days an opted-in student
  studied (the count and "studied today" are live). Only opted-in students are
  affected; showing "studied today" only from 8 opted-in members, or rounded,
  reduces this.

### A.4 Migration A: grants (this project's default ACLs grant anon directly)

```sql
revoke all on table public.remedy_daily_schedule,
                    public.remedy_study_log,
                    public.remedy_board_optin
  from anon, authenticated;
grant select on table public.remedy_daily_schedule to authenticated;
grant select on table public.remedy_study_log      to authenticated;  -- own rows via RLS
grant select, insert, delete on table public.remedy_board_optin to authenticated;

-- Internal helpers: nobody but the owner/service role.
revoke execute on function public.remedy_local_today(int, timestamptz),
                           public.remedy_optin_on_leave()
  from public, anon, authenticated;

-- Client RPCs: signed-in users only.
revoke execute on function public.log_remedy_study(date, int),
                           public.unlog_remedy_study(date, int),
                           public.delete_my_remedy_history(),
                           public.remedy_scoreboard(uuid, date),
                           public.remedy_class_total(uuid)
  from public, anon;
grant execute on function public.log_remedy_study(date, int),
                          public.unlog_remedy_study(date, int),
                          public.delete_my_remedy_history(),
                          public.remedy_scoreboard(uuid, date),
                          public.remedy_class_total(uuid)
  to authenticated;
```

### A.5 Schedule seed and checks

- A script (proposed: `scripts/remedy-schedule.mjs`) runs the app's
  `pickDaily` over `public/books/boericke.json` with the code-point slug sort.
  It writes a seed file (proposed: `supabase/seed/remedy_daily_schedule.sql`)
  with every date from **2026-01-01 to 2033-12-31**, about 2,900 rows, which
  covers more than four 640-day cycles.
- `book_checksum` is the SHA-256 of the code-point-sorted slug list joined
  with `\n`. All rows from one book version share it.
- The seed is applied by migration (service role), never by clients.
- **CI check (proposed vitest):**
  - regenerate the schedule from the current book data and fail on any
    difference from the committed seed file;
  - fail if the book's checksum differs from the seed's checksum;
  - fail if fewer than 365 future days remain.
- **If the book data ever changes:** dates already seeded keep their remedy,
  because the server is the source of truth. New dates are appended under a
  new checksum in a reviewed migration.
- **Optional:** a weekly `pg_cron` job that raises a warning in the logs when
  fewer than 90 future days remain.

### A.6 Migration B: reminders (separate, applied with Phase 2 reminders)

```sql
-- HOM-COMPASS's own web-push subscriptions (its own origin and service worker).
create table public.hom_push_subscriptions (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  -- only real push services, so the sender can't be pointed at arbitrary URLs
  endpoint   text not null check (
    char_length(endpoint) <= 1000 and endpoint ~ '^https://(fcm\.googleapis\.com|[a-z0-9.-]+\.push\.apple\.com|updates\.push\.services\.mozilla\.com|[a-z0-9.-]+\.notify\.windows\.com)/'
  ),
  p256dh     text not null check (char_length(p256dh) <= 200),
  auth       text not null check (char_length(auth) <= 100),
  created_at timestamptz not null default now(),
  primary key (user_id, endpoint)
);
alter table public.hom_push_subscriptions enable row level security;
create policy "hom_push_subscriptions: read own" on public.hom_push_subscriptions
  for select to authenticated using (user_id = (select auth.uid()));
create policy "hom_push_subscriptions: add own" on public.hom_push_subscriptions
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "hom_push_subscriptions: remove own" on public.hom_push_subscriptions
  for delete to authenticated using (user_id = (select auth.uid()));

create table public.remedy_reminder_prefs (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  enabled    boolean not null default false,
  remind_at  time not null default '19:30' check (remind_at between '07:00' and '21:59'),
  tz         text not null default 'Asia/Kolkata' check (char_length(tz) <= 64),
  lang       text not null default 'en' check (lang in ('en', 'hi', 'mr')),
  updated_at timestamptz not null default now()
);
alter table public.remedy_reminder_prefs enable row level security;
create policy "remedy_reminder_prefs: read own" on public.remedy_reminder_prefs
  for select to authenticated using (user_id = (select auth.uid()));

-- One reminder per student per local day; written only by the sender.
create table public.remedy_reminder_log (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  study_date date not null,
  sent_at    timestamptz not null default now(),
  primary key (user_id, study_date)
);
alter table public.remedy_reminder_log enable row level security;  -- no policies: service role only

-- Prefs are written through an RPC that validates the time zone name.
create function public.set_remedy_reminder(p_enabled boolean, p_remind_at time, p_tz text, p_lang text)
returns void
language plpgsql volatile security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in first' using errcode = '28000';
  end if;
  if not exists (select 1 from pg_catalog.pg_timezone_names z where z.name = p_tz) then
    raise exception 'Unknown time zone %', p_tz using errcode = '22023';
  end if;
  insert into public.remedy_reminder_prefs as r (user_id, enabled, remind_at, tz, lang)
  values (auth.uid(), p_enabled, p_remind_at, p_tz, p_lang)
  on conflict (user_id) do update
    set enabled = excluded.enabled, remind_at = excluded.remind_at,
        tz = excluded.tz, lang = excluded.lang, updated_at = now();
end $$;

revoke all on table public.hom_push_subscriptions,
                    public.remedy_reminder_prefs,
                    public.remedy_reminder_log
  from anon, authenticated;
grant select, insert, delete on table public.hom_push_subscriptions to authenticated;
grant select on table public.remedy_reminder_prefs to authenticated;
revoke execute on function public.set_remedy_reminder(boolean, time, text, text) from public, anon;
grant execute on function public.set_remedy_reminder(boolean, time, text, text) to authenticated;
```

**How reminders are sent:**
- A new `pg_cron` job (proposed name `hom-remedy-reminders`) runs every 15
  minutes and calls a new HOM-COMPASS edge function through `pg_net`. The call
  carries a shared secret kept in Supabase Vault; the function rejects any
  request without it.
- The edge function picks students who have reminders enabled and whose
  local time has passed `remind_at`. It skips anyone who already has a
  reminder-log row or a study-log row for their local date.
- It inserts the log row **before** sending, then pushes only to
  `hom_push_subscriptions`.
- It uses its own VAPID keys, stored as edge function secrets.
- It deletes subscriptions that return HTTP 404 or 410.
- Reminder-log rows older than 30 days are purged by the same job.
- **Common Room's `push_subscriptions`, `reminder_log` and its
  `common-room-due-reminders` job are not touched.**

### A.7 Tests to pass on a Supabase branch before production

Run these as pgTAP (`create extension pgtap` on the **branch only**) or as a
SQL script. Cases that call the date helper `remedy_local_today` with a fixed
`p_now` run as `postgres` (its EXECUTE is revoked from `authenticated`); every
other case runs in a transaction with:

```sql
set local role authenticated;
set local request.jwt.claims = '{"sub":"<uuid>","role":"authenticated"}';
```

Fixtures:
- users A to F;
- group G, where A to E are members and A to D opt in;
- group H, where F is the only member;
- one user acting as anon.

**Date window (call `remedy_local_today` with a fixed `p_now`):**
- Use offsets −720, 0, 330 and 840, at 23:59 and 00:01 local time on both
  sides of a date change. Include a month end and a year end.
- Offsets −721 and 841 return null. The RPC rejects them with "Bad time zone
  offset".

**Logging:**
- A logs local today and today−3: accepted.
- A logs today−4 and today+1: rejected.
- A duplicate log is a no-op, and the RPC returns the existing row.
- `studied_at` is the server time. No parameter can set it.
- A missing schedule row gives "No remedy scheduled", not a generic error.
- A direct `insert`, `update` or `delete` on `remedy_study_log` as
  authenticated fails with permission denied.
- B cannot select A's rows.
- Unlog works for today and yesterday, and is rejected for today−2.

**anon:**
- anon cannot select any new table.
- anon cannot execute any new function. This checks the default-ACL issue.

**Opt-in:**
- F opts in to G (not a member): rejected.
- An `update` of `group_id` is denied, because there is no grant.
- A leaves G: A's opt-in for G is deleted.
- An admin removes B from G: B's opt-in is deleted, and `keep_one_admin`
  still blocks removing the last admin.
- B rejoins with `join_group`: B is not opted in.
- Deleting group G cascades.

**Scoreboard:**
- It returns 0 rows for:
  - a non-member;
  - anon;
  - a random uuid;
  - a member who has not opted in (E);
  - a week start that is not this Monday or last Monday;
  - a group with only 3 opted-in members.
- It excludes members who have not opted in and members who left.
- It hides zero rows but always includes the caller's own row.
- Equal days share a place, and there is no place in the bottom half.
- Its output columns are exactly `display_name, color, days_this_week,
  place, is_me`. There is no user id, time or notes column.

**Class total:**
- Any member gets numbers when at least 4 have opted in, and nulls below
  that.
- A non-member gets 0 rows.

**Deletion:**
- `delete_my_remedy_history` removes only the caller's rows.
- Deleting an account cascades through profiles to every new table.

**Schedule:**
- The seed matches the JS output exactly, and the checksum matches.
- An authenticated user cannot insert into, update or delete from the
  schedule.

**Reminders (migration B):**
- The prefs RPC rejects an unknown time zone and a time inside quiet hours.
- A user cannot read another user's prefs or subscriptions.
- `remedy_reminder_log` cannot be accessed from the client.

**Regression:**
- Run `get_advisors(security)` and `get_advisors(performance)` on the
  branch. The only new findings should be the expected
  `authenticated_security_definer` notes for the intended RPCs.
- Diff the migration: it must contain only new objects plus the one approved
  trigger on `group_members`.
- Common Room's existing policies and functions must be unchanged.

---

## Decisions needed from the owner

Each decision has a proposed default. The plan above assumes these defaults.

1. **What counts as done.** *Proposed:* tapping Done at the end of the
   page. A takeaway note is encouraged, not required. There is no time gate
   and no quiz gate.
2. **Streak forgiveness.** *Proposed:* a 1-day grace, plus one automatic rest
   day in any rolling 7 days, plus a pause of up to 14 days once a month.
3. **Catch-up.** *Proposed:* any past day in the current cycle. It counts for
   coverage and the personal total only.
4. **Whose board.** *Proposed:* existing Common Room class groups, opt-in per
   group, offered after 3 studied days. Common Room's `groups` table has no
   type column, so any group (not only a class) could host a board. Is that
   intended?
5. **Board format.** *Proposed:*
   - weekly "days of 7" only;
   - shared ranks, no tie-breaks, rank numbers in the top half only;
   - no public streaks, hidden zero rows;
   - a class goal of 5 days per opted-in student.
6. **Faculty visibility.** *Proposed:* faculty see the class total only.
   - Common Room has no faculty role, so this works by reciprocity: rows are
     visible only to members who opted in.
   - **Gap:** a faculty member who opts in and studies would see the rows,
     and would also appear on the board.
   - If that is not acceptable, the next step is a HOM-COMPASS table where
     group admins mark staff, and the functions exclude them.
7. **Minimum group size.** *Proposed:* 4 opted-in students before any
   individual rows appear.
8. **Where the board lives.** *Proposed:* in HOM-COMPASS first. A read-only
   Common Room widget could come later, after the pilot.
9. **Day boundary.** *Proposed:* logging uses each student's local remedy
   date, and the board week rolls over at Monday 00:00 India time.
10. **Offline window.** *Proposed:* uploads accepted up to 3 days back. Older
    days stay personal.
11. **Reminders.** *Proposed:*
    - one a day, off by default, 7:30 pm by default;
    - quiet hours 10 pm to 7 am;
    - sent by HOM-COMPASS's own push setup, not Common Room's.
12. **Data retention and deletion.** *Proposed:*
    - study logs are kept while the account exists;
    - "Delete my study history" is in settings;
    - deleting the account deletes everything;
    - reminder logs are purged after 30 days;
    - local data stays on the device and in the student's own backups.
13. **Language.** *Proposed:* English in Phase 2, using a string table.
    Hindi and Marathi come in Phase 3, reviewed by a native speaker. The
    alternative is to ship them with the Phase 2 pilot if the pilot class
    prefers.
14. **Changes to the shared database.** *Proposed:*
    - approve migration A (new objects plus one trigger on `group_members`)
      and, later, migration B;
    - keep the `remedy_*` / `hom_*` names, with owner comments on each object;
    - commit the migrations to Common Room's migration history as well.
15. **Pilot.** *Proposed:* 1 or 2 class groups for 4 weeks, with the success
    and guardrail metrics above, before opening the board to all groups.
