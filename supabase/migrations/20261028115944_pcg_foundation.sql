-- PCG ePTW foundation. Apply to a dedicated Supabase project.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;
create type public.permit_status as enum ('DRAFT','SUBMITTED','UNDER_REVIEW','CHANGES_REQUIRED','PENDING_APPROVAL','APPROVED','ISSUED','ACTIVE','SUSPENDED','EXPIRED','COMPLETION_REQUESTED','CLOSED','CANCELLED');
create sequence private.permit_number_seq;
create function private.next_permit_number() returns text language sql volatile set search_path='' as $$
 select 'PTW-'||extract(year from timezone('Asia/Kuala_Lumpur',now()))::text||'-'||lpad(n::text,greatest(6,length(n::text)),'0') from (select nextval('private.permit_number_seq') as n) s;
$$;
revoke all on function private.next_permit_number() from public;
create table public.profiles(id uuid primary key references auth.users(id), full_name text not null, employee_id text, phone text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.roles(id uuid primary key default gen_random_uuid(), name text not null unique, created_at timestamptz not null default now());
create table public.permissions(key text primary key, description text not null);
create table public.role_permissions(role_id uuid not null references public.roles, permission_key text not null references public.permissions, primary key(role_id,permission_key));
create table public.user_roles(user_id uuid not null references public.profiles,role_id uuid not null references public.roles, primary key(user_id,role_id));
create table public.departments(id uuid primary key default gen_random_uuid(),name text not null unique,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.locations(id uuid primary key default gen_random_uuid(),name text not null unique,department_id uuid references public.departments,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.equipment(id uuid primary key default gen_random_uuid(),name text not null,asset_tag text unique,location_id uuid references public.locations,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.contractors(id uuid primary key default gen_random_uuid(),company_name text not null,registration_number text unique,contact_person text,phone text,email text,address text,status text not null default 'CONDITIONAL' check(status in ('APPROVED','CONDITIONAL','EXPIRED','SUSPENDED','BLOCKED')),insurance_expiry date,induction_expiry date,notes text,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.workers(id uuid primary key default gen_random_uuid(),contractor_id uuid references public.contractors,name text not null,identity_reference text not null,trade text,phone text,competency text,induction_expiry date,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.permit_types(id uuid primary key default gen_random_uuid(),name text not null unique,active boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.master_checklists(id uuid primary key default gen_random_uuid(),name text not null unique,category text not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.master_checklist_items(id uuid primary key default gen_random_uuid(),checklist_id uuid not null references public.master_checklists,label text not null,classification text,required boolean not null default true,active boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.system_settings(key text primary key,value jsonb not null,updated_at timestamptz not null default now());
create table public.approval_templates(id uuid primary key default gen_random_uuid(),name text not null unique,active boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.approval_template_steps(id uuid primary key default gen_random_uuid(),template_id uuid not null references public.approval_templates,position integer not null check(position>0),role_id uuid not null references public.roles,activity text,unique(template_id,position));
create table public.permits(
 id uuid primary key default gen_random_uuid(),
 system_permit_number text not null unique default private.next_permit_number(),
 legacy_permit_number text, title text not null default 'Untitled permit',status public.permit_status not null default 'DRAFT',
 requester_id uuid not null references public.profiles,holder_id uuid references public.profiles,department_id uuid references public.departments,location_id uuid references public.locations,contractor_id uuid references public.contractors,
 starts_at timestamptz,ends_at timestamptz,original_ends_at timestamptz,verification_token uuid not null unique default gen_random_uuid(),
 draft jsonb not null default '{}',version integer not null default 1,submitted_version integer,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),check(ends_at is null or starts_at is null or ends_at>starts_at)
);
create index permits_status_end_idx on public.permits(status,ends_at);
create index permits_requester_idx on public.permits(requester_id);
create index permits_holder_idx on public.permits(holder_id);
create table public.permit_workers(id uuid primary key default gen_random_uuid(),permit_id uuid not null references public.permits,submission_version integer not null,worker_id uuid references public.workers,name text not null,identity_reference text not null,company text not null,trade text,phone text,competency text,certificate_expiry date,inducted boolean not null default false,created_at timestamptz not null default now());
create table public.permit_activities(id uuid primary key default gen_random_uuid(),permit_id uuid not null references public.permits,activity text not null,unique(permit_id,activity));
create table public.permit_ppe(id uuid primary key default gen_random_uuid(),permit_id uuid not null references public.permits,label text not null,unique(permit_id,label));
create table public.permit_checklist_items(id uuid primary key default gen_random_uuid(),permit_id uuid not null references public.permits,master_item_id uuid references public.master_checklist_items,label text not null,classification text,required boolean not null default true);
create table public.permit_checklist_responses(id uuid primary key default gen_random_uuid(),permit_id uuid not null references public.permits,item_id uuid not null references public.permit_checklist_items,response boolean not null,recorded_by uuid not null references public.profiles,recorded_at timestamptz not null default now());
create table public.risk_assessments(id uuid primary key default gen_random_uuid(),permit_id uuid not null references public.permits,version integer not null default 1,created_by uuid not null references public.profiles,created_at timestamptz not null default now(),unique(permit_id,version));
create table public.risk_hazards(id uuid primary key default gen_random_uuid(),permit_id uuid not null references public.permits,assessment_id uuid not null references public.risk_assessments,hazard text not null,consequence text not null,affected text not null,controls text not null,responsible_person text not null,likelihood integer not null check(likelihood between 1 and 5),severity integer not null check(severity between 1 and 5),risk_score integer generated always as (likelihood*severity) stored,residual_likelihood integer not null check(residual_likelihood between 1 and 5),residual_severity integer not null check(residual_severity between 1 and 5),residual_score integer generated always as (residual_likelihood*residual_severity) stored,target_completion timestamptz,status text not null default 'OPEN',created_at timestamptz not null default now());
create table public.permit_documents(id uuid primary key default gen_random_uuid(),permit_id uuid not null references public.permits,document_type text not null,filename text not null,storage_path text not null unique,uploaded_by uuid not null references public.profiles,expiry date,version integer not null default 1,created_at timestamptz not null default now());
create table public.contractor_documents(id uuid primary key default gen_random_uuid(),contractor_id uuid not null references public.contractors,document_type text not null,storage_path text not null,expiry date,created_at timestamptz not null default now());
create table public.worker_certificates(id uuid primary key default gen_random_uuid(),worker_id uuid not null references public.workers,name text not null,storage_path text,expiry date not null,created_at timestamptz not null default now());
create table public.permit_approval_steps(id uuid primary key default gen_random_uuid(),permit_id uuid not null references public.permits,position integer not null,role_id uuid not null references public.roles,status text not null default 'PENDING' check(status in ('PENDING','APPROVED','REJECTED','CHANGES_REQUIRED')),unique(permit_id,position));
create table public.permit_approvals(id uuid primary key default gen_random_uuid(),permit_id uuid not null references public.permits,step_id uuid not null references public.permit_approval_steps,approver_id uuid not null references public.profiles,decision text not null check(decision in ('APPROVE','REJECT','REQUEST_CHANGES')),comments text not null,acknowledgement text not null,created_at timestamptz not null default now());
create table public.permit_acknowledgements(id uuid primary key default gen_random_uuid(),permit_id uuid not null references public.permits,user_id uuid not null references public.profiles,kind text not null,statement text not null,signature_path text,created_at timestamptz not null default now());
create table public.loto_records(id uuid primary key default gen_random_uuid(),permit_id uuid not null references public.permits,isolation_required boolean not null default true,verified_by uuid references public.profiles,verified_at timestamptz,zero_energy_verified boolean not null default false,release_authorized_by uuid references public.profiles,created_at timestamptz not null default now());
create table public.loto_isolation_points(id uuid primary key default gen_random_uuid(),permit_id uuid not null references public.permits,loto_id uuid not null references public.loto_records,isolation_type text not null,energy_source text not null,isolation_point text not null,lock_number text not null,tag_number text not null,applied_by uuid not null references public.profiles,applied_at timestamptz not null,photo_path text,removed_by uuid references public.profiles,removed_at timestamptz,created_at timestamptz not null default now());
create table public.hot_work_details(id uuid primary key default gen_random_uuid(),permit_id uuid not null unique references public.permits,work_types text[] not null default '{}',location text,atex boolean not null default false,fire_watch_id uuid references public.profiles,controls jsonb not null default '{}',valid_from timestamptz,valid_until timestamptz,detector_isolated_at timestamptz,detector_isolated_by uuid references public.profiles,fire_alarm_restored boolean not null default false,final_fire_check boolean not null default false,created_at timestamptz not null default now());
create table public.hot_work_checks(id uuid primary key default gen_random_uuid(),permit_id uuid not null references public.permits,checker_id uuid not null references public.profiles,result text not null check(result in ('PASS','FAIL')),remarks text,photo_path text,checked_at timestamptz not null default now());
create table public.confined_space_details(id uuid primary key default gen_random_uuid(),permit_id uuid not null unique references public.permits,space_name text not null,entry_purpose text,attendant_id uuid references public.profiles,supervisor_id uuid references public.profiles,rescue_team text,communication_method text,controls jsonb not null default '{}',monitoring_interval_minutes integer not null default 30 check(monitoring_interval_minutes>0),created_at timestamptz not null default now());
create table public.gas_tests(id uuid primary key default gen_random_uuid(),permit_id uuid not null references public.permits,measured_by uuid not null references public.profiles,measured_at timestamptz not null,instrument_id text not null,calibration_valid_until timestamptz not null,kind text not null check(kind in ('PRE_ENTRY','PERIODIC','CONTINUOUS')),created_at timestamptz not null default now());
create table public.gas_test_readings(id uuid primary key default gen_random_uuid(),permit_id uuid not null references public.permits,test_id uuid not null references public.gas_tests,parameter text not null,unit text not null,permitted_min numeric,permitted_max numeric,measured_value numeric not null,passed boolean generated always as ((permitted_min is null or measured_value>=permitted_min) and (permitted_max is null or measured_value<=permitted_max)) stored,check(permitted_min is not null or permitted_max is not null),check(permitted_min is null or permitted_max is null or permitted_max>=permitted_min));
create table public.permit_extensions(id uuid primary key default gen_random_uuid(),permit_id uuid not null references public.permits,original_expiry timestamptz not null,requested_expiry timestamptz not null,reason text not null,conditions_changed boolean not null,new_hazards boolean not null,risk_reviewed boolean not null,requested_by uuid not null references public.profiles,approved_by uuid references public.profiles,approved_at timestamptz,created_at timestamptz not null default now(),check(requested_expiry>original_expiry));
create table public.permit_transfers(id uuid primary key default gen_random_uuid(),permit_id uuid not null references public.permits,outgoing_holder uuid not null references public.profiles,incoming_holder uuid not null references public.profiles,handover_notes text not null,outstanding_risks text,critical_controls text,outgoing_acknowledged_at timestamptz,incoming_acknowledged_at timestamptz,issuer_id uuid references public.profiles,created_at timestamptz not null default now());
create table public.permit_work_sessions(id uuid primary key default gen_random_uuid(),permit_id uuid not null references public.permits,started_at timestamptz not null default now(),started_by uuid not null references public.profiles,worker_count integer not null check(worker_count>0),pre_work_confirmation boolean not null check(pre_work_confirmation),stopped_at timestamptz,stopped_by uuid references public.profiles,stop_reason text,area_safe boolean,energy_state text,remarks text,check(stopped_at is null or stopped_at>=started_at));
create unique index one_open_session_per_permit on public.permit_work_sessions(permit_id) where stopped_at is null;
create table public.permit_suspensions(id uuid primary key default gen_random_uuid(),permit_id uuid not null references public.permits,reason_category text not null,remarks text not null,photo_paths text[] not null default '{}',suspended_by uuid not null references public.profiles,created_at timestamptz not null default now());
create table public.permit_resumptions(id uuid primary key default gen_random_uuid(),permit_id uuid not null references public.permits,corrective_action text not null,evidence_paths text[] not null default '{}',reinspected boolean not null check(reinspected),approved_by uuid not null references public.profiles,created_at timestamptz not null default now());
create table public.permit_closures(id uuid primary key default gen_random_uuid(),permit_id uuid not null unique references public.permits,checklist jsonb not null,remarks text not null,holder_ack_id uuid not null references public.permit_acknowledgements,issuer_ack_id uuid not null references public.permit_acknowledgements,closed_by uuid not null references public.profiles,created_at timestamptz not null default now());
create table public.permit_amendments(id uuid primary key default gen_random_uuid(),permit_id uuid not null references public.permits,old_value jsonb not null,new_value jsonb not null,reason text not null,amended_by uuid not null references public.profiles,created_at timestamptz not null default now());
create table public.notifications(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles,permit_id uuid references public.permits,event text not null,message text not null,read_at timestamptz,created_at timestamptz not null default now());
create table public.audit_events(id uuid primary key default gen_random_uuid(),permit_id uuid references public.permits,actor_id uuid references public.profiles,action text not null,entity text not null,entity_id uuid,old_value jsonb,new_value jsonb,reason text,metadata jsonb not null default '{}',created_at timestamptz not null default now());
create index audit_events_permit_time_idx on public.audit_events(permit_id,created_at desc);
create index notifications_user_time_idx on public.notifications(user_id,created_at desc);

create function private.has_permission(permission text) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.user_roles ur join public.role_permissions rp on rp.role_id=ur.role_id where ur.user_id=auth.uid() and rp.permission_key=permission);
$$;
create function private.can_read_permit(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.permits p where p.id=target and (p.requester_id=auth.uid() or p.holder_id=auth.uid() or private.has_permission('permit.view_all')));
$$;
revoke all on function private.has_permission(text),private.can_read_permit(uuid) from public;
grant execute on function private.has_permission(text),private.can_read_permit(uuid) to authenticated;

-- Deny writes by default. Authenticated mutations go through guarded functions.
do $$ declare t record; begin
 for t in select tablename from pg_tables where schemaname='public' loop
  execute format('alter table public.%I enable row level security',t.tablename);
  execute format('revoke all on public.%I from anon, authenticated',t.tablename);
  execute format('grant select on public.%I to authenticated',t.tablename);
  if t.tablename in ('roles','permissions','role_permissions','departments','locations','equipment','permit_types','master_checklists','master_checklist_items','system_settings','approval_templates','approval_template_steps') then
   execute format('create policy reference_read on public.%I for select to authenticated using (auth.uid() is not null)',t.tablename);
  elsif t.tablename='profiles' then
   execute 'create policy profile_read on public.profiles for select to authenticated using (id=auth.uid() or private.has_permission(''settings.manage''))';
  elsif t.tablename='user_roles' then
   execute 'create policy role_read on public.user_roles for select to authenticated using (user_id=auth.uid() or private.has_permission(''settings.manage''))';
  elsif t.tablename='permits' then
   execute 'create policy permit_read on public.permits for select to authenticated using (private.can_read_permit(id))';
  elsif t.tablename='audit_events' then
   execute 'create policy audit_read on public.audit_events for select to authenticated using (private.has_permission(''audit.view'') and (permit_id is null or private.can_read_permit(permit_id)))';
  elsif t.tablename='notifications' then
   execute 'create policy notification_read on public.notifications for select to authenticated using (user_id=auth.uid())';
  elsif t.tablename in ('contractors','workers','contractor_documents','worker_certificates') then
   execute format('create policy directory_read on public.%I for select to authenticated using (private.has_permission(''contractor.manage'') or private.has_permission(''permit.create'') or private.has_permission(''permit.view_all''))',t.tablename);
  else
   execute format('create policy permit_child_read on public.%I for select to authenticated using (private.can_read_permit(permit_id))',t.tablename);
   execute format('create index on public.%I(permit_id)',t.tablename);
  end if;
 end loop;
end $$;
create function private.immutable_record() returns trigger language plpgsql set search_path='' as $$ begin raise exception 'Historical safety records are immutable. Create an amendment.'; end $$;
create trigger audit_immutable before update or delete on public.audit_events for each row execute function private.immutable_record();
create trigger approval_immutable before update or delete on public.permit_approvals for each row execute function private.immutable_record();
create trigger acknowledgement_immutable before update or delete on public.permit_acknowledgements for each row execute function private.immutable_record();
create trigger amendment_immutable before update or delete on public.permit_amendments for each row execute function private.immutable_record();
create function private.ensure_profile() returns void language plpgsql security definer set search_path='' as $$ begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 insert into public.profiles(id,full_name) values(auth.uid(),coalesce((select email from auth.users where id=auth.uid()),'PCG Member')) on conflict do nothing;
end $$;
create function private.save_draft(input jsonb,target uuid default null) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid; old_draft jsonb; begin
 perform private.ensure_profile();
 if not private.has_permission('permit.create') then raise exception 'Missing permit.create permission'; end if;
 if jsonb_typeof(input)<>'object' or length(input::text)>1000000 then raise exception 'Invalid draft'; end if;
 if target is null then
  insert into public.permits(requester_id,draft,title) values(auth.uid(),input,coalesce(nullif(input->>'title',''),'Untitled permit')) returning id into result;
 else
  select draft into old_draft from public.permits where id=target and requester_id=auth.uid() and status in ('DRAFT','CHANGES_REQUIRED') for update;
  if not found then raise exception 'Editable draft not found'; end if;
  update public.permits set draft=input,title=coalesce(nullif(input->>'title',''),'Untitled permit'),version=version+1,updated_at=now() where id=target returning id into result;
 end if;
 insert into public.audit_events(permit_id,actor_id,action,entity,entity_id,old_value,new_value) values(result,auth.uid(),case when target is null then 'CREATED' else 'DRAFT_SAVED' end,'permit',result,old_draft,input);
 return result;
end $$;
create function public.save_permit_draft(input jsonb,target uuid default null) returns uuid language sql security invoker set search_path='' as $$select private.save_draft(input,target)$$;
revoke all on function private.ensure_profile(),private.save_draft(jsonb,uuid),public.save_permit_draft(jsonb,uuid) from public;
grant execute on function private.save_draft(jsonb,uuid),public.save_permit_draft(jsonb,uuid) to authenticated;

create function private.validate_submission(d jsonb) returns void language plpgsql set search_path='' as $$
declare h jsonb; w jsonb; a text; c text; required_controls text[]:=array['Site rules read and understood','Work area demarcated','Safety barrier / cordon installed','Warning signage installed','Access restricted','Housekeeping acceptable','Lighting adequate','Emergency access maintained','Area fenced']; begin
 foreach c in array array['title','description','purpose','department','location','requester','holder','contractor','phone','email','start','end'] loop
  if length(trim(coalesce(d->>c,'')))=0 then raise exception 'Missing required field: %',c; end if;
 end loop;
 if (d->>'end')::timestamptz <= (d->>'start')::timestamptz then raise exception 'Invalid validity'; end if;
 if coalesce((d->>'confirmed')::boolean,false)=false then raise exception 'Requester declaration required'; end if;
 foreach c in array array['contractorApproved','documentationComplete','certificateAvailable','sheComplete'] loop
  if coalesce((d->>c)::boolean,false)=false then raise exception 'Contractor verification incomplete: %',c; end if;
 end loop;
 if jsonb_array_length(coalesce(d->'workers','[]'))=0 or jsonb_array_length(coalesce(d->'hazards','[]'))=0 or jsonb_array_length(coalesce(d->'activities','[]'))=0 or jsonb_array_length(coalesce(d->'ppe','[]'))=0 then raise exception 'Workers, hazards, activities and PPE required'; end if;
 for w in select value from jsonb_array_elements(d->'workers') loop
  if coalesce(w->>'name','')='' or coalesce(w->>'identity','')='' or coalesce(w->>'company','')='' or coalesce(w->>'trade','')='' or coalesce((w->>'inducted')::boolean,false)=false or nullif(w->>'expiry','') is null or (w->>'expiry')::date < (d->>'end')::timestamptz::date then raise exception 'Worker details, induction or certificate invalid'; end if;
 end loop;
 for h in select value from jsonb_array_elements(d->'hazards') loop
  foreach c in array array['hazard','consequence','affected','controls','responsible'] loop if length(trim(coalesce(h->>c,'')))<2 then raise exception 'Incomplete risk assessment'; end if; end loop;
  foreach c in array array['likelihood','severity','residualLikelihood','residualSeverity'] loop if coalesce((h->>c)::int,0) not between 1 and 5 then raise exception 'Invalid risk score'; end if; end loop;
  if (h->>'residualLikelihood')::int*(h->>'residualSeverity')::int >=17 then raise exception 'Extreme residual risk blocks submission'; end if;
 end loop;
 foreach c in array required_controls loop if not (coalesce(d->'controls','[]') ? c) then raise exception 'Missing safety control: %',c; end if; end loop;
 -- Specialist verification is independently required before activation.
end $$;

create function private.transition_permit(target uuid,next_status public.permit_status,reason text,checks jsonb default '{}') returns void language plpgsql security definer set search_path='' as $$
declare p public.permits; permission text; h jsonb; w jsonb; assessment uuid; step public.permit_approval_steps; old_status public.permit_status; begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if length(trim(reason))<3 then raise exception 'A meaningful reason is required'; end if;
 select * into p from public.permits where id=target for update;
 if not found or not private.can_read_permit(target) then raise exception 'Permit not found'; end if;
 old_status:=p.status;
 permission:=case
 when p.status in ('DRAFT','CHANGES_REQUIRED') and next_status='SUBMITTED' then 'permit.submit'
 when p.status='SUBMITTED' and next_status='UNDER_REVIEW' then 'permit.review'
 when p.status='UNDER_REVIEW' and next_status in ('CHANGES_REQUIRED','PENDING_APPROVAL') then 'permit.review'
 when p.status='PENDING_APPROVAL' and next_status in ('APPROVED','CHANGES_REQUIRED','CANCELLED') then 'permit.approve'
 when p.status='APPROVED' and next_status='ISSUED' then 'permit.issue'
 when p.status='ISSUED' and next_status='ACTIVE' then 'permit.activate'
 when p.status='ACTIVE' and next_status='SUSPENDED' then 'permit.suspend'
 when p.status='SUSPENDED' and next_status='ACTIVE' then 'permit.resume'
 when p.status='ACTIVE' and next_status='COMPLETION_REQUESTED' then 'permit.close'
 when p.status='COMPLETION_REQUESTED' and next_status='CLOSED' then 'permit.close'
 when p.status in ('DRAFT','SUSPENDED') and next_status='CANCELLED' then 'permit.cancel'
 else null end;
 if permission is null then raise exception 'Invalid transition: % -> %',p.status,next_status; end if;
 if not private.has_permission(permission) then raise exception 'Missing permission: %',permission; end if;
 if next_status='SUBMITTED' then
  if p.requester_id<>auth.uid() then raise exception 'Only the requester may submit'; end if;
  perform private.validate_submission(p.draft);
  update public.permits set submitted_version=p.version,starts_at=(p.draft->>'start')::timestamp at time zone 'Asia/Kuala_Lumpur',ends_at=(p.draft->>'end')::timestamp at time zone 'Asia/Kuala_Lumpur',original_ends_at=(p.draft->>'end')::timestamp at time zone 'Asia/Kuala_Lumpur' where id=target;
  -- Snapshot each submitted assessment version; retain every older version.
  insert into public.risk_assessments(permit_id,version,created_by) values(target,p.version,auth.uid()) returning id into assessment;
  for h in select value from jsonb_array_elements(p.draft->'hazards') loop
   insert into public.risk_hazards(permit_id,assessment_id,hazard,consequence,affected,controls,responsible_person,likelihood,severity,residual_likelihood,residual_severity) values(target,assessment,h->>'hazard',h->>'consequence',h->>'affected',h->>'controls',h->>'responsible',(h->>'likelihood')::int,(h->>'severity')::int,(h->>'residualLikelihood')::int,(h->>'residualSeverity')::int);
  end loop;
  for w in select value from jsonb_array_elements(p.draft->'workers') loop insert into public.permit_workers(permit_id,submission_version,name,identity_reference,company,trade,phone,competency,certificate_expiry,inducted) values(target,p.version,w->>'name',w->>'identity',w->>'company',w->>'trade',w->>'phone',w->>'competency',(w->>'expiry')::date,(w->>'inducted')::boolean); end loop;
 end if;
 if next_status='PENDING_APPROVAL' then
  if exists(select 1 from public.permit_approval_steps where permit_id=target) then raise exception 'Approval cycle requires administrative review; historical approvals are preserved'; end if;
  insert into public.permit_approval_steps(permit_id,position,role_id) select target,s.position,s.role_id from public.approval_template_steps s join public.approval_templates t on t.id=s.template_id where t.active and (s.activity is null or (p.draft->'activities')?s.activity);
  if not found then raise exception 'No approval template is configured'; end if;
 end if;
 if p.status='PENDING_APPROVAL' then
  select * into step from public.permit_approval_steps where permit_id=target and status='PENDING' order by position limit 1 for update;
  if not found then raise exception 'No pending approval step'; end if;
  if not exists(select 1 from public.user_roles where user_id=auth.uid() and role_id=step.role_id) then raise exception 'Current step requires its configured approval role'; end if;
  if p.requester_id=auth.uid() then raise exception 'Requester cannot approve their own permit'; end if;
  if coalesce((checks->>'reviewed')::boolean,false)=false then raise exception 'Critical safety information must be reviewed'; end if;
  insert into public.permit_approvals(permit_id,step_id,approver_id,decision,comments,acknowledgement) values(target,step.id,auth.uid(),case next_status when 'APPROVED' then 'APPROVE' when 'CHANGES_REQUIRED' then 'REQUEST_CHANGES' else 'REJECT' end,reason,'Critical safety information reviewed');
  update public.permit_approval_steps set status=case next_status when 'APPROVED' then 'APPROVED' when 'CHANGES_REQUIRED' then 'CHANGES_REQUIRED' else 'REJECTED' end where id=step.id;
  if next_status='APPROVED' and exists(select 1 from public.permit_approval_steps where permit_id=target and status<>'APPROVED') then
   insert into public.audit_events(permit_id,actor_id,action,entity,entity_id,reason) values(target,auth.uid(),'APPROVAL_STEP_COMPLETED','permit',target,reason);return;
  end if;
 end if;
 if next_status='ISSUED' then
  if not exists(select 1 from public.permit_approval_steps where permit_id=target) or exists(select 1 from public.permit_approval_steps where permit_id=target and status<>'APPROVED') then raise exception 'All configured approvals must be complete'; end if;
  if p.holder_id is null then raise exception 'Assign an authenticated permit holder before issuance'; end if;
  if not exists(select 1 from public.system_settings where key='risk_matrix' and value->>'approved_by_hse'='true') then raise exception 'The risk matrix must be approved by PCG HSE before issuance'; end if;
 end if;
 if next_status='ACTIVE' then
  if p.ends_at is null or p.ends_at<=now() or p.starts_at>now() then raise exception 'Permit is outside its validity'; end if;
  if coalesce((checks->>'inspected')::boolean,false)=false or coalesce((checks->>'controls')::boolean,false)=false or coalesce((checks->>'acknowledged')::boolean,false)=false then raise exception 'Reinspection, controls and acknowledgement required'; end if;
  if p.status='ISSUED' and p.holder_id<>auth.uid() then raise exception 'Activation requires the authenticated holder'; end if;
  if (p.draft->'activities') ?| array['Mechanical work','Electrical work','Confined Space'] and not exists(select 1 from public.loto_records where permit_id=target and zero_energy_verified and verified_by is not null and verified_at is not null) then raise exception 'Mandatory independent LOTO verification is incomplete'; end if;
  if (p.draft->'activities') ? 'Hot Work' and not exists(select 1 from public.hot_work_details where permit_id=target and fire_watch_id is not null and valid_from<=now() and valid_until>now()) then raise exception 'Verified hot-work controls and fire watch required'; end if;
  if (p.draft->'activities') ? 'Confined Space' then
   if not exists(select 1 from public.system_settings where key='gas_limits' and value->>'approved_by_hse'='true' and jsonb_array_length(value->'parameters')>0) then raise exception 'HSE-approved gas limits are not configured; entry prohibited'; end if;
   if not exists(select 1 from public.confined_space_details where permit_id=target and attendant_id is not null and supervisor_id is not null and rescue_team is not null) then raise exception 'Confined-space supervision is incomplete'; end if;
   if not exists(select 1 from public.gas_tests g where g.permit_id=target and g.id=(select latest.id from public.gas_tests latest where latest.permit_id=target order by latest.measured_at desc,latest.created_at desc limit 1) and g.measured_at<=now() and g.measured_at>now()-interval '30 minutes' and g.calibration_valid_until>now() and not exists(select 1 from jsonb_array_elements((select value->'parameters' from public.system_settings where key='gas_limits')) lim where not exists(select 1 from public.gas_test_readings r where r.test_id=g.id and r.parameter=lim->>'parameter' and r.unit=lim->>'unit' and (lim->>'min' is null or r.measured_value>=(lim->>'min')::numeric) and (lim->>'max' is null or r.measured_value<=(lim->>'max')::numeric))) and not exists(select 1 from public.gas_test_readings r where r.test_id=g.id and not r.passed)) then raise exception 'Recent passing gas tests required; entry prohibited'; end if;
  end if;
  insert into public.permit_acknowledgements(permit_id,user_id,kind,statement) values(target,auth.uid(),case when p.status='SUSPENDED' then 'RESUMPTION' else 'ACTIVATION' end,reason);
  insert into public.permit_work_sessions(permit_id,started_by,worker_count,pre_work_confirmation) values(target,auth.uid(),jsonb_array_length(p.draft->'workers'),true);
  if p.status='SUSPENDED' then insert into public.permit_resumptions(permit_id,corrective_action,reinspected,approved_by) values(target,reason,true,auth.uid()); end if;
 end if;
 if next_status='SUSPENDED' then insert into public.permit_suspensions(permit_id,reason_category,remarks,suspended_by) values(target,coalesce(checks->>'category','Other'),reason,auth.uid()); end if;
 if next_status in ('SUSPENDED','COMPLETION_REQUESTED','CANCELLED','CLOSED') then update public.permit_work_sessions set stopped_at=now(),stopped_by=auth.uid(),stop_reason=reason where permit_id=target and stopped_at is null; end if;
 if next_status='CLOSED' then
  if not exists(select 1 from public.permit_closures where permit_id=target) then raise exception 'Separate authenticated holder and issuer closure acknowledgements required'; end if;
 end if;
 update public.permits set status=next_status,updated_at=now(),version=version+1 where id=target;
 insert into public.audit_events(permit_id,actor_id,action,entity,entity_id,old_value,new_value,reason) values(target,auth.uid(),next_status::text,'permit',target,jsonb_build_object('status',old_status),jsonb_build_object('status',next_status),reason);
 insert into public.notifications(user_id,permit_id,event,message) values(p.requester_id,target,next_status::text,reason);
end $$;
create function public.transition_permit(target uuid,next_status public.permit_status,reason text,checks jsonb default '{}') returns void language sql security invoker set search_path='' as $$select private.transition_permit(target,next_status,reason,checks)$$;
revoke all on function private.transition_permit(uuid,public.permit_status,text,jsonb),public.transition_permit(uuid,public.permit_status,text,jsonb) from public;
grant execute on function private.transition_permit(uuid,public.permit_status,text,jsonb),public.transition_permit(uuid,public.permit_status,text,jsonb) to authenticated;

-- Public verification returns an explicit safe projection. Token has 122 random bits.
create function private.verify_permit(token uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('number',p.system_permit_number,'title',p.title,'type',p.draft->'activities'->>0,'location',p.draft->>'location','contractor',p.draft->>'contractor','holder',p.draft->>'holder','start',p.starts_at,'end',p.ends_at,'status',case when p.status in ('ACTIVE','ISSUED','SUSPENDED') and p.ends_at<=now() then 'EXPIRED' else p.status::text end,'workers',(select count(*) from public.permit_workers w where w.permit_id=p.id and w.submission_version=p.submitted_version),'updated_at',p.updated_at) from public.permits p where verification_token=token and p.status not in ('DRAFT','SUBMITTED','UNDER_REVIEW','CHANGES_REQUIRED','PENDING_APPROVAL');
$$;
create function public.verify_permit(token uuid) returns jsonb language sql security invoker set search_path='' as $$select private.verify_permit(token)$$;
revoke all on function private.verify_permit(uuid),public.verify_permit(uuid) from public;
grant usage on schema private to anon;
grant execute on function private.verify_permit(uuid),public.verify_permit(uuid) to anon,authenticated;

create function private.expire_permits() returns integer language plpgsql security definer set search_path='' as $$declare p record;n integer:=0;begin
 for p in select id,status,requester_id from public.permits where status in ('ACTIVE','ISSUED','SUSPENDED') and ends_at<=now() for update skip locked loop
  update public.permits set status='EXPIRED',updated_at=now(),version=version+1 where id=p.id;
  update public.permit_work_sessions set stopped_at=now(),stop_reason='Permit expired' where permit_id=p.id and stopped_at is null;
  insert into public.audit_events(permit_id,action,entity,entity_id,old_value,new_value,reason) values(p.id,'EXPIRED','permit',p.id,jsonb_build_object('status',p.status),jsonb_build_object('status','EXPIRED'),'Scheduled validity enforcement');
  insert into public.notifications(user_id,permit_id,event,message) values(p.requester_id,p.id,'EXPIRED','Permit expired. Work must stop.');n:=n+1;
 end loop;return n;end $$;
revoke all on function private.expire_permits() from public,anon,authenticated;
-- Schedule select private.expire_permits() every minute through pg_cron after HSE review.

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('permit-documents','permit-documents',false,10485760,array['application/pdf','image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy permit_document_read on storage.objects for select to authenticated using(bucket_id='permit-documents' and private.can_read_permit((storage.foldername(name))[1]::uuid));
create policy permit_document_upload on storage.objects for insert to authenticated with check(bucket_id='permit-documents' and private.has_permission('permit.create') and exists(select 1 from public.permits where id=(storage.foldername(name))[1]::uuid and requester_id=auth.uid() and status in ('DRAFT','CHANGES_REQUIRED')));
