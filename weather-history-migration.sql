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

-- Only allow system/service to insert weather data (not regular users)
-- We'll handle this through service functions, not direct user access

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
