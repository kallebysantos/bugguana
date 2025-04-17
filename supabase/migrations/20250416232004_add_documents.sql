create extension if not exists "vector" with schema "extensions";

-- Cron
create extension pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

create schema if not exists "private";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION private.handle_new_documents_batch()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
  declare
    result bigint;
begin
  perform pgmq.create('documents')
  where not exists (
    select 1 from pgmq.list_queues() where queue_name = 'documents'
  );

  with aggregated as (
    select array_agg(jsonb_build_object('id', n.id)) as msgs
    from new_table n
  ),
  send as (
    select pgmq.send_batch('documents', msgs)
    from aggregated
    where msgs is not null
  )
  select count(*) from send into result;

  return null;
end;
$function$
;

-- ping edge worker at every minute
select cron.schedule(
  'ping_handle_documents_worker',
  '30 seconds',
  $$
    select edge_worker.spawn('handle-documents')
  $$
);

create table "public"."documents" (
    "id" uuid not null default uuid_generate_v4(),
    "title" text not null,
    "content" text not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone
);


CREATE UNIQUE INDEX documents_pkey ON public.documents USING btree (id);

alter table "public"."documents" add constraint "documents_pkey" PRIMARY KEY using index "documents_pkey";

grant delete on table "public"."documents" to "anon";

grant insert on table "public"."documents" to "anon";

grant references on table "public"."documents" to "anon";

grant select on table "public"."documents" to "anon";

grant trigger on table "public"."documents" to "anon";

grant truncate on table "public"."documents" to "anon";

grant update on table "public"."documents" to "anon";

grant delete on table "public"."documents" to "authenticated";

grant insert on table "public"."documents" to "authenticated";

grant references on table "public"."documents" to "authenticated";

grant select on table "public"."documents" to "authenticated";

grant trigger on table "public"."documents" to "authenticated";

grant truncate on table "public"."documents" to "authenticated";

grant update on table "public"."documents" to "authenticated";

grant delete on table "public"."documents" to "service_role";

grant insert on table "public"."documents" to "service_role";

grant references on table "public"."documents" to "service_role";

grant select on table "public"."documents" to "service_role";

grant trigger on table "public"."documents" to "service_role";

grant truncate on table "public"."documents" to "service_role";

grant update on table "public"."documents" to "service_role";

CREATE TRIGGER on_new_document AFTER INSERT ON public.documents REFERENCING NEW TABLE AS new_table FOR EACH STATEMENT EXECUTE FUNCTION private.handle_new_documents_batch();

