-- Create ENUM for task_status if not exists
DO $$ BEGIN
    CREATE TYPE public.task_status AS ENUM ('voting', 'bidding', 'assigned', 'review', 'done');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create tasks table
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status task_status default 'voting'::task_status not null,
  story_points integer,
  final_reward integer,
  assignee_id text references public.profiles(wallet_address),
  creator_id text references public.profiles(wallet_address),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create task_votes table
create table if not exists public.task_votes (
  task_id uuid references public.tasks(id) not null,
  user_id text references public.profiles(wallet_address) not null,
  points integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (task_id, user_id)
);

-- Create task_bids table
create table if not exists public.task_bids (
  task_id uuid references public.tasks(id) not null,
  user_id text references public.profiles(wallet_address) not null,
  bid_amount integer not null,
  comment text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (task_id, user_id)
);

-- Enable RLS
alter table public.tasks enable row level security;
alter table public.task_votes enable row level security;
alter table public.task_bids enable row level security;

-- Policies for tasks
drop policy if exists "Tasks are viewable by everyone" on public.tasks;
create policy "Tasks are viewable by everyone"
  on public.tasks for select
  using ( true );

-- Admin only for insert/update. 
-- Assumption: Admin is determined by rank >= 100 or specific logic. 
-- Adjust the rank check as needed for your "Admin" definition.
drop policy if exists "Admins can insert tasks" on public.tasks;
create policy "Admins can insert tasks"
  on public.tasks for insert
  with check ( 
    exists (
      select 1 from public.profiles 
      where wallet_address = creator_id 
      and rank >= 2 
    )
  );

drop policy if exists "Admins can update tasks" on public.tasks;
create policy "Admins can update tasks"
  on public.tasks for update
  using ( 
    exists (
      select 1 from public.profiles 
      where wallet_address = tasks.creator_id 
      or rank >= 100 
    )
  );

-- Policies for task_votes
-- Insert: Rank 2+ users only.
drop policy if exists "Rank 2+ users can vote" on public.task_votes;
create policy "Rank 2+ users can vote"
  on public.task_votes for insert
  with check (
    exists (
      select 1 from public.profiles
      where wallet_address = user_id
      and rank >= 2
    )
  );

-- Select: Own votes only (to hide before open).
drop policy if exists "Users can view their own votes" on public.task_votes;
create policy "Users can view their own votes"
  on public.task_votes for select
  using (
    true
  );

-- Policies for task_bids
-- Insert: Rank 1+ users only.
drop policy if exists "Rank 1+ users can bid" on public.task_bids;
create policy "Rank 1+ users can bid"
  on public.task_bids for insert
  with check (
    exists (
      select 1 from public.profiles
      where wallet_address = user_id
      and rank >= 1
    )
  );

-- Select: Own bids only
drop policy if exists "Users can view their own bids" on public.task_bids;
create policy "Users can view their own bids"
  on public.task_bids for select
  using (
    true
  );

-- New columns for Recommendations
alter table public.profiles add column if not exists skills text[];
alter table public.tasks add column if not exists tags text[];

-- ==========================================
-- The Genesis Architecture Extensions
-- ==========================================

-- Enhanced Profiles Table
alter table public.profiles 
add column if not exists rank integer default 0, -- 0: Guest, 1: Crew, 2: Captain, 3: Admiral
add column if not exists avatar_metadata jsonb default '{}'::jsonb, -- Stores IPFS hash, animal type, item, etc.
add column if not exists archetype text, -- Wisdom, Vanguard, Charisma, Scout
add column if not exists avatar_url text, -- The permanent URL for the avatar image
add column if not exists nm_balance integer default 0;

-- New Table: Avatar Generations (The Awakening Log)
create table if not exists public.avatar_generations (
    id uuid primary key default gen_random_uuid(),
    user_id text references public.profiles(wallet_address) not null,
    status text not null default 'pending', -- pending, processing, completed, failed
    
    -- Diagnostic Data (The Oracle's Input)
    answers jsonb not null, -- e.g., { "q1": "A", "q2": "C", "q3": "B" }
    determined_archetype text,
    determined_animal text,
    
    -- Generation Results
    generated_prompt text,
    image_url text, -- Temporary storage or final URL
    
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    completed_at timestamp with time zone
);

-- RLS Policies for Avatar Generations
alter table if exists public.avatar_generations enable row level security;

drop policy if exists "Users can view their own generation stats" on public.avatar_generations;
create policy "Users can view their own generation stats"
    on public.avatar_generations for select
    using (user_id = auth.uid()::text);

-- Deadlines for Voting and Bidding
alter table public.tasks add column if not exists voting_ends_at timestamp with time zone;
alter table public.tasks add column if not exists bidding_ends_at timestamp with time zone;
alter table public.tasks add column if not exists bidding_duration integer default 2880; -- 48 hours in minutes

-- Notifications Table
create table if not exists public.notifications (
    id uuid primary key default gen_random_uuid(),
    user_id text references public.profiles(wallet_address), -- Specific user or NULL for all? For now specific to keep 'read' status simple.
    title text not null,
    message text,
    is_read boolean default false,
    link text, -- Action link
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table if exists public.notifications enable row level security;

drop policy if exists "Users can view own notifications" on public.notifications;
create policy "Users can view own notifications"
    on public.notifications for select
    using (user_id = auth.uid()::text);

drop policy if exists "Users/System can insert notifications" on public.notifications;
create policy "Users/System can insert notifications"
    on public.notifications for insert
    with check (true); -- Ideally restrict to System/Admin or triggers, but allowing client insert for now for MVP.

drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications"
    on public.notifications for update
    using (user_id = auth.uid()::text);
-- Completion Reports
alter table public.tasks add column if not exists completion_report text;
alter table public.tasks add column if not exists completion_link text;

-- 360 Evaluation Table
create table if not exists public.task_evaluations (
    id uuid primary key default gen_random_uuid(),
    task_id uuid references public.tasks(id) not null,
    evaluator_id text references public.profiles(wallet_address) not null,
    rating integer not null check (rating >= 1 and rating <= 5),
    comment text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(task_id, evaluator_id)
);

alter table if exists public.task_evaluations enable row level security;

drop policy if exists "Evaluations are viewable by everyone" on public.task_evaluations;
create policy "Evaluations are viewable by everyone"
    on public.task_evaluations for select
    using (true);

drop policy if exists "Users can submit evaluations" on public.task_evaluations;
create policy "Users can submit evaluations"
    on public.task_evaluations for insert
    with check (
        exists (
            select 1 from public.profiles
            where wallet_address = auth.uid()::text
            and rank >= 1
        )
    );
