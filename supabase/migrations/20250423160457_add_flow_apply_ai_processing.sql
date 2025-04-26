SELECT pgflow.create_flow('flow_apply_ai_processing', max_attempts => 3);
SELECT pgflow.add_step('flow_apply_ai_processing', 'summary');
SELECT pgflow.add_step('flow_apply_ai_processing', 'embed', ARRAY['summary']);
SELECT pgflow.add_step('flow_apply_ai_processing', 'get_category', ARRAY['summary']);
SELECT pgflow.add_step('flow_apply_ai_processing', 'get_kind', ARRAY['summary']);
SELECT pgflow.add_step('flow_apply_ai_processing', 'get_tag', ARRAY['summary']);
