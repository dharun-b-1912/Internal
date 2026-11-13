-- ==========================================
-- JOY CLIENT PAYROLL: COMPLETE SUPABASE PRO SETUP
-- Generated on: 2026-09-07T12:04:41.592Z
-- ==========================================


-- >>> Migration: 202608250001_joy_payroll.sql <<<
-- Joy Client Payroll Manager: Supabase PostgreSQL production schema.
-- Run this complete migration in Supabase SQL Editor before deploying the API.
-- Employee and salary tables are intentionally inaccessible through the browser
-- Data API: the authenticated payroll Edge Function enforces module permissions.

begin;

create table if not exists public.app_users (
  id text primary key,
  email text not null unique,
  full_name text,
  role text not null default 'hr_team'
    check (role in ('super_admin', 'payroll_team', 'hr_team')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  permissions_json text not null,
  can_approve_payroll integer not null default 0 check (can_approve_payroll in (0, 1)),
  created_by text,
  created_at text not null default (to_char(timezone('UTC', now()), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  updated_at text not null default (to_char(timezone('UTC', now()), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  last_login_at text
);

create table if not exists public.vendors (
  id text primary key,
  code text not null unique,
  name text not null,
  legal_name text not null,
  epf_code text,
  esi_code text,
  gstin text,
  remarks text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at text not null default (to_char(timezone('UTC', now()), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
);

create table if not exists public.client_units (
  id text primary key,
  vendor_id text not null references public.vendors(id),
  client_name text not null,
  unit_name text not null,
  location text not null,
  employee_count integer not null default 0 check (employee_count >= 0),
  remarks text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at text not null default (to_char(timezone('UTC', now()), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
);

create table if not exists public.employees (
  id text primary key,
  vendor_id text not null references public.vendors(id),
  client_unit_id text not null references public.client_units(id),
  employee_code text not null unique,
  name text not null,
  department text not null,
  date_of_joining text not null,
  uan_masked text,
  esi_masked text,
  bank_account_masked text,
  ifsc_masked text,
  bank_name text,
  accommodation_type text not null default 'Tamil Own'
    check (accommodation_type in ('Joy Room', 'Outside Room', 'Tamil Own')),
  room_number text,
  payment_mode text not null default 'bank' check (payment_mode in ('bank', 'cash')),
  salary_amount double precision not null default 0 check (salary_amount >= 0),
  salary_basis text not null default 'monthly' check (salary_basis in ('monthly', 'daily')),
  default_shift text not null default 'General',
  remarks text,
  compliance_status text not null default 'ready',
  status text not null default 'active' check (status in ('active', 'inactive'))
);

create table if not exists public.shift_definitions (
  id text primary key,
  vendor_id text not null references public.vendors(id),
  name text not null,
  start_time text not null,
  end_time text not null,
  remarks text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at text not null default (to_char(timezone('UTC', now()), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
);

create unique index if not exists shift_client_name_unique
  on public.shift_definitions(vendor_id, name);

create table if not exists public.payroll_remarks (
  id text primary key,
  vendor_id text not null references public.vendors(id),
  title text not null,
  category text not null default 'general',
  notes text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at text not null default (to_char(timezone('UTC', now()), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
);

create table if not exists public.payroll_rules (
  id text primary key,
  vendor_id text not null unique references public.vendors(id),
  standard_working_days integer not null default 26 check (standard_working_days between 1 and 31),
  pf_rate double precision not null default 0 check (pf_rate between 0 and 100),
  esi_rate double precision not null default 0 check (esi_rate between 0 and 100),
  professional_tax double precision not null default 0,
  lwf double precision not null default 0,
  overtime_hourly_rate double precision not null default 0,
  paid_leave integer not null default 0 check (paid_leave in (0, 1)),
  paid_week_off integer not null default 0 check (paid_week_off in (0, 1)),
  effective_from text not null default '2026-01-01',
  updated_at text not null default (to_char(timezone('UTC', now()), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
);

create table if not exists public.attendance_entries (
  id integer generated by default as identity primary key,
  employee_id text not null references public.employees(id),
  attendance_date text not null,
  status_code text not null check (status_code in ('P', 'A', 'L', 'WO', 'H', 'HP')),
  shift_code text not null,
  overtime_hours double precision not null default 0 check (overtime_hours between 0 and 24),
  remarks text,
  source text not null default 'manual',
  updated_by text,
  updated_at text not null default (to_char(timezone('UTC', now()), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  constraint attendance_employee_date_unique unique (employee_id, attendance_date)
);

create table if not exists public.payroll_runs (
  id text primary key,
  vendor_id text not null references public.vendors(id),
  client_unit_id text not null references public.client_units(id),
  pay_period text not null,
  status text not null default 'draft',
  employee_count integer not null default 0,
  gross_earnings double precision not null default 0,
  statutory_deductions double precision not null default 0,
  other_deductions double precision not null default 0,
  accommodation_deductions double precision not null default 0,
  net_payable double precision not null default 0,
  bank_payable double precision not null default 0,
  cash_payable double precision not null default 0,
  issue_count integer not null default 0,
  approved_by text,
  approved_at text,
  updated_at text not null default (to_char(timezone('UTC', now()), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  constraint payroll_unit_period_unique unique (client_unit_id, pay_period)
);

create table if not exists public.payroll_items (
  id text primary key,
  run_id text not null references public.payroll_runs(id),
  employee_id text not null references public.employees(id),
  present_days double precision not null default 0,
  absent_days double precision not null default 0,
  leave_days double precision not null default 0,
  week_off_days double precision not null default 0,
  holiday_present_days double precision not null default 0,
  payable_days double precision not null default 0,
  overtime_hours double precision not null default 0,
  basic double precision not null default 0,
  da double precision not null default 0,
  hra double precision not null default 0,
  conveyance double precision not null default 0,
  food_allowance double precision not null default 0,
  night_allowance double precision not null default 0,
  overtime_wages double precision not null default 0,
  attendance_bonus double precision not null default 0,
  arrears double precision not null default 0,
  holiday_wages double precision not null default 0,
  production_incentive double precision not null default 0,
  medical_allowance double precision not null default 0,
  pf_deduction double precision not null default 0,
  esi_deduction double precision not null default 0,
  professional_tax double precision not null default 0,
  lwf double precision not null default 0,
  canteen double precision not null default 0,
  snacks double precision not null default 0,
  tent double precision not null default 0,
  advance double precision not null default 0,
  other_deduction double precision not null default 0,
  tds double precision not null default 0,
  medical_insurance double precision not null default 0,
  accommodation_deduction double precision not null default 0,
  return_amount double precision not null default 0,
  gross_earnings double precision not null default 0,
  total_deductions double precision not null default 0,
  net_payable double precision not null default 0,
  validation_status text not null default 'ready',
  validation_message text,
  constraint payroll_run_employee_unique unique (run_id, employee_id)
);

create table if not exists public.accommodation_charges (
  id integer generated by default as identity primary key,
  run_id text not null references public.payroll_runs(id),
  employee_id text not null references public.employees(id),
  room_number text,
  id_card double precision not null default 0,
  rent double precision not null default 0,
  bus double precision not null default 0,
  medical double precision not null default 0,
  ticket double precision not null default 0,
  shoe double precision not null default 0,
  advance double precision not null default 0,
  food double precision not null default 0,
  aadhaar_update double precision not null default 0,
  bank_account_charge double precision not null default 0,
  tshirt double precision not null default 0,
  old_pending double precision not null default 0,
  ration_share double precision not null default 0,
  return_amount double precision not null default 0,
  constraint accommodation_run_employee_unique unique (run_id, employee_id)
);

create table if not exists public.audit_events (
  id integer generated by default as identity primary key,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  summary text not null,
  actor_email text,
  created_at text not null default (to_char(timezone('UTC', now()), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
);

create index if not exists client_units_vendor_idx on public.client_units(vendor_id);
create index if not exists employees_vendor_idx on public.employees(vendor_id);
create index if not exists employees_unit_idx on public.employees(client_unit_id);
create index if not exists attendance_date_idx on public.attendance_entries(attendance_date);
create index if not exists attendance_employee_idx on public.attendance_entries(employee_id);
create index if not exists payroll_runs_vendor_idx on public.payroll_runs(vendor_id);
create index if not exists payroll_items_run_idx on public.payroll_items(run_id);
create index if not exists payroll_items_employee_idx on public.payroll_items(employee_id);
create index if not exists accommodation_run_idx on public.accommodation_charges(run_id);
create index if not exists audit_created_idx on public.audit_events(created_at desc);

alter table public.app_users enable row level security;
alter table public.vendors enable row level security;
alter table public.client_units enable row level security;
alter table public.employees enable row level security;
alter table public.shift_definitions enable row level security;
alter table public.payroll_remarks enable row level security;
alter table public.payroll_rules enable row level security;
alter table public.attendance_entries enable row level security;
alter table public.payroll_runs enable row level security;
alter table public.payroll_items enable row level security;
alter table public.accommodation_charges enable row level security;
alter table public.audit_events enable row level security;

-- Browser users never receive direct access to confidential payroll tables.
-- The Edge Function verifies their Supabase Auth JWT, loads their Joy profile,
-- applies module-level permissions, and queries Postgres server-side.
revoke all on public.app_users, public.vendors, public.client_units,
  public.employees, public.shift_definitions, public.payroll_remarks,
  public.payroll_rules, public.attendance_entries, public.payroll_runs,
  public.payroll_items, public.accommodation_charges, public.audit_events
  from anon, authenticated;

insert into public.app_users (
  id, email, full_name, role, status, permissions_json,
  can_approve_payroll, created_by
) values (
  'USER-JOY-PRIMARY-SUPER-ADMIN',
  'praveen.red.07@gmail.com',
  'Praveen',
  'super_admin',
  'active',
  '{"dashboard":"manage","payroll":"manage","attendance":"manage","employees":"manage","accommodation":"manage","payments":"manage","clients":"manage","masters":"manage","settings":"manage","users":"manage"}',
  1,
  'initial-setup'
) on conflict (email) do nothing;

comment on table public.vendors is
  'Payroll entities shown as Clients in the Joy Payroll user interface.';
comment on table public.app_users is
  'Application permission profiles; passwords and verified identities are managed only by Supabase Auth.';

commit;


-- >>> Migration: 20260825165413_payroll_accommodation_access_enhancements.sql <<<
-- Extend the existing Joy Payroll production schema without exposing employee,
-- salary, room, or compliance records through Supabase's browser Data API.
-- Client/unit authorization is enforced by the authenticated payroll Edge Function.

begin;

alter table public.app_users
  add column if not exists client_scope_json text not null default '[]',
  add column if not exists unit_scope_json text not null default '[]';

alter table public.client_units
  add column if not exists payslip_title text,
  add column if not exists payslip_subtitle text,
  add column if not exists payslip_address text,
  add column if not exists payslip_contact text,
  add column if not exists payslip_footer text;

create table if not exists public.accommodation_types (
  id text primary key,
  vendor_id text not null references public.vendors(id),
  name text not null check (char_length(btrim(name)) between 1 and 100),
  remarks text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at text not null default (to_char(timezone('UTC', now()), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
);

create unique index if not exists accommodation_type_client_name_unique
  on public.accommodation_types(vendor_id, name);

create table if not exists public.accommodation_rooms (
  id text primary key,
  vendor_id text not null references public.vendors(id),
  accommodation_type_id text not null references public.accommodation_types(id),
  room_number text not null check (char_length(btrim(room_number)) between 1 and 100),
  capacity integer not null default 0 check (capacity between 0 and 1000),
  address text,
  remarks text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at text not null default (to_char(timezone('UTC', now()), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
);

create unique index if not exists accommodation_room_client_type_number_unique
  on public.accommodation_rooms(vendor_id, accommodation_type_id, room_number);

alter table public.employees
  add column if not exists date_of_leaving text,
  add column if not exists room_id text references public.accommodation_rooms(id);

alter table public.employees
  drop constraint if exists employees_accommodation_type_check;

alter table public.employees
  alter column accommodation_type set default 'Tamil';

update public.employees
set accommodation_type = 'Tamil'
where accommodation_type = 'Tamil Own';

alter table public.payroll_runs
  add column if not exists period_start text,
  add column if not exists period_end text,
  add column if not exists working_days integer not null default 26;

update public.payroll_runs as run
set period_start = coalesce(run.period_start, run.pay_period || '-01'),
    period_end = coalesce(run.period_end,
      to_char(((run.pay_period || '-01')::date + interval '1 month - 1 day')::date, 'YYYY-MM-DD')),
    working_days = coalesce(rule.standard_working_days, run.working_days)
from public.vendors as client
left join public.payroll_rules as rule on rule.vendor_id = client.id
where run.vendor_id = client.id;

create table if not exists public.accommodation_room_expenses (
  id text primary key,
  room_id text not null references public.accommodation_rooms(id),
  pay_period text not null check (pay_period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  gas_amount double precision not null default 0 check (gas_amount >= 0),
  ration_amount double precision not null default 0 check (ration_amount >= 0),
  provision_amount double precision not null default 0 check (provision_amount >= 0),
  occupant_count integer not null default 0 check (occupant_count >= 0),
  status text not null default 'draft' check (status in ('draft', 'finalized')),
  notes text,
  finalized_by text,
  finalized_at text,
  updated_at text not null default (to_char(timezone('UTC', now()), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
);

create unique index if not exists accommodation_room_period_unique
  on public.accommodation_room_expenses(room_id, pay_period);

create table if not exists public.payroll_batches (
  id text primary key,
  run_id text not null references public.payroll_runs(id),
  accommodation_type text not null,
  employee_count integer not null default 0 check (employee_count >= 0),
  gross_earnings double precision not null default 0,
  net_payable double precision not null default 0,
  status text not null default 'prepared' check (status in ('prepared', 'cleared')),
  payment_reference text,
  prepared_by text,
  prepared_at text,
  cleared_by text,
  cleared_at text,
  updated_at text not null default (to_char(timezone('UTC', now()), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
);

create unique index if not exists payroll_batch_run_accommodation_unique
  on public.payroll_batches(run_id, accommodation_type);

alter table public.accommodation_charges
  add column if not exists room_expense_id text references public.accommodation_room_expenses(id),
  add column if not exists gas_share double precision not null default 0,
  add column if not exists provision_share double precision not null default 0;

-- Load the two real payroll clients requested by the account owner. No example
-- employers, workers, salary records, or payroll runs are inserted.
insert into public.vendors (id, code, name, legal_name, epf_code, esi_code, gstin, status)
values
  ('vendor-jms', 'JMS', 'Joy Manpower Service', 'Joy Manpower Service',
    'CBCBE1724259000', '56001195190001001', '33AOAPR4773D1Z2', 'active'),
  ('vendor-jcs', 'JCS', 'Joy Corporate Solutions Private Limited',
    'Joy Corporate Solutions Private Limited', 'CBCBE3415419000',
    '56001461400000999', '33AAGCJ6200N1ZL', 'active')
on conflict (code) do update
set name = excluded.name,
    legal_name = excluded.legal_name,
    epf_code = excluded.epf_code,
    esi_code = excluded.esi_code,
    gstin = excluded.gstin;

-- Every real client starts with editable accommodation and shift masters.
insert into public.accommodation_types (id, vendor_id, name)
select 'ACCTYPE-' || client.code || '-' || defaults.key, client.id, defaults.name
from public.vendors as client
cross join (values
  ('TAMIL', 'Tamil'),
  ('OUTSIDE', 'Outside Room'),
  ('JOY', 'Joy Room')
) as defaults(key, name)
on conflict (vendor_id, name) do nothing;

insert into public.accommodation_types (id, vendor_id, name)
select 'ACCTYPE-LEGACY-' || md5(employee.vendor_id || ':' || employee.accommodation_type),
  employee.vendor_id, employee.accommodation_type
from public.employees as employee
where btrim(employee.accommodation_type) <> ''
group by employee.vendor_id, employee.accommodation_type
on conflict (vendor_id, name) do nothing;

insert into public.accommodation_rooms (id, vendor_id, accommodation_type_id, room_number)
select 'ROOM-LEGACY-' || md5(employee.vendor_id || ':' || type.id || ':' || employee.room_number),
  employee.vendor_id, type.id, employee.room_number
from public.employees as employee
join public.accommodation_types as type
  on type.vendor_id = employee.vendor_id and type.name = employee.accommodation_type
where employee.room_number is not null and btrim(employee.room_number) <> ''
group by employee.vendor_id, type.id, employee.room_number
on conflict (vendor_id, accommodation_type_id, room_number) do nothing;

update public.employees as employee
set room_id = room.id
from public.accommodation_rooms as room
join public.accommodation_types as type on type.id = room.accommodation_type_id
where employee.room_id is null
  and room.vendor_id = employee.vendor_id
  and type.name = employee.accommodation_type
  and room.room_number = employee.room_number;

insert into public.shift_definitions (id, vendor_id, name, start_time, end_time)
select 'SHIFT-' || client.code || '-' || defaults.key,
  client.id, defaults.name, defaults.start_time, defaults.end_time
from public.vendors as client
cross join (values
  ('GENERAL', 'General', '09:00', '18:00'),
  ('FIRST', '1st Shift', '06:00', '14:00'),
  ('SECOND', '2nd Shift', '14:00', '22:00'),
  ('THIRD', '3rd Shift', '22:00', '06:00')
) as defaults(key, name, start_time, end_time)
on conflict (vendor_id, name) do nothing;

-- Foreign-key and common dashboard/scope filters are indexed explicitly.
create index if not exists accommodation_types_vendor_idx
  on public.accommodation_types(vendor_id, status);
create index if not exists accommodation_rooms_vendor_idx
  on public.accommodation_rooms(vendor_id, status);
create index if not exists accommodation_rooms_type_idx
  on public.accommodation_rooms(accommodation_type_id, status);
create index if not exists accommodation_expenses_period_idx
  on public.accommodation_room_expenses(pay_period, status);
create index if not exists employees_room_status_idx
  on public.employees(room_id, status);
create index if not exists employees_vendor_status_joining_idx
  on public.employees(vendor_id, status, date_of_joining);
create index if not exists employees_unit_status_idx
  on public.employees(client_unit_id, status);
create index if not exists accommodation_charge_employee_idx
  on public.accommodation_charges(employee_id);
create index if not exists accommodation_charge_room_expense_idx
  on public.accommodation_charges(room_expense_id);
create index if not exists payroll_batches_status_idx
  on public.payroll_batches(run_id, status);
create index if not exists payroll_remarks_vendor_idx
  on public.payroll_remarks(vendor_id);
create index if not exists audit_actor_created_idx
  on public.audit_events(actor_email, created_at desc);

alter table public.accommodation_types enable row level security;
alter table public.accommodation_rooms enable row level security;
alter table public.accommodation_room_expenses enable row level security;
alter table public.payroll_batches enable row level security;

revoke all on public.accommodation_types, public.accommodation_rooms,
  public.accommodation_room_expenses, public.payroll_batches
  from public, anon, authenticated;

comment on table public.accommodation_types is
  'Client-specific, editable room categories; read and write through the authenticated payroll Edge Function only.';
comment on table public.accommodation_rooms is
  'Client-specific employee accommodation rooms; protected from direct browser Data API access.';
comment on table public.accommodation_room_expenses is
  'Finalized gas, ration, and provision room totals that are split exactly across allocated roommates.';
comment on table public.payroll_batches is
  'Accommodation-wise payroll preparation and payment-clearance audit records.';

commit;


-- >>> Migration: 20260826021500_unit_attendance_cycle_payslip_fields_employee_left_only.sql <<<
begin;

alter table public.client_units
  add column if not exists attendance_cycle_start_day integer not null default 1,
  add column if not exists attendance_cycle_end_day integer not null default 31,
  add column if not exists attendance_working_days integer not null default 26,
  add column if not exists payslip_earnings_json text not null default '["basic","da","hra","conveyance","foodAllowance","nightAllowance","overtimeWages","attendanceBonus","arrears","holidayWages","productionIncentive","medicalAllowance"]',
  add column if not exists payslip_deductions_json text not null default '["pfDeduction","esiDeduction","professionalTax","lwf","canteen","snacks","tent","advance","otherDeduction","tds","medicalInsurance","accommodationDeduction"]';

alter table public.client_units
  drop constraint if exists client_units_attendance_cycle_start_day_check,
  add constraint client_units_attendance_cycle_start_day_check check (attendance_cycle_start_day between 1 and 31),
  drop constraint if exists client_units_attendance_cycle_end_day_check,
  add constraint client_units_attendance_cycle_end_day_check check (attendance_cycle_end_day between 1 and 31),
  drop constraint if exists client_units_attendance_working_days_check,
  add constraint client_units_attendance_working_days_check check (attendance_working_days between 1 and 31),
  drop constraint if exists client_units_payslip_earnings_json_check,
  add constraint client_units_payslip_earnings_json_check check (jsonb_typeof(payslip_earnings_json::jsonb) = 'array'),
  drop constraint if exists client_units_payslip_deductions_json_check,
  add constraint client_units_payslip_deductions_json_check check (jsonb_typeof(payslip_deductions_json::jsonb) = 'array');

update public.client_units
set payslip_earnings_json = '["basic","da","hra","conveyance","foodAllowance","nightAllowance","overtimeWages","attendanceBonus","arrears","holidayWages","productionIncentive","medicalAllowance"]'
where payslip_earnings_json = '[]';

update public.client_units
set payslip_deductions_json = '["pfDeduction","esiDeduction","professionalTax","lwf","canteen","snacks","tent","advance","otherDeduction","tds","medicalInsurance","accommodationDeduction"]'
where payslip_deductions_json = '[]';

comment on column public.client_units.attendance_cycle_start_day is 'Employer-unit attendance cycle start day; a start day greater than the end day begins in the previous month.';
comment on column public.client_units.attendance_cycle_end_day is 'Employer-unit attendance cycle inclusive end day.';
comment on column public.client_units.payslip_earnings_json is 'Validated payroll earning field keys displayed on this unit payslip.';
comment on column public.client_units.payslip_deductions_json is 'Validated payroll deduction field keys displayed on this unit payslip.';

commit;


-- >>> Migration: 20260826033000_direct_employee_vehicle_utility_operations.sql <<<
begin;

alter table public.employees add column if not exists employment_type text not null default 'client';
alter table public.employees add column if not exists processing_stage text not null default 'field_hr_draft';
alter table public.employees add column if not exists finalized_by text;
alter table public.employees add column if not exists finalized_at timestamptz;
alter table public.employees drop constraint if exists employees_employment_type_check;
alter table public.employees add constraint employees_employment_type_check check (employment_type in ('client','direct'));
alter table public.employees drop constraint if exists employees_processing_stage_check;
alter table public.employees add constraint employees_processing_stage_check check (processing_stage in ('field_hr_draft','field_hr_finalized','payroll_processed','hr_manager_reviewed','approved'));

create table if not exists public.vehicles (
 id text primary key, vendor_id text not null references public.vendors(id), registration_number text not null unique,
 vehicle_name text not null, vehicle_type text not null default 'car', current_odometer double precision not null default 0,
 permit_expiry date, insurance_expiry date, fc_expiry date, pollution_expiry date, next_service_date date,
 next_service_km double precision, tyre_changed_date date, tyre_changed_km double precision,
 last_water_wash_date date, last_wheel_alignment_date date, status text not null default 'active', remarks text,
 created_at timestamptz not null default now(), check (status in ('active','inactive')), check (current_odometer >= 0)
);
create index if not exists vehicles_vendor_status_idx on public.vehicles(vendor_id,status);
create index if not exists vehicles_compliance_dates_idx on public.vehicles(permit_expiry,insurance_expiry,fc_expiry,pollution_expiry);

create table if not exists public.vehicle_records (
 id text primary key, vehicle_id text not null references public.vehicles(id), record_date date not null, record_type text not null,
 trip_from text, trip_to text, purpose text, start_km double precision, end_km double precision,
 litres double precision not null default 0, amount double precision not null default 0, vendor_name text,
 next_due_date date, next_due_km double precision, remarks text, entered_by text, approved_by text, approved_at timestamptz,
 status text not null default 'draft', created_at timestamptz not null default now(),
 check (record_type in ('trip','fuel','service','tyre','water_wash','wheel_alignment','permit','insurance','fc','pollution','other')),
 check (status in ('draft','approved')), check (litres >= 0 and amount >= 0), check (end_km is null or start_km is null or end_km >= start_km)
);
create index if not exists vehicle_records_vehicle_date_idx on public.vehicle_records(vehicle_id,record_date desc);
create index if not exists vehicle_records_type_date_idx on public.vehicle_records(record_type,record_date desc);

create table if not exists public.utility_meters (
 id text primary key, vendor_id text not null references public.vendors(id), location_type text not null,
 location_name text not null, meter_number text, status text not null default 'active', remarks text,
 created_at timestamptz not null default now(), check (location_type in ('hostel','office')), check (status in ('active','inactive'))
);
create index if not exists utility_meters_vendor_status_idx on public.utility_meters(vendor_id,status);

create table if not exists public.eb_readings (
 id text primary key, meter_id text not null references public.utility_meters(id), reading_date date not null,
 reading_value double precision not null, units_consumed double precision not null default 0, amount double precision not null default 0,
 remarks text, entered_by text, approved_by text, approved_at timestamptz, status text not null default 'draft',
 created_at timestamptz not null default now(), unique(meter_id,reading_date),
 check (reading_value >= 0 and units_consumed >= 0 and amount >= 0), check (status in ('draft','approved'))
);
create index if not exists eb_readings_meter_date_idx on public.eb_readings(meter_id,reading_date desc);

alter table public.vehicles enable row level security;
alter table public.vehicle_records enable row level security;
alter table public.utility_meters enable row level security;
alter table public.eb_readings enable row level security;
revoke all on public.vehicles, public.vehicle_records, public.utility_meters, public.eb_readings from anon, authenticated;

commit;


-- >>> Migration: 20260826043000_hostel_master_utilities_cumulative_deductions.sql <<<
begin;
create table if not exists public.hostels (id text primary key,vendor_id text not null references public.vendors(id),name text not null,address text,incharge_name text,eb_meter_number text,status text not null default 'active',remarks text,created_at timestamptz not null default now(),unique(vendor_id,name),check(status in ('active','inactive')));
alter table public.accommodation_rooms add column if not exists hostel_id text references public.hostels(id);
create index if not exists accommodation_rooms_hostel_idx on public.accommodation_rooms(hostel_id);
create table if not exists public.hostel_utility_readings (id text primary key,hostel_id text not null references public.hostels(id),reading_date date not null,utility_type text not null,reading_value double precision not null default 0,consumption double precision not null default 0,tanker_quantity double precision not null default 0,amount double precision not null default 0,remarks text,entered_by text,approved_by text,approved_at timestamptz,status text not null default 'draft',created_at timestamptz not null default now(),unique(hostel_id,utility_type,reading_date),check(utility_type in ('eb','water_purchase')),check(status in ('draft','approved')),check(reading_value>=0 and consumption>=0 and tanker_quantity>=0 and amount>=0));
alter table public.accommodation_room_expenses add column if not exists gas_date date;
alter table public.accommodation_room_expenses add column if not exists ration_date date;
alter table public.accommodation_room_expenses add column if not exists provision_date date;
alter table public.employees add column if not exists shift_pattern text not null default 'general' check (shift_pattern in ('general','rotational'));
update public.employees set payment_mode='bank' where payment_mode<>'bank';
create index if not exists hostel_utility_hostel_date_idx on public.hostel_utility_readings(hostel_id,reading_date desc);
alter table public.hostels enable row level security; alter table public.hostel_utility_readings enable row level security;
revoke all on public.hostels,public.hostel_utility_readings from anon,authenticated;
commit;


-- >>> Migration: 20260826080000_link_hostels_to_accommodation_types.sql <<<
begin;
alter table public.hostels add column if not exists accommodation_type_id text references public.accommodation_types(id);
update public.hostels h
set accommodation_type_id = t.id
from public.accommodation_types t
where h.accommodation_type_id is null
  and t.vendor_id = h.vendor_id
  and lower(t.name) in ('joy hostel', 'joy room');
create index if not exists hostels_accommodation_type_idx on public.hostels(accommodation_type_id);
commit;


-- >>> Migration: 20260826090000_shift_assignments_hostel_activities.sql <<<
begin;
alter table public.employees add column if not exists applicable_shifts_json text not null default '[]';
alter table public.hostel_utility_readings add column if not exists activity_name text;
alter table public.hostel_utility_readings drop constraint if exists hostel_utility_readings_utility_type_check;
alter table public.hostel_utility_readings add constraint hostel_utility_readings_utility_type_check check (utility_type in ('eb','water','payment','housekeeping','other'));
commit;


-- >>> Migration: 20260826103000_direct_users_hostel_rent_and_deductions.sql <<<
begin;
alter table public.app_users add column if not exists employee_code text;
alter table public.app_users add column if not exists department text;
alter table public.app_users add column if not exists date_of_joining text;
alter table public.app_users add column if not exists mobile_number text;
alter table public.app_users add column if not exists hostel_scope_json text not null default '[]';
alter table public.accommodation_rooms add column if not exists rent_settings_json text not null default '{}';
alter table public.accommodation_rooms add column if not exists rent_cutoff_day integer not null default 25;
alter table public.accommodation_rooms add column if not exists late_join_rent_percent double precision not null default 50;
alter table public.accommodation_room_expenses add column if not exists gas_cylinder_count integer not null default 0;
alter table public.accommodation_room_expenses add column if not exists gas_payment_reference text;
alter table public.accommodation_room_expenses add column if not exists ration_payment_reference text;
alter table public.accommodation_room_expenses add column if not exists provision_payment_reference text;
create index if not exists accommodation_rooms_hostel_id_idx on public.accommodation_rooms(hostel_id);
alter table public.shift_definitions add column if not exists client_unit_id text references public.client_units(id);
alter table public.shift_definitions add column if not exists break_minutes integer not null default 0;
alter table public.shift_definitions add column if not exists required_work_minutes integer not null default 480;
alter table public.shift_definitions add column if not exists late_grace_minutes integer not null default 0;
alter table public.shift_definitions add column if not exists late_deduction_minutes integer not null default 0;
alter table public.shift_definitions add column if not exists early_grace_minutes integer not null default 0;
alter table public.shift_definitions add column if not exists early_deduction_minutes integer not null default 0;
alter table public.shift_definitions add column if not exists ot_mode text not null default 'approval';
alter table public.shift_definitions add column if not exists fixed_ot_hours double precision not null default 0;
alter table public.attendance_entries add column if not exists punch_in text;
alter table public.attendance_entries add column if not exists punch_out text;
alter table public.attendance_entries add column if not exists worked_hours double precision not null default 0;
alter table public.attendance_entries add column if not exists deduction_hours double precision not null default 0;
create index if not exists shift_definitions_client_unit_id_idx on public.shift_definitions(client_unit_id);
commit;


-- >>> Migration: 20260826143000_payroll_source_mode.sql <<<
alter table public.payroll_runs
  add column if not exists processing_mode text not null default 'attendance'
  check (processing_mode in ('attendance', 'salary_import'));


-- >>> Migration: 20260827090000_recovery_auth_branding.sql <<<
alter table public.vendors add column if not exists logo_data_url text;

create table if not exists public.recovery_entries (
  id text primary key,
  run_id text not null references public.payroll_runs(id) on delete cascade,
  employee_id text not null references public.employees(id),
  recovery_date date not null,
  recovery_type text not null check (recovery_type in ('rent','bus','food','advance','idCard','medical','ticket','shoe','aadhaarUpdate','bankAccountCharge','tshirt','oldPending','returnAmount')),
  amount numeric(12,2) not null default 0 check (amount >= 0),
  reference text,
  notes text,
  created_by text,
  created_at timestamptz not null default now()
);
create index if not exists recovery_entries_run_date_idx on public.recovery_entries(run_id, recovery_date);
create index if not exists recovery_entries_employee_idx on public.recovery_entries(employee_id);
alter table public.recovery_entries enable row level security;
revoke all on table public.recovery_entries from anon, authenticated;


-- >>> Migration: 20260827110000_client_ot_voucher_hostel_scope.sql <<<
alter table public.client_units add column if not exists overtime_multiplier numeric(6,2) not null default 1 check (overtime_multiplier > 0 and overtime_multiplier <= 5);
alter table public.client_units add column if not exists voucher_header text;
alter table public.hostels add column if not exists client_scope_json text not null default '[]';


-- >>> Migration: 20260827130000_recovery_finalization.sql <<<
create table if not exists public.recovery_finalizations (
  id text primary key,
  run_id text not null references public.payroll_runs(id) on delete cascade,
  employee_id text not null references public.employees(id),
  voucher_number text not null unique,
  finalized_by text,
  finalized_at timestamptz not null default now(),
  unique(run_id, employee_id)
);
alter table public.recovery_finalizations enable row level security;
revoke all on table public.recovery_finalizations from anon, authenticated;


-- >>> Migration: 20260827133444_employee_highest_qualification.sql <<<
alter table public.employees
  add column if not exists highest_qualification text;


-- >>> Migration: 20260827150000_employee_room_rent_photo.sql <<<
alter table public.employees add column if not exists room_rent_amount numeric not null default 0;
alter table public.employees add column if not exists photo_data_url text;


-- >>> Migration: 20260827170000_employee_statutory_controls.sql <<<
alter table public.employees add column if not exists pf_applicable integer not null default 1;
alter table public.employees add column if not exists pf_wage_amount numeric not null default 0;
alter table public.employees add column if not exists esi_applicable integer not null default 1;
alter table public.employees add column if not exists esi_wage_amount numeric not null default 0;
alter table public.employees add column if not exists pt_applicable integer not null default 1;
alter table public.employees add column if not exists lwf_applicable integer not null default 1;


-- >>> Migration: 20260827190000_employee_identity_details.sql <<<
alter table public.employees add column if not exists mobile_number text;
alter table public.employees add column if not exists emergency_contact_number text;
alter table public.employees add column if not exists address_line text;
alter table public.employees add column if not exists district text;
alter table public.employees add column if not exists state_name text;
alter table public.employees add column if not exists pincode text;
alter table public.employees add column if not exists blood_group text;
alter table public.employees add column if not exists father_name text;
alter table public.employees add column if not exists spouse_name text;
alter table public.employees add column if not exists marital_status text;


-- >>> Migration: 20260828121500_payroll_register_extended_fields.sql <<<
alter table public.payroll_items
  add column if not exists fixed_working_days double precision not null default 0,
  add column if not exists nfh_days double precision not null default 0,
  add column if not exists comp_off_days double precision not null default 0,
  add column if not exists on_duty_days double precision not null default 0,
  add column if not exists sunday_days double precision not null default 0,
  add column if not exists pl_days double precision not null default 0,
  add column if not exists cl_days double precision not null default 0,
  add column if not exists sl_days double precision not null default 0,
  add column if not exists imported_gross_earnings double precision,
  add column if not exists imported_total_deductions double precision,
  add column if not exists imported_net_payable double precision;

create index if not exists recovery_finalizations_employee_idx
  on public.recovery_finalizations(employee_id);


-- >>> Migration: 20260830173500_room_recovery_date_ledger.sql <<<
-- Room recovery is a dated transaction ledger. A room may have many recovery
-- entries inside the same payroll month; monthly finalization aggregates them.
DROP INDEX IF EXISTS public.accommodation_room_period_unique;

CREATE INDEX IF NOT EXISTS accommodation_room_period_idx
  ON public.accommodation_room_expenses (room_id, pay_period);


-- >>> Migration: 20260905010000_individual_payment_export_locks.sql <<<
-- Persist the exact employee selection used for each bank export.
-- A payroll item may belong to only one export batch for its payroll run.

begin;

create table if not exists public.payment_export_batches (
  id text primary key,
  run_id text not null references public.payroll_runs(id),
  status text not null default 'locked'
    check (status in ('locked', 'downloaded')),
  export_format text,
  employee_count integer not null default 0 check (employee_count > 0),
  total_payable double precision not null default 0 check (total_payable >= 0),
  locked_by text not null,
  locked_at text not null,
  downloaded_by text,
  downloaded_at text,
  created_at text not null default (to_char(timezone('UTC', now()), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  updated_at text not null default (to_char(timezone('UTC', now()), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
);

create table if not exists public.payment_export_batch_items (
  id text primary key,
  batch_id text not null references public.payment_export_batches(id) on delete cascade,
  run_id text not null references public.payroll_runs(id),
  payroll_item_id text not null references public.payroll_items(id),
  employee_id text not null references public.employees(id),
  amount double precision not null default 0 check (amount >= 0),
  created_at text not null default (to_char(timezone('UTC', now()), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
);

create unique index if not exists payment_export_batch_run_item_unique
  on public.payment_export_batch_items(run_id, payroll_item_id);
create index if not exists payment_export_batches_run_status_idx
  on public.payment_export_batches(run_id, status);
create index if not exists payment_export_batch_items_batch_idx
  on public.payment_export_batch_items(batch_id);
create index if not exists payment_export_batch_items_payroll_item_idx
  on public.payment_export_batch_items(payroll_item_id);
create index if not exists payment_export_batch_items_employee_fk_idx
  on public.payment_export_batch_items(employee_id);
create index if not exists payment_export_batch_items_employee_idx
  on public.payment_export_batch_items(run_id, employee_id);

alter table public.payment_export_batches enable row level security;
alter table public.payment_export_batch_items enable row level security;
revoke all on public.payment_export_batches, public.payment_export_batch_items
  from public, anon, authenticated;

comment on table public.payment_export_batches is
  'Persistent employee-wise bank export locks; downloaded batches cannot be silently re-exported.';
comment on table public.payment_export_batch_items is
  'Individual payroll items included in one locked or downloaded bank export batch.';

commit;


-- >>> Migration: 20260905011000_payment_export_batch_fk_indexes.sql <<<
-- Cover the individual export-batch foreign keys for efficient deletes and
-- referential checks. The first migration also declares these for fresh DBs;
-- this idempotent migration upgrades databases where it was already applied.

begin;

create index if not exists payment_export_batch_items_payroll_item_idx
  on public.payment_export_batch_items(payroll_item_id);
create index if not exists payment_export_batch_items_employee_fk_idx
  on public.payment_export_batch_items(employee_id);

commit;

