set check_function_bodies = off;

CREATE OR REPLACE FUNCTION private.handle_new_documents_sections_batch()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
  declare
    result bigint;
begin
  perform pgmq.create('documents_sections')
  where not exists (
    select 1 from pgmq.list_queues() where queue_name = 'documents_sections'
  );

  with aggregated as (
    select array_agg(jsonb_build_object('id', n.id)) as msgs
    from new_table n
  ),
  send as (
    select pgmq.send_batch('documents_sections', msgs)
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
  'ping_handle_documents_sections_worker',
  '30 seconds',
  $$
    select edge_worker.spawn('handle-documents-sections')
  $$
);

create table "public"."documents_sections" (
    "id" uuid not null default uuid_generate_v4(),
    "document_id" uuid not null,
    "content" text not null,
    "embeddings" halfvec(384),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone
);


CREATE INDEX documents_sections_embeddings_idx ON public.documents_sections USING hnsw (embeddings halfvec_ip_ops);

CREATE UNIQUE INDEX documents_sections_pkey ON public.documents_sections USING btree (id);

alter table "public"."documents_sections" add constraint "documents_sections_pkey" PRIMARY KEY using index "documents_sections_pkey";

alter table "public"."documents_sections" add constraint "documents_sections_document_id_fkey" FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE not valid;

alter table "public"."documents_sections" validate constraint "documents_sections_document_id_fkey";

grant delete on table "public"."documents_sections" to "anon";

grant insert on table "public"."documents_sections" to "anon";

grant references on table "public"."documents_sections" to "anon";

grant select on table "public"."documents_sections" to "anon";

grant trigger on table "public"."documents_sections" to "anon";

grant truncate on table "public"."documents_sections" to "anon";

grant update on table "public"."documents_sections" to "anon";

grant delete on table "public"."documents_sections" to "authenticated";

grant insert on table "public"."documents_sections" to "authenticated";

grant references on table "public"."documents_sections" to "authenticated";

grant select on table "public"."documents_sections" to "authenticated";

grant trigger on table "public"."documents_sections" to "authenticated";

grant truncate on table "public"."documents_sections" to "authenticated";

grant update on table "public"."documents_sections" to "authenticated";

grant delete on table "public"."documents_sections" to "service_role";

grant insert on table "public"."documents_sections" to "service_role";

grant references on table "public"."documents_sections" to "service_role";

grant select on table "public"."documents_sections" to "service_role";

grant trigger on table "public"."documents_sections" to "service_role";

grant truncate on table "public"."documents_sections" to "service_role";

grant update on table "public"."documents_sections" to "service_role";

CREATE TRIGGER on_new_documents_section AFTER INSERT ON public.documents_sections REFERENCING NEW TABLE AS new_table FOR EACH STATEMENT EXECUTE FUNCTION private.handle_new_documents_sections_batch();


