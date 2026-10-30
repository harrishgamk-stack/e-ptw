import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { validDraft } from "./fixtures";
import { activityKey, workRequirements } from "../src/lib/work-policy";
import { specialControls } from "../src/lib/domain";
test("migration, RLS, permissions, numbering, transition guards and audit immutability", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth; create schema storage;
 create table auth.users(id uuid primary key,email text);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key,name text,bucket_id text); alter table storage.objects enable row level security;
 create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1,'/') $$;
 `);
    for (const file of (await readdir("supabase/migrations"))
      .filter((name) => name.endsWith(".sql"))
      .sort())
      await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
    await db.exec(await readFile("supabase/seed.sql", "utf8"));
    // Verify the saved database validation without adding back removed form fields.
    const complete = validDraft();
    await db.query("select private.validate_submission($1::jsonb)", [
      JSON.stringify(complete),
    ]);
    await assert.rejects(
      db.query("select private.validate_submission($1::jsonb)", [
        JSON.stringify({
          ...complete,
          contractors: complete.contractors!.map((c) => ({
            ...c,
            acknowledged: false,
          })),
        }),
      ]),
      /Safety Induction/,
    );
    const highRisk = structuredClone(complete);
    highRisk.activities = ["Hot Work"];
    highRisk.hazards[0].activity = "Hot Work";
    highRisk.ppe = workRequirements(highRisk.activities).ppe;
    highRisk.special = {
      gasTesting: "not-required",
      gasJustification:
        "No flammable atmosphere identified in the isolated work area.",
    };
    for (const control of specialControls["Hot Work"])
      highRisk.special[`Hot Work:${control}`] = "yes";
    await assert.rejects(
      db.query("select private.validate_submission($1::jsonb)", [
        JSON.stringify(highRisk),
      ]),
      /Formal company risk assessment required/,
    );
    highRisk.companyRiskAssessment = {
      reference: "PCG-CRA-TEST",
      assessedBy: "Company assessor",
      assessmentDate: "2026-10-28",
      documentName: "company-ra.pdf",
      completed: true,
      activitiesKey: activityKey(highRisk.activities),
    };
    highRisk.documents = [
      {
        name: "company-ra.pdf",
        type: "Company risk assessment",
        path: "local-demo-metadata",
        expiry: "",
      },
    ];
    await db.query("select private.validate_submission($1::jsonb)", [
      JSON.stringify(highRisk),
    ]);
    await assert.rejects(
      db.query("select private.validate_submission($1::jsonb)", [
        JSON.stringify({ ...highRisk, documents: [] }),
      ]),
      /assessment document required/,
    );
    const functionSecurity = await db.query<{
      prosecdef: boolean;
      allowed: boolean;
      proconfig: string[];
    }>(
      "select p.prosecdef, p.proconfig, has_function_privilege('anon',p.oid,'EXECUTE') as allowed from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname='validate_submission'",
    );
    assert.equal(functionSecurity.rows[0].prosecdef, false);
    assert.equal(functionSecurity.rows[0].allowed, false);
    assert.ok(
      functionSecurity.rows[0].proconfig.some((c) =>
        c.startsWith("search_path="),
      ),
    );
    const user = "10000000-0000-4000-8000-000000000001",
      other = "10000000-0000-4000-8000-000000000002";
    await db.exec(
      `insert into auth.users values('${user}','requester@pcg.test'),('${other}','other@pcg.test');insert into public.profiles(id,full_name) values('${user}','Requester'),('${other}','Other');insert into public.user_roles select '${user}',id from public.roles where name='Requester';`,
    );
    const rls = await db.query<{ tablename: string }>(
      `select tablename from pg_tables where schemaname='public' and not rowsecurity`,
    );
    assert.equal(rls.rows.length, 0, "Every public table must have RLS");
    await db.exec(
      `set role authenticated;select set_config('request.jwt.claim.sub','${user}',false);`,
    );
    const first = await db.query<{ id: string }>(
      `select public.save_permit_draft('{"title":"Draft 1"}'::jsonb) as id`,
    );
    const id = first.rows[0].id;
    const second = await db.query<{ id: string }>(
      `select public.save_permit_draft('{"title":"Draft 2"}'::jsonb) as id`,
    );
    assert.notEqual(id, second.rows[0].id);
    const numbers = await db.query<{ system_permit_number: string }>(
      `select system_permit_number from public.permits`,
    );
    assert.equal(
      new Set(numbers.rows.map((n) => n.system_permit_number)).size,
      2,
    );
    await assert.rejects(
      db.exec(`update public.permits set status='ACTIVE' where id='${id}'`),
      /permission denied/i,
    );
    await assert.rejects(
      db.exec(
        `select public.transition_permit('${id}','ACTIVE','Try bypassing')`,
      ),
      /Invalid transition/i,
    );
    await assert.rejects(
      db.exec(
        `select public.transition_permit('${id}','SUBMITTED','Submit incomplete')`,
      ),
      /Missing required field/i,
    );
    await db.exec(
      `select set_config('request.jwt.claim.sub','${other}',false);`,
    );
    assert.equal(
      (await db.query(`select * from public.permits`)).rows.length,
      0,
      "Other user cannot read permit",
    );
    await assert.rejects(
      db.exec(`select public.save_permit_draft('{}')`),
      /Missing permit.create/i,
    );
    await db.exec(`reset role;`);
    await assert.rejects(
      db.exec(`delete from public.audit_events`),
      /immutable/i,
    );
    await assert.rejects(
      db.exec(`update public.audit_events set reason='tampered'`),
      /immutable/i,
    );
    await db.exec(
      `update public.permits set status='ACTIVE',ends_at=now()-interval '1 hour' where id='${id}'`,
    );
    const token = (
      await db.query<{ verification_token: string }>(
        `select verification_token from public.permits where id='${id}'`,
      )
    ).rows[0].verification_token;
    await db.exec(`set role anon`);
    const verified = await db.query<{
      record: { status: string; draft?: unknown };
    }>(`select public.verify_permit('${token}') as record`);
    assert.equal(verified.rows[0].record.status, "EXPIRED");
    assert.equal(verified.rows[0].record.draft, undefined);
    await assert.rejects(
      db.exec(`select * from public.permits`),
      /permission denied/i,
    );
    await db.exec("reset role");
    const supervisor = "10000000-0000-4000-8000-000000000003",
      hse = "10000000-0000-4000-8000-000000000004",
      manager = "10000000-0000-4000-8000-000000000005";
    for (const [actor, role] of [
      [supervisor, "Area Supervisor"],
      [hse, "HSE / Safety"],
      [manager, "Department Manager"],
    ]) {
      await db.query("insert into auth.users values($1,$2)", [
        actor,
        `${role}@pcg.test`,
      ]);
      await db.query(
        "insert into public.profiles(id,full_name) values($1,$2)",
        [actor, role],
      );
      await db.query(
        "insert into public.user_roles select $1,id from public.roles where name=$2",
        [actor, role],
      );
    }
    await db.exec(
      `set role authenticated;select set_config('request.jwt.claim.sub','${user}',false);`,
    );
    const submitted = await db.query<{ id: string }>(
      "select public.save_permit_draft($1::jsonb) as id",
      [JSON.stringify(validDraft())],
    );
    const completeId = submitted.rows[0].id;
    await db.query(
      `select public.transition_permit($1,'SUBMITTED','Requester declaration confirmed')`,
      [completeId],
    );
    await assert.rejects(
      db.query(
        `select public.transition_permit($1,'UNDER_REVIEW','Unauthorized review')`,
        [completeId],
      ),
      /Missing permission/i,
    );
    await db.exec(
      `select set_config('request.jwt.claim.sub','${supervisor}',false)`,
    );
    await db.query(
      `select public.transition_permit($1,'UNDER_REVIEW','Start area supervisor review')`,
      [completeId],
    );
    await db.query(
      `select public.transition_permit($1,'PENDING_APPROVAL','Work controls reviewed')`,
      [completeId],
    );
    await db.exec(`select set_config('request.jwt.claim.sub','${hse}',false)`);
    await assert.rejects(
      db.query(
        `select public.transition_permit($1,'APPROVED','Wrong approval order','{"reviewed":true}')`,
        [completeId],
      ),
      /configured approval role/i,
    );
    for (const actor of [supervisor, hse, manager]) {
      await db.exec(
        `select set_config('request.jwt.claim.sub','${actor}',false)`,
      );
      await assert.rejects(
        db.query(
          `select public.transition_permit($1,'APPROVED','Missing critical review')`,
          [completeId],
        ),
        /must be reviewed/i,
      );
      await db.query(
        `select public.transition_permit($1,'APPROVED','Critical information reviewed','{"reviewed":true}')`,
        [completeId],
      );
    }
    assert.equal(
      (
        await db.query<{ status: string }>(
          "select status from public.permits where id=$1",
          [completeId],
        )
      ).rows[0].status,
      "APPROVED",
    );
    await db.exec("reset role");
    await db.query(
      `insert into public.user_roles select $1,id from public.roles where name='Permit Issuer'`,
      [manager],
    );
    await db.exec(
      `set role authenticated;select set_config('request.jwt.claim.sub','${manager}',false)`,
    );
    await assert.rejects(
      db.query(
        `select public.transition_permit($1,'ISSUED','Attempt without authenticated holder')`,
        [completeId],
      ),
      /authenticated permit holder/i,
    );
    await db.exec("reset role");
    await db.query(`update public.permits set holder_id=$1 where id=$2`, [
      user,
      completeId,
    ]);
    await db.exec(
      `update public.system_settings set value=jsonb_set(value,'{approved_by_hse}','true') where key='risk_matrix'`,
    );
    await db.query(
      `insert into public.user_roles select $1,id from public.roles where name='Permit Holder'`,
      [user],
    );
    await db.exec(
      `set role authenticated;select set_config('request.jwt.claim.sub','${manager}',false)`,
    );
    await db.query(
      `select public.transition_permit($1,'ISSUED','Issue after all approvals')`,
      [completeId],
    );
    await db.exec(`select set_config('request.jwt.claim.sub','${user}',false)`);
    await assert.rejects(
      db.query(
        `select public.transition_permit($1,'ACTIVE','Attempt without control verification')`,
        [completeId],
      ),
      /controls and acknowledgement required/i,
    );
    await db.query(
      `select public.transition_permit($1,'ACTIVE','Holder accepts the approved permit conditions','{"inspected":true,"controls":true,"acknowledged":true}')`,
      [completeId],
    );
    assert.equal(
      (
        await db.query(
          `select * from public.permit_work_sessions where permit_id=$1 and stopped_at is null`,
          [completeId],
        )
      ).rows.length,
      1,
    );
    await db.exec(
      `select set_config('request.jwt.claim.sub','${supervisor}',false)`,
    );
    await db.query(
      `select public.transition_permit($1,'SUSPENDED','Unsafe condition identified')`,
      [completeId],
    );
    assert.equal(
      (
        await db.query(
          `select * from public.permit_work_sessions where permit_id=$1 and stopped_at is null`,
          [completeId],
        )
      ).rows.length,
      0,
    );
    await db.exec("reset role");
    await db.exec(`select setval('private.permit_number_seq',1000000,false)`);
    await db.exec(
      `set role authenticated;select set_config('request.jwt.claim.sub','${user}',false)`,
    );
    const rollover = await db.query<{ id: string }>(
      `select public.save_permit_draft('{}') as id`,
    );
    const number = (
      await db.query<{ system_permit_number: string }>(
        "select system_permit_number from public.permits where id=$1",
        [rollover.rows[0].id],
      )
    ).rows[0].system_permit_number;
    assert.ok(
      number.endsWith("-1000000"),
      "Permit sequence must not truncate numbers above six digits",
    );
  } finally {
    await db.close();
  }
});
