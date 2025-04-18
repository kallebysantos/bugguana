-- Handle summarized issue and push it to the embed queue
create or replace function private.handle_on_summary_apply_kind_batch()
returns trigger
language plpgsql
security definer
as $$
  declare
    result bigint;
begin
  perform pgmq.create('kind-issue')
  where not exists (
    select 1 from pgmq.list_queues() where queue_name = 'kind-issue'
  );

  perform pgmq.send('kind-issue', jsonb_build_object('id', new.id));

  return new;
end;
$$;

create or replace trigger on_summary_apply_kind
after insert or update of summary on issues
  for each row
  when(new.summary is not null)
  execute function private.handle_on_summary_apply_kind_batch();

-- diff will not apply non-schema changes
-- ping edge worker at every 30s
select cron.schedule('ping_kind_issue_worker', '30 seconds',
  $$
    select edge_worker.spawn('kind-issue')
  $$
);
