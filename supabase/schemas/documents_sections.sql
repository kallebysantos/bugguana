create table if not exists document_sections (
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
create index on document_sections using hnsw (embeddings halfvec_ip_ops);
