-- User Verification System
alter table public.users add column if not exists verification_level text default 'basic'
  check (verification_level in ('basic', 'verified', 'trusted'));
alter table public.users add column if not exists verified_at timestamptz;
alter table public.users add column if not exists verification_badge_earned_at timestamptz;

-- Report Credibility System
alter table public.reports add column if not exists credibility_score decimal(3,2) default 0.5;
alter table public.reports add column if not exists validation_count integer default 0;
alter table public.reports add column if not exists last_validated_at timestamptz;

-- Report Validations Table (separate from regular votes)
create table if not exists public.report_validations (
  id bigint generated always as identity primary key,
  report_id bigint not null references public.reports(id) on delete cascade,
  user_id text not null references public.users(user_id) on delete cascade,
  validation_type text not null check (validation_type in ('confirm', 'deny')),
  created_at timestamptz not null default now(),
  unique (report_id, user_id)
);

-- Indexes for performance
create index if not exists report_validations_report_id_idx on public.report_validations(report_id);
create index if not exists report_validations_user_id_idx on public.report_validations(user_id);

-- Row Level Security for validations
alter table public.report_validations enable row level security;

-- Allow authenticated users to read all validations (for stats) but only manage their own
drop policy if exists report_validations_select_all on public.report_validations;
create policy report_validations_select_all on public.report_validations
  for select to authenticated
  using (auth.uid() is not null);

drop policy if exists report_validations_insert_own on public.report_validations;
create policy report_validations_insert_own on public.report_validations
  for insert to authenticated
  with check (user_id::text = auth.uid()::text);

drop policy if exists report_validations_update_own on public.report_validations;
create policy report_validations_update_own on public.report_validations
  for update to authenticated
  using (user_id::text = auth.uid()::text)
  with check (user_id::text = auth.uid()::text);

drop policy if exists report_validations_delete_own on public.report_validations;
create policy report_validations_delete_own on public.report_validations
  for delete to authenticated
  using (user_id::text = auth.uid()::text);

-- Function to update report credibility score
create or replace function public.update_report_credibility(report_id_param bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  confirm_count integer;
  deny_count integer;
  total_validations integer;
  user_rep_bonus decimal(3,2) := 0;
  time_penalty decimal(3,2) := 0;
  final_score decimal(3,2);
  reporter_rep integer;
  hours_old decimal(8,2);
begin
  -- Get validation counts
  select
    count(case when validation_type = 'confirm' then 1 end),
    count(case when validation_type = 'deny' then 1 end),
    count(*)
  into confirm_count, deny_count, total_validations
  from report_validations
  where report_id = report_id_param;

  -- Get reporter reputation (clamp to reasonable range)
  select coalesce(greatest(-100, least(1000, reputation)), 0) into reporter_rep
  from users u
  join reports r on r.user_id = u.user_id
  where r.id = report_id_param;

  -- Calculate user reputation bonus (-0.2 to +0.2)
  user_rep_bonus := (reporter_rep::decimal / 100) * 0.2;
  user_rep_bonus := greatest(-0.2, least(0.2, user_rep_bonus));

  -- Calculate time penalty (0.01 per hour, max 0.2)
  select extract(epoch from (now() - created_at)) / 3600 into hours_old
  from reports where id = report_id_param;

  time_penalty := least(hours_old * 0.01, 0.2);

  -- Calculate final credibility score
  if total_validations > 0 then
    -- Community validation bonus (-0.3 to +0.3)
    final_score := 0.5 +
                   user_rep_bonus +
                   ((confirm_count::decimal / total_validations) - 0.5) * 0.6 -
                   time_penalty;
  else
    -- No validations yet
    final_score := 0.5 + user_rep_bonus - time_penalty;
  end if;

  -- Clamp score between 0.1 and 0.9
  final_score := greatest(0.1, least(0.9, final_score));

  -- Update report
  update reports
  set
    credibility_score = final_score,
    validation_count = total_validations,
    last_validated_at = now()
  where id = report_id_param;

end;
$$;

-- Trigger to automatically update credibility when validations change
create or replace function public.trigger_update_credibility()
returns trigger
language plpgsql
as $$
begin
  -- Update credibility for the affected report
  perform update_report_credibility(
    case
      when TG_OP = 'DELETE' then OLD.report_id
      else NEW.report_id
    end
  );

  return case
    when TG_OP = 'DELETE' then OLD
    else NEW
  end;
end;
$$;

-- Create triggers
drop trigger if exists report_validations_insert_trigger on public.report_validations;
create trigger report_validations_insert_trigger
  after insert on public.report_validations
  for each row execute function public.trigger_update_credibility();

drop trigger if exists report_validations_update_trigger on public.report_validations;
create trigger report_validations_update_trigger
  after update on public.report_validations
  for each row execute function public.trigger_update_credibility();

drop trigger if exists report_validations_delete_trigger on public.report_validations;
create trigger report_validations_delete_trigger
  after delete on public.report_validations
  for each row execute function public.trigger_update_credibility();

-- Marketing Email System
-- Add marketing consent and preferences to users table
alter table public.users add column if not exists marketing_consent boolean default false;
alter table public.users add column if not exists marketing_preferences jsonb default '{
  "product_updates": true,
  "community_news": true,
  "safety_alerts": true,
  "weekly_digest": false,
  "language": "en"
}';
alter table public.users add column if not exists unsubscribed_at timestamptz;
alter table public.users add column if not exists last_email_sent_at timestamptz;

-- Email campaigns table
create table if not exists public.email_campaigns (
  id bigint generated always as identity primary key,
  name text not null,
  subject text not null,
  content_html text not null,
  content_text text,
  status text default 'draft' check (status in ('draft', 'scheduled', 'sending', 'sent', 'failed')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  recipient_count integer default 0,
  open_count integer default 0,
  click_count integer default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Email campaign recipients
create table if not exists public.email_recipients (
  id bigint generated always as identity primary key,
  campaign_id bigint references public.email_campaigns(id) on delete cascade,
  user_id text references public.users(user_id) on delete cascade,
  email text not null,
  status text default 'pending' check (status in ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained')),
  sent_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  error_message text,
  created_at timestamptz default now(),
  unique (campaign_id, user_id)
);

-- Magic link authentication tokens
create table if not exists public.auth_tokens (
  id bigint generated always as identity primary key,
  user_id text not null references public.users(user_id) on delete cascade,
  email text not null,
  token text not null unique,
  token_type text default 'magic_link' check (token_type in ('magic_link', 'password_reset')),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz default now(),
  unique (user_id, token_type)
);

-- Guardian System
-- Add guardian preferences to users table
alter table public.users add column if not exists guardian_emergency_contacts jsonb default '[]';
alter table public.users add column if not exists guardian_location_sharing boolean default false;
alter table public.users add column if not exists guardian_sos_enabled boolean default true;

-- Guardian relationships table
create table if not exists public.user_guardians (
  id bigint generated always as identity primary key,
  user_id text not null references public.users(user_id) on delete cascade,
  guardian_id text not null references public.users(user_id) on delete cascade,
  relationship_type text default 'guardian' check (relationship_type in ('guardian', 'emergency_contact')),
  location_sharing_enabled boolean default false,
  sos_alerts_enabled boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, guardian_id)
);

-- Guardian invitations table
create table if not exists public.guardian_invitations (
  id bigint generated always as identity primary key,
  inviter_id text not null references public.users(user_id) on delete cascade,
  invitee_email text not null,
  invitee_name text,
  invitation_token text not null unique,
  status text default 'pending' check (status in ('pending', 'accepted', 'expired', 'cancelled')),
  relationship_type text default 'guardian' check (relationship_type in ('guardian', 'emergency_contact')),
  location_sharing_enabled boolean default false,
  sos_alerts_enabled boolean default true,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by text references public.users(user_id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Guardian location sharing permissions
create table if not exists public.guardian_location_shares (
  id bigint generated always as identity primary key,
  guardian_relationship_id bigint not null references public.user_guardians(id) on delete cascade,
  shared_location jsonb, -- {latitude, longitude, accuracy, timestamp}
  shared_at timestamptz default now(),
  expires_at timestamptz -- optional expiration for temporary sharing
);

-- Guardian SOS alerts
create table if not exists public.guardian_sos_alerts (
  id bigint generated always as identity primary key,
  user_id text not null references public.users(user_id) on delete cascade,
  guardian_id text not null references public.users(user_id) on delete cascade,
  alert_type text not null check (alert_type in ('sos', 'emergency', 'check_in')),
  location jsonb, -- {latitude, longitude, accuracy}
  message text,
  status text default 'active' check (status in ('active', 'resolved', 'false_alarm')),
  created_at timestamptz default now(),
  resolved_at timestamptz,
  resolved_by text references public.users(user_id)
);

-- Indexes for performance
create index if not exists email_campaigns_status_idx on public.email_campaigns(status);
create index if not exists email_campaigns_scheduled_at_idx on public.email_campaigns(scheduled_at);
create index if not exists email_recipients_campaign_id_idx on public.email_recipients(campaign_id);
create index if not exists email_recipients_user_id_idx on public.email_recipients(user_id);
create index if not exists email_recipients_status_idx on public.email_recipients(status);

-- Row Level Security
alter table public.email_campaigns enable row level security;
alter table public.email_recipients enable row level security;

-- Allow authenticated admin users to manage campaigns
drop policy if exists email_campaigns_admin_all on public.email_campaigns;
create policy email_campaigns_admin_all on public.email_campaigns
  for all to authenticated
  using (auth.jwt() ->> 'role' = 'admin' or auth.uid() = created_by);

-- Allow authenticated users to read their own recipient records
drop policy if exists email_recipients_user_read on public.email_recipients;
create policy email_recipients_user_read on public.email_recipients
  for select to authenticated
  using (user_id::text = auth.uid()::text);

-- Guardian System Row Level Security
alter table public.user_guardians enable row level security;
alter table public.guardian_invitations enable row level security;
alter table public.guardian_location_shares enable row level security;
alter table public.guardian_sos_alerts enable row level security;

-- User guardians policies
drop policy if exists user_guardians_select on public.user_guardians;
create policy user_guardians_select on public.user_guardians
  for select to authenticated
  using (user_id::text = auth.uid()::text or guardian_id::text = auth.uid()::text);

drop policy if exists user_guardians_insert on public.user_guardians;
create policy user_guardians_insert on public.user_guardians
  for insert to authenticated
  with check (user_id::text = auth.uid()::text);

drop policy if exists user_guardians_update on public.user_guardians;
create policy user_guardians_update on public.user_guardians
  for update to authenticated
  using (user_id::text = auth.uid()::text or guardian_id::text = auth.uid()::text)
  with check (user_id::text = auth.uid()::text or guardian_id::text = auth.uid()::text);

drop policy if exists user_guardians_delete on public.user_guardians;
create policy user_guardians_delete on public.user_guardians
  for delete to authenticated
  using (user_id::text = auth.uid()::text);

-- Guardian invitations policies
drop policy if exists guardian_invitations_select on public.guardian_invitations;
create policy guardian_invitations_select on public.guardian_invitations
  for select to authenticated
  using (inviter_id::text = auth.uid()::text);

drop policy if exists guardian_invitations_insert on public.guardian_invitations;
create policy guardian_invitations_insert on public.guardian_invitations
  for insert to authenticated
  with check (inviter_id::text = auth.uid()::text);

drop policy if exists guardian_invitations_update on public.guardian_invitations;
create policy guardian_invitations_update on public.guardian_invitations
  for update to authenticated
  using (inviter_id::text = auth.uid()::text);

drop policy if exists guardian_invitations_delete on public.guardian_invitations;
create policy guardian_invitations_delete on public.guardian_invitations
  for delete to authenticated
  using (inviter_id::text = auth.uid()::text);

-- Guardian location shares policies
drop policy if exists guardian_location_shares_select on public.guardian_location_shares;
create policy guardian_location_shares_select on public.guardian_location_shares
  for select to authenticated
  using (
    exists (
      select 1 from user_guardians ug
      where ug.id = guardian_relationship_id
      and (ug.user_id::text = auth.uid()::text or ug.guardian_id::text = auth.uid()::text)
    )
  );

drop policy if exists guardian_location_shares_insert on public.guardian_location_shares;
create policy guardian_location_shares_insert on public.guardian_location_shares
  for insert to authenticated
  with check (
    exists (
      select 1 from user_guardians ug
      where ug.id = guardian_relationship_id
      and ug.user_id::text = auth.uid()::text
    )
  );

-- Guardian SOS alerts policies
drop policy if exists guardian_sos_alerts_select on public.guardian_sos_alerts;
create policy guardian_sos_alerts_select on public.guardian_sos_alerts
  for select to authenticated
  using (user_id::text = auth.uid()::text or guardian_id::text = auth.uid()::text);

drop policy if exists guardian_sos_alerts_insert on public.guardian_sos_alerts;
create policy guardian_sos_alerts_insert on public.guardian_sos_alerts
  for insert to authenticated
  with check (user_id::text = auth.uid()::text);

drop policy if exists guardian_sos_alerts_update on public.guardian_sos_alerts;
create policy guardian_sos_alerts_update on public.guardian_sos_alerts
  for update to authenticated
  using (user_id::text = auth.uid()::text or guardian_id::text = auth.uid()::text)
  with check (user_id::text = auth.uid()::text or guardian_id::text = auth.uid()::text);

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

-- Venue Verification System
create table if not exists public.verifiable_venues (
  id bigint generated always as identity primary key,
  name text not null,
  address text,
  latitude decimal(10,8) not null,
  longitude decimal(11,8) not null,
  category text default 'other' check (category in ('restaurant', 'bar', 'cafe', 'cinema', 'club', 'shop', 'other')),
  type text,
  verification_status text default 'unverified' check (verification_status in ('unverified', 'pending', 'verified', 'flagged')),
  verification_count integer default 0,
  last_verified timestamptz,
  safety_score decimal(3,1),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Venue verifications table (individual verification records)
create table if not exists public.venue_verifications (
  id bigint generated always as identity primary key,
  venue_id bigint not null references public.verifiable_venues(id) on delete cascade,
  user_id text not null references public.users(user_id) on delete cascade,
  lighting_score integer not null check (lighting_score between 1 and 10),
  security_score integer not null check (security_score between 1 and 10),
  cleanliness_score integer not null check (cleanliness_score between 1 and 10),
  accessibility_score integer not null check (accessibility_score between 1 and 10),
  staff_presence_score integer not null check (staff_presence_score between 1 and 10),
  overall_score decimal(3,1) not null,
  user_latitude decimal(10,8),
  user_longitude decimal(11,8),
  notes text,
  verified_at timestamptz default now()
);

-- Indexes for venue tables
create index if not exists verifiable_venues_location_idx on public.verifiable_venues(latitude, longitude);
create index if not exists verifiable_venues_category_idx on public.verifiable_venues(category);
create index if not exists verifiable_venues_verification_status_idx on public.verifiable_venues(verification_status);
create index if not exists verifiable_venues_verification_count_idx on public.verifiable_venues(verification_count desc);
create index if not exists venue_verifications_venue_id_idx on public.venue_verifications(venue_id);
create index if not exists venue_verifications_user_id_idx on public.venue_verifications(user_id);
create index if not exists venue_verifications_verified_at_idx on public.venue_verifications(verified_at desc);

-- Row Level Security for venue tables
alter table public.verifiable_venues enable row level security;
alter table public.venue_verifications enable row level security;

-- Allow anyone to read venue data (public information)
drop policy if exists verifiable_venues_select_all on public.verifiable_venues;
create policy verifiable_venues_select_all on public.verifiable_venues
  for select to authenticated, anon
  using (true);

-- Allow authenticated users to insert/update venues
drop policy if exists verifiable_venues_insert_authenticated on public.verifiable_venues;
create policy verifiable_venues_insert_authenticated on public.verifiable_venues
  for insert to authenticated
  with check (true);

drop policy if exists verifiable_venues_update_authenticated on public.verifiable_venues;
create policy verifiable_venues_update_authenticated on public.verifiable_venues
  for update to authenticated
  using (true)
  with check (true);

-- Venue verifications policies
drop policy if exists venue_verifications_select_all on public.venue_verifications;
create policy venue_verifications_select_all on public.venue_verifications
  for select to authenticated, anon
  using (true);

drop policy if exists venue_verifications_insert_authenticated on public.venue_verifications;
create policy venue_verifications_insert_authenticated on public.venue_verifications
  for insert to authenticated
  with check (user_id::text = auth.uid()::text);

-- Historical Weather Data System
-- Stores daily weather data to calculate meaningful visibility averages

create table if not exists public.weather_history (
  id bigint generated always as identity primary key,
  -- Location rounded to ~1km precision to group nearby requests
  location_key text not null, -- format: "lat_lng" where lat/lng are rounded to 2 decimal places
  latitude decimal(10,8) not null,
  longitude decimal(11,8) not null,
  -- Date for the weather data (not timestamp, since we store daily aggregates)
  weather_date date not null,
  -- Weather data
  visibility_meters integer not null, -- visibility in meters
  temperature_celsius decimal(4,1), -- temperature for context
  humidity_percent integer,
  wind_speed_ms decimal(4,1),
  precipitation_mm decimal(4,1),
  weather_code integer, -- Open-Meteo weather code
  -- Metadata
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  -- Ensure one record per location per date
  unique (location_key, weather_date)
);

-- Indexes for performance
create index if not exists weather_history_location_key_idx on public.weather_history(location_key);
create index if not exists weather_history_date_idx on public.weather_history(weather_date);
create index if not exists weather_history_location_date_idx on public.weather_history(location_key, weather_date);
create index if not exists weather_history_created_at_idx on public.weather_history(created_at desc);

-- Row Level Security
alter table public.weather_history enable row level security;

-- Allow anyone to read weather history (public data for averages)
drop policy if exists weather_history_select_all on public.weather_history;
create policy weather_history_select_all on public.weather_history
  for select to authenticated, anon
  using (true);

-- Function to clean up old weather data (keep last 30 days)
create or replace function public.cleanup_old_weather_data()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  delete from weather_history
  where weather_date < (current_date - interval '30 days');

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

-- Function to get average visibility for a location and time of day
create or replace function public.get_average_visibility_for_location(
  p_latitude decimal,
  p_longitude decimal,
  p_hour integer default null -- if null, gets daily average
)
returns decimal
language plpgsql
security definer
set search_path = public
as $$
declare
  location_key text;
  avg_visibility decimal;
begin
  -- Generate location key (round to 2 decimal places = ~1km precision)
  location_key := round(p_latitude::numeric, 2)::text || '_' || round(p_longitude::numeric, 2)::text;

  -- Calculate average visibility for the last 30 days
  if p_hour is not null then
    -- Get average for specific hour of day
    select avg(visibility_meters)
    into avg_visibility
    from weather_history
    where location_key = location_key
      and weather_date >= (current_date - interval '30 days')
      and extract(hour from created_at) = p_hour;
  else
    -- Get daily average
    select avg(visibility_meters)
    into avg_visibility
    from weather_history
    where location_key = location_key
      and weather_date >= (current_date - interval '30 days');
  end if;

  -- Return average or default to 10000m (10km) if no data
  return coalesce(avg_visibility, 10000);
end;
$$;

-- Function to store weather data (called by weather service)
create or replace function public.store_weather_data(
  p_latitude decimal,
  p_longitude decimal,
  p_visibility_meters integer,
  p_temperature_celsius decimal default null,
  p_humidity_percent integer default null,
  p_wind_speed_ms decimal default null,
  p_precipitation_mm decimal default null,
  p_weather_code integer default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  location_key text;
begin
  -- Generate location key
  location_key := round(p_latitude::numeric, 2)::text || '_' || round(p_longitude::numeric, 2)::text;

  -- Insert or update weather data for today
  insert into weather_history (
    location_key,
    latitude,
    longitude,
    weather_date,
    visibility_meters,
    temperature_celsius,
    humidity_percent,
    wind_speed_ms,
    precipitation_mm,
    weather_code,
    updated_at
  ) values (
    location_key,
    p_latitude,
    p_longitude,
    current_date,
    p_visibility_meters,
    p_temperature_celsius,
    p_humidity_percent,
    p_wind_speed_ms,
    p_precipitation_mm,
    p_weather_code,
    now()
  )
  on conflict (location_key, weather_date)
  do update set
    visibility_meters = excluded.visibility_meters,
    temperature_celsius = excluded.temperature_celsius,
    humidity_percent = excluded.humidity_percent,
    wind_speed_ms = excluded.wind_speed_ms,
    precipitation_mm = excluded.precipitation_mm,
    weather_code = excluded.weather_code,
    updated_at = now();

  -- Clean up old data (run occasionally)
  -- Only run cleanup 1% of the time to avoid excessive operations
  if random() < 0.01 then
    perform cleanup_old_weather_data();
  end if;
end;
$$;

-- Function to get verified users for marketing
create or replace function public.get_marketing_recipients(
  p_preferences jsonb default null,
  p_language text default null,
  p_limit integer default 1000
)
returns table (
  user_id text,
  email text,
  first_name text,
  last_name text,
  language text,
  preferences jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    u.user_id,
    u.email,
    u.first_name,
    u.last_name,
    coalesce(u.language, 'en') as language,
    u.marketing_preferences
  from users u
  where u.email_confirmed_at is not null
    and u.marketing_consent = true
    and u.unsubscribed_at is null
    and (p_preferences is null or u.marketing_preferences @> p_preferences)
    and (p_language is null or u.language = p_language)
  order by u.created_at desc
  limit p_limit;
end;
$$;
