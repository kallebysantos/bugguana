create schema if not exists private;

-- Embeddings
create extension if not exists vector with schema extensions;

-- Cron
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;
