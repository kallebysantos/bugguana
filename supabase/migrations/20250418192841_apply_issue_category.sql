set check_function_bodies = off;

CREATE OR REPLACE FUNCTION private.handle_on_summary_apply_category_batch()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
  declare
    result bigint;
begin
  perform pgmq.create('category-issue')
  where not exists (
    select 1 from pgmq.list_queues() where queue_name = 'category-issue'
  );

  perform pgmq.send('category-issue', jsonb_build_object('id', new.id));

  return new;
end;
$function$
;


CREATE TRIGGER on_summary_apply_category AFTER INSERT OR UPDATE OF summary ON public.issues FOR EACH ROW WHEN ((new.summary IS NOT NULL)) EXECUTE FUNCTION private.handle_on_summary_apply_category_batch();

select cron.schedule('ping_category_issue_worker', '30 seconds',
  $$
    select edge_worker.spawn('category-issue')
  $$
);
