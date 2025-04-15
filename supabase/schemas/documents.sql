create table if not exists documents (
  id uuid not null primary key default uuid_generate_v4(),
  title text not null,
  content text not null,
  -- System fields
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create or replace function private.handle_new_documents_batch()
returns trigger
language plpgsql
as $$
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
$$;

create or replace trigger on_new_document
after insert on documents
referencing new table as new_table
  for each statement
  execute function private.handle_new_documents_batch();
