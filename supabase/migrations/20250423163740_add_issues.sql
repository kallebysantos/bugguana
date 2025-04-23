create extension if not exists "vector" with schema "extensions";

-- Cron
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

create schema if not exists "private";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION private.handle_new_issues_batch()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
  declare
    result bigint;
begin
  with value as (
    select jsonb_build_object('id', n.id) as id
    from new_table n
  ),
  send as (
    select pgflow.start_flow('flow_apply_ai_processing', id)
    from value
  )
  select count(*) from send into result;

  return null;
end;
$function$
;

-- diff will not apply non-schema changes
-- ping edge worker at every 30s
select cron.schedule('ping_flow_apply_ai_processing_worker', '30 seconds',
  $$
    select edge_worker.spawn('flow-apply-ai-processing')
  $$
);

create table "public"."issues" (
    "id" uuid not null default uuid_generate_v4(),
    "title" text not null,
    "content" text not null,
    "status" text not null default 'new'::text,
    "tag" text,
    "summary" text,
    "kind" text,
    "category" text,
    "embeddings" halfvec(384),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone
);


CREATE INDEX issues_embeddings_idx ON public.issues USING hnsw (embeddings halfvec_ip_ops);

CREATE UNIQUE INDEX issues_pkey ON public.issues USING btree (id);

alter table "public"."issues" add constraint "issues_pkey" PRIMARY KEY using index "issues_pkey";

alter table "public"."issues" add constraint "issues_category_check" CHECK ((category = ANY (ARRAY['database'::text, 'security'::text, 'storage'::text, 'realtime'::text, 'infrastructure'::text]))) not valid;

alter table "public"."issues" validate constraint "issues_category_check";

alter table "public"."issues" add constraint "issues_kind_check" CHECK ((kind = ANY (ARRAY['issue'::text, 'help'::text]))) not valid;

alter table "public"."issues" validate constraint "issues_kind_check";

alter table "public"."issues" add constraint "issues_status_check" CHECK ((status = ANY (ARRAY['new'::text, 'processed'::text]))) not valid;

alter table "public"."issues" validate constraint "issues_status_check";

alter table "public"."issues" add constraint "issues_summary_check" CHECK ((length(summary) <= 1024)) not valid;

alter table "public"."issues" validate constraint "issues_summary_check";

grant delete on table "public"."issues" to "anon";

grant insert on table "public"."issues" to "anon";

grant references on table "public"."issues" to "anon";

grant select on table "public"."issues" to "anon";

grant trigger on table "public"."issues" to "anon";

grant truncate on table "public"."issues" to "anon";

grant update on table "public"."issues" to "anon";

grant delete on table "public"."issues" to "authenticated";

grant insert on table "public"."issues" to "authenticated";

grant references on table "public"."issues" to "authenticated";

grant select on table "public"."issues" to "authenticated";

grant trigger on table "public"."issues" to "authenticated";

grant truncate on table "public"."issues" to "authenticated";

grant update on table "public"."issues" to "authenticated";

grant delete on table "public"."issues" to "service_role";

grant insert on table "public"."issues" to "service_role";

grant references on table "public"."issues" to "service_role";

grant select on table "public"."issues" to "service_role";

grant trigger on table "public"."issues" to "service_role";

grant truncate on table "public"."issues" to "service_role";

grant update on table "public"."issues" to "service_role";

CREATE TRIGGER on_new_issues AFTER INSERT ON public.issues REFERENCING NEW TABLE AS new_table FOR EACH ROW EXECUTE FUNCTION private.handle_new_issues_batch();


