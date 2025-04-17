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
  perform pgmq.create('issues')
  where not exists (
    select 1 from pgmq.list_queues() where queue_name = 'issues'
  );

  with aggregated as (
    select array_agg(jsonb_build_object('id', n.id)) as msgs
    from new_table n
  ),
  send as (
    select pgmq.send_batch('issues', msgs)
    from aggregated
    where msgs is not null
  )
  select count(*) from send into result;

  return null;
end;
$function$
;

select cron.schedule('ping_new_issue_worker', '30 seconds',
  $$
    select edge_worker.spawn('handle-new-issue')
  $$
);

CREATE OR REPLACE FUNCTION private.handle_on_summary_apply_embed_batch()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
  declare
    result bigint;
begin
  perform pgmq.create('embed-issue')
  where not exists (
    select 1 from pgmq.list_queues() where queue_name = 'embed-issue'
  );

  perform pgmq.send('embed-issue', jsonb_build_object('id', new.id));

  return new;
end;
$function$
;

select cron.schedule('ping_embed_issue_worker', '30 seconds',
  $$
    select edge_worker.spawn('embed-issue')
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

CREATE TRIGGER on_new_issues AFTER INSERT ON public.issues REFERENCING NEW TABLE AS new_table FOR EACH STATEMENT EXECUTE FUNCTION private.handle_new_issues_batch();

CREATE TRIGGER on_summary_apply_embed AFTER INSERT OR UPDATE OF summary ON public.issues FOR EACH ROW WHEN ((new.summary IS NOT NULL)) EXECUTE FUNCTION private.handle_on_summary_apply_embed_batch();


