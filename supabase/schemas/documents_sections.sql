create table if not exists documents_sections (
  id uuid not null primary key default uuid_generate_v4(),
  document_id uuid not null references documents(id) on delete cascade,
  content text not null,
  -- AI fields
  embeddings halfvec(384), -- f16 quantinization
  -- System fields
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

 -- f16 quantinization
create index on documents_sections using hnsw (embeddings halfvec_ip_ops);

create or replace function private.handle_new_documents_sections_batch()
returns trigger
language plpgsql
security definer
as $$
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
$$;

create or replace trigger on_new_documents_section
after insert on documents_sections
referencing new table as new_table
  for each statement
  execute function private.handle_new_documents_sections_batch();

-- ping edge worker at every minute
select cron.schedule(
  'ping_handle_documents_sections_worker',
  '30 seconds',
  $$
    select edge_worker.spawn('handle-documents-sections')
  $$
);
