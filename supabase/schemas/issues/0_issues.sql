create table if not exists issues (
  id uuid not null primary key default uuid_generate_v4(),
  title text not null,
  content text not null,
  status text not null default 'new',
    check (status in ('new', 'processed')),

  -- AI fields
  tag text null,
  summary text null,
    check (length(summary) <= 1024),
  kind text null,
    check (kind in ('issue', 'help')),
  category text null,
    check (category in ('database', 'security', 'storage', 'realtime', 'infrastructure')),
  embeddings halfvec(384), -- f16 quantinization

  -- System fields
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

-- f16 quantinization
create index on issues using hnsw (embeddings halfvec_ip_ops);

