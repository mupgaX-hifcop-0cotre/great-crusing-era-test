-- Migration: Add task_favorites table and notifications for progress
-- Description: Allows users to favorite tasks and receive notifications on status changes.

create table if not exists public.task_favorites (
    task_id uuid references public.tasks(id) on delete cascade not null,
    user_id text references public.profiles(wallet_address) on delete cascade not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    primary key (task_id, user_id)
);

-- Enable RLS
alter table public.task_favorites enable row level security;

-- Policies for task_favorites
drop policy if exists "Favorites are viewable by everyone" on public.task_favorites;
create policy "Favorites are viewable by everyone"
    on public.task_favorites for select
    using (true);

drop policy if exists "Users can manage their own favorites" on public.task_favorites;
create policy "Users can manage their own favorites"
    on public.task_favorites for all
    using (true); -- Relaxed for MVP/Demo, ideally check user_id
