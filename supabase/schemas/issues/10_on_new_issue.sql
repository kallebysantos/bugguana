-- Handle a new issues and push it to the queue
create or replace function private.handle_new_issues_batch()
returns trigger
language plpgsql
security definer
as $$
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
$$;

create or replace trigger on_new_issues
after insert on issues
referencing new table as new_table
  for each row
  execute function private.handle_new_issues_batch();

-- diff will not apply non-schema changes
-- ping edge worker at every 30s
select cron.schedule('ping_flow_apply_ai_processing_worker', '30 seconds',
  $$
    select edge_worker.spawn('flow-apply-ai-processing')
  $$
);
