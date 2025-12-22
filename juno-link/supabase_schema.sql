-- Create profiles table with Zero-PII policy
create table public.profiles (
  wallet_address text not null primary key,
  username text,
  bio text,
  avatar_url text,
  rank integer default 0,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.profiles enable row level security;

-- Policy: Anyone can view profiles
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using ( true );

-- Policy: Users can insert their own profile
-- Note: In a real production app with Supabase Auth, you would check auth.uid()
-- For this Web3 specific demo without a custom JWT, we allow insert if the row doesn't exist.
-- Security Note: The backend/application layer should ideally verify the signature before calling Supabase,
-- or use a PostgreSQL function to verify signatures if passed as parameters.
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check ( true ); 

-- Policy: Users can update their own profile
-- This essentially relies on the composite key or application logic to restrict updates.
-- A stricter RLS would require a custom auth function or JWT claiming this address.
create policy "Users can update their own profile"
  on public.profiles for update
  using ( true )
  with check ( true );
