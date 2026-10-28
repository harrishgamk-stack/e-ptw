insert into public.permissions(key,description) select key,replace(key,'.',' ') from unnest(array['permit.create','permit.submit','permit.review','permit.issue','permit.approve','permit.activate','permit.suspend','permit.resume','permit.extend','permit.close','permit.verify','permit.view_all','permit.cancel','permit.expire','risk.edit','contractor.manage','reports.view','audit.view','settings.manage']) key on conflict do nothing;
insert into public.roles(name) select unnest(array['Super Admin','HSE / Safety','Permit Issuer','Hot Work Issuer','Confined Space Issuer','Department Manager','Area Supervisor','Requester','Permit Holder','Contractor','Security / Verification User','Viewer / Auditor']) on conflict do nothing;
insert into public.role_permissions(role_id,permission_key) select r.id,p.key from public.roles r cross join public.permissions p where r.name='Super Admin' on conflict do nothing;
insert into public.role_permissions(role_id,permission_key) select r.id,unnest(case r.name
 when 'HSE / Safety' then array['permit.create','permit.submit','permit.review','permit.approve','permit.suspend','permit.resume','permit.close','permit.view_all','risk.edit','reports.view','audit.view']
 when 'Permit Issuer' then array['permit.review','permit.issue','permit.suspend','permit.resume','permit.extend','permit.close','permit.view_all']
 when 'Hot Work Issuer' then array['permit.approve','permit.view_all']
 when 'Confined Space Issuer' then array['permit.approve','permit.view_all']
 when 'Department Manager' then array['permit.approve','permit.view_all','reports.view']
 when 'Area Supervisor' then array['permit.approve','permit.review','permit.suspend','permit.view_all']
 when 'Requester' then array['permit.create','permit.submit','permit.cancel']
 when 'Permit Holder' then array['permit.activate','permit.close']
 when 'Contractor' then array['permit.create','permit.submit']
 when 'Security / Verification User' then array['permit.verify']
 when 'Viewer / Auditor' then array['permit.view_all','reports.view','audit.view']
 else array[]::text[] end) from public.roles r on conflict do nothing;
insert into public.departments(name) values('Engineering'),('Maintenance'),('Facilities'),('Operations'),('HSE') on conflict do nothing;
insert into public.locations(name) values('Warehouse A'),('Production Block A'),('Production Block B'),('Utilities Plant'),('Electrical Room 2'),('Pump House'),('Logistics Centre'),('Admin Building') on conflict do nothing;
insert into public.permit_types(name) values('General work'),('Hot Work'),('Confined Space'),('Electrical work'),('Mechanical work'),('Working at height'),('Hoisting / lifting') on conflict do nothing;
insert into public.approval_templates(name) values('PCG standard approval') on conflict do nothing;
insert into public.approval_template_steps(template_id,position,role_id,activity) select t.id,v.position,r.id,v.activity from (values(1,'Area Supervisor',null),(2,'HSE / Safety',null),(3,'Department Manager',null),(4,'Hot Work Issuer','Hot Work'),(5,'Confined Space Issuer','Confined Space')) as v(position,role_name,activity) join public.roles r on r.name=v.role_name cross join public.approval_templates t where t.name='PCG standard approval' on conflict do nothing;
insert into public.system_settings(key,value) values
 ('risk_matrix','{"low_max":4,"medium_max":9,"high_max":16,"extreme_max":25,"approved_by_hse":false}'),
 ('max_extension_days','7'),('max_validity_hours','24'),('notification_lead_minutes','60'),
 ('rih_labels','{"R":null,"I":null,"H":null}'),('gas_limits','{"approved_by_hse":false,"parameters":[]}') on conflict do nothing;
-- No account receives a role automatically. Bootstrap the first admin deliberately.
