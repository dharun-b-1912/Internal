begin;

alter table public.employees
  add column if not exists final_payroll_month text;

comment on column public.employees.final_payroll_month is 'The designated final payroll month (YYYY-MM) in which this separated employee is processed for salaries and recoveries before being auto-archived.';

commit;
