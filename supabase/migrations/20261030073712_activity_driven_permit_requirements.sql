-- Generated activity policy v1. Existing RLS, ownership and activation guards remain in force.
create or replace function private.validate_submission(d jsonb) returns void
language plpgsql security invoker set search_path='' as $$
declare
 h jsonb; w jsonb; contractor jsonb; assessment jsonb; activity text; item text;
 high_risk boolean := false;
 policy constant jsonb := '{"General work":{"highRisk":false,"ppe":["Safety shoes","Safety helmet"],"controls":[]},"High Risk Work":{"highRisk":true,"ppe":["Safety shoes","Safety helmet"],"controls":[]},"Mechanical work":{"highRisk":true,"ppe":["Safety shoes","Safety helmet"],"controls":["Isolation required","Zero-energy verification completed","Release authorization"]},"Electrical work":{"highRisk":true,"ppe":["Safety shoes","Safety helmet","Safety glasses"],"controls":["Isolation required","Zero-energy verification completed","Release authorization"]},"Electrical tools":{"highRisk":false,"ppe":["Safety shoes","Safety helmet"],"controls":[]},"ATEX area":{"highRisk":true,"ppe":["Safety shoes","Safety helmet"],"controls":[]},"Drilling / sawing":{"highRisk":false,"ppe":["Safety shoes","Safety helmet"],"controls":[]},"Working at height":{"highRisk":true,"ppe":["Safety shoes","Safety helmet","Full-body harness","Fall protection"],"controls":["Full-body harness inspected","Anchorage / lifeline approved","Scaffold / platform approved","Ladder / scaffold inspection completed","Drop zone barricaded","Rescue arrangements confirmed","Competent person verified"]},"Hoisting / lifting":{"highRisk":true,"ppe":["Safety shoes","Safety helmet"],"controls":["Lifting plan approved","Certified operator","Rigger verified","Signalman verified","Equipment certificate valid","Barricaded area","Weather acceptable","Pre-lift inspection"]},"Asbestos":{"highRisk":true,"ppe":["Safety shoes","Safety helmet"],"controls":[]},"Lone working":{"highRisk":false,"ppe":["Safety shoes","Safety helmet"],"controls":[]},"Safety override / bridging":{"highRisk":true,"ppe":["Safety shoes","Safety helmet"],"controls":[]},"CO exposure":{"highRisk":true,"ppe":["Safety shoes","Safety helmet"],"controls":[]},"Detector isolation":{"highRisk":false,"ppe":["Safety shoes","Safety helmet"],"controls":[]},"Excavation":{"highRisk":true,"ppe":["Safety shoes","Safety helmet"],"controls":[]},"Digging / boring":{"highRisk":true,"ppe":["Safety shoes","Safety helmet"],"controls":[]},"Hazardous substances":{"highRisk":true,"ppe":["Safety shoes","Safety helmet"],"controls":[]},"Environmental impact":{"highRisk":false,"ppe":["Safety shoes","Safety helmet"],"controls":["SDS attached","Storage arrangements confirmed","Waste disposal arranged","Spill protection","Drain protection","Dust control","Noise control","Odour control","Air emission control"]},"Hot Work":{"highRisk":true,"ppe":["Safety shoes","Safety helmet","Face shield","Welding gloves","Heat-resistant clothing"],"controls":["Fire extinguisher available","Fire watch assigned","Combustible materials removed or covered","Flammables removed","Fire blanket available","Gas cylinders secured","Ventilation adequate","Welding / cutting PPE available","Work area barricaded","Gas testing applicability assessed","Production Manager permission approved"]},"Confined Space":{"highRisk":true,"ppe":["Safety shoes","Safety helmet"],"controls":["Energy sources isolated","LOTO verified","Ventilation adequate","Rescue team confirmed","Communication tested","Low-voltage lighting","Suitable electrical equipment","Entry supervisor verified"]},"Other":{"highRisk":false,"ppe":["Safety shoes","Safety helmet"],"controls":[]}}'::jsonb;
 site_controls constant jsonb := '["Site rules read and understood","Work area demarcated","Safety barrier / cordon installed","Warning signage installed","Access restricted","Housekeeping acceptable","Lighting adequate","Emergency access maintained","Area fenced"]'::jsonb;
 activity_key text;
begin
 foreach item in array array['title','description','purpose','department','location','requester','requesterDepartment','holder','phone','start','end'] loop
  if length(trim(coalesce(d->>item,'')))=0 then raise exception 'Missing required field: %', item; end if;
 end loop;
 if (d->>'end')::timestamptz <= (d->>'start')::timestamptz then raise exception 'Invalid validity'; end if;
 if coalesce(d->'confirmed','false'::jsonb) <> 'true'::jsonb then raise exception 'Requester declaration required'; end if;
 if jsonb_typeof(coalesce(d->'contractors','[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(d->'contractors','[]'::jsonb)) > 25 then raise exception 'Invalid contractor count'; end if;
 for contractor in select value from jsonb_array_elements(coalesce(d->'contractors','[]'::jsonb)) loop
  if length(trim(coalesce(contractor->>'name',''))) < 2 or coalesce(contractor->>'phone','') !~ '^[+0-9][0-9 ()-]{5,24}$' then raise exception 'Contractor name and phone required'; end if;
  if coalesce(contractor->'safetyInduction','false'::jsonb) <> 'true'::jsonb or coalesce(contractor->'acknowledged','false'::jsonb) <> 'true'::jsonb then raise exception 'Contractor Safety Induction and acknowledgement required'; end if;
 end loop;
 if jsonb_array_length(coalesce(d->'workers','[]'::jsonb))=0 or jsonb_array_length(coalesce(d->'hazards','[]'::jsonb))=0 or jsonb_array_length(coalesce(d->'activities','[]'::jsonb))=0 then raise exception 'Workers, hazards and activities required'; end if;
 for w in select value from jsonb_array_elements(d->'workers') loop
  if coalesce(w->>'name','')='' or coalesce(w->>'identity','')='' or coalesce(w->>'company','')='' or coalesce(w->>'trade','')='' or coalesce(w->'inducted','false'::jsonb) <> 'true'::jsonb or nullif(w->>'expiry','') is null or (w->>'expiry')::date < (d->>'end')::timestamptz::date then raise exception 'Worker details, Safety Induction or certificate invalid'; end if;
 end loop;
 for h in select value from jsonb_array_elements(d->'hazards') loop
  foreach item in array array['hazard','consequence','affected','controls','responsible'] loop if length(trim(coalesce(h->>item,'')))<2 then raise exception 'Incomplete risk assessment'; end if; end loop;
  foreach item in array array['likelihood','severity','residualLikelihood','residualSeverity'] loop if coalesce((h->>item)::int,0) not between 1 and 5 then raise exception 'Invalid risk score'; end if; end loop;
  if (h->>'residualLikelihood')::int * (h->>'residualSeverity')::int >= 17 then raise exception 'Extreme residual risk blocks submission'; end if;
  if (h->>'likelihood')::int * (h->>'severity')::int >= 10 then high_risk := true; end if;
 end loop;
 for item in select jsonb_array_elements_text(site_controls) loop if not(coalesce(d->'controls','[]'::jsonb) ? item) then raise exception 'Missing safety control: %',item; end if; end loop;
 for activity in select jsonb_array_elements_text(d->'activities') loop
  if not exists(select 1 from jsonb_array_elements(d->'hazards') as hazard_row(value) where hazard_row.value->>'activity'=activity) then raise exception 'Generated activity risk assessment required: %',activity; end if;
  if not(policy ? activity) then raise exception 'Unknown work activity: %',activity; end if;
  if (policy->activity->>'highRisk')::boolean then high_risk := true; end if;
  for item in select jsonb_array_elements_text(policy->activity->'ppe') loop if not(coalesce(d->'ppe','[]'::jsonb) ? item) then raise exception 'Missing mandatory PPE: %',item; end if; end loop;
  for item in select jsonb_array_elements_text(policy->activity->'controls') loop if coalesce(d->'special'->>(activity||':'||item),'') <> 'yes' then raise exception 'Missing activity safety control: %: %',activity,item; end if; end loop;
 end loop;
 if (d->'activities') ? 'Hot Work' then
  if coalesce(d->'special'->>'gasTesting','') not in ('required','not-required') then raise exception 'Hot Work gas testing applicability required'; end if;
  if d->'special'->>'gasTesting'='not-required' and length(trim(coalesce(d->'special'->>'gasJustification',''))) < 10 then raise exception 'Hot Work gas testing justification required'; end if;
 end if;
 if high_risk then
  assessment := coalesce(d->'companyRiskAssessment','{}'::jsonb);
  select string_agg(a,'|' order by a) into activity_key from jsonb_array_elements_text(d->'activities') a;
  if length(trim(coalesce(assessment->>'reference',''))) < 3 or length(trim(coalesce(assessment->>'assessedBy',''))) < 2 or coalesce(assessment->'completed','false'::jsonb) <> 'true'::jsonb or coalesce(assessment->>'activitiesKey','') <> activity_key or coalesce(assessment->>'assessmentDate','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'Formal company risk assessment required before high-risk submission'; end if;
  if (assessment->>'assessmentDate')::date > (now() at time zone 'Asia/Kuala_Lumpur')::date then raise exception 'Company risk assessment date cannot be in the future'; end if;
  if not exists(select 1 from jsonb_array_elements(coalesce(d->'documents','[]'::jsonb)) doc where doc->>'name'=assessment->>'documentName' and doc->>'type' in ('Company risk assessment','Risk assessment')) then raise exception 'Formal company risk assessment document required'; end if;
 end if;
end $$;
revoke all on function private.validate_submission(jsonb) from public, anon, authenticated;
