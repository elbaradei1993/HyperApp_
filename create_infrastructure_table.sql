-- Infrastructure Reports System
create table if not exists public.infrastructure_reports (
  id bigint generated always as identity primary key,
  latitude decimal(10,8) not null,
  longitude decimal(11,8) not null,
  report_type text not null check (report_type in ('streetlight', 'sidewalk', 'construction', 'pothole', 'traffic', 'other')),
  description text not null,
  severity text default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  user_id text default 'anonymous',
  status text default 'reported' check (status in ('reported', 'investigating', 'resolved', 'dismissed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes for infrastructure reports
create index if not exists infrastructure_reports_location_idx on public.infrastructure_reports(latitude, longitude);
create index if not exists infrastructure_reports_type_idx on public.infrastructure_reports(report_type);
create index if not exists infrastructure_reports_status_idx on public.infrastructure_reports(status);
create index if not exists infrastructure_reports_created_at_idx on public.infrastructure_reports(created_at desc);

-- Row Level Security for infrastructure reports
alter table public.infrastructure_reports enable row level security;

-- Allow anyone to read infrastructure reports (public data)
drop policy if exists infrastructure_reports_select_all on public.infrastructure_reports;
create policy infrastructure_reports_select_all on public.infrastructure_reports
  for select to authenticated, anon
  using (true);

-- Allow authenticated users to insert infrastructure reports
drop policy if exists infrastructure_reports_insert_authenticated on public.infrastructure_reports;
create policy infrastructure_reports_insert_authenticated on public.infrastructure_reports
  for insert to authenticated
  with check (true);

-- Allow anonymous inserts for infrastructure reports (with rate limiting considerations)
drop policy if exists infrastructure_reports_insert_anon on public.infrastructure_reports;
create policy infrastructure_reports_insert_anon on public.infrastructure_reports
  for insert to anon
  with check (true);
