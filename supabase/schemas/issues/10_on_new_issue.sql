-- Handle a new issues and push it to the queue
create or replace function private.handle_new_issues_batch()
returns trigger
language plpgsql
security definer
as $$
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
$$;

create or replace trigger on_new_issues
after insert on issues
referencing new table as new_table
  for each statement
  execute function private.handle_new_issues_batch();

-- diff will not apply non-schema changes
-- ping edge worker at every 30s
select cron.schedule('ping_new_issue_worker', '30 seconds',
  $$
    select edge_worker.spawn('handle-new-issue')
  $$
);
