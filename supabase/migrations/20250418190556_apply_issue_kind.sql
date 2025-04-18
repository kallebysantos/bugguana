set check_function_bodies = off;

CREATE OR REPLACE FUNCTION private.handle_on_summary_apply_kind_batch()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;


CREATE TRIGGER on_summary_apply_kind AFTER INSERT OR UPDATE OF summary ON public.issues FOR EACH ROW WHEN ((new.summary IS NOT NULL)) EXECUTE FUNCTION private.handle_on_summary_apply_kind_batch();

select cron.schedule('ping_kind_issue_worker', '30 seconds',
  $$
    select edge_worker.spawn('kind-issue')
  $$
);
