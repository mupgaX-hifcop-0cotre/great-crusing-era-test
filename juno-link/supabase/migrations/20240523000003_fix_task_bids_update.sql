-- Add UPDATE policy for task_bids to allow users to update their own bids
drop policy if exists "Users can update their own bids" on public.task_bids;
create policy "Users can update their own bids"
  on public.task_bids for update
  using (
    exists (
      select 1 from public.profiles
      where wallet_address = task_bids.user_id
      and rank >= 1
    )
  );
