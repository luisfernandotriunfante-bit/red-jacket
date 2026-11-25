-- Guarda os arquivos enviados em cada motor, para atualizar só parte deles
-- (ou nenhum) sem precisar reenviar tudo. Os arquivos vão compactados (gzip).

insert into storage.buckets (id, name, public)
values ('engine-sources', 'engine-sources', false)
on conflict (id) do nothing;

create policy "engine_sources_select" on storage.objects
  for select to authenticated using (bucket_id = 'engine-sources');
create policy "engine_sources_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'engine-sources');
create policy "engine_sources_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'engine-sources') with check (bucket_id = 'engine-sources');
create policy "engine_sources_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'engine-sources');

create table if not exists public.engine_source_files (
  engine text not null,
  slot text not null,
  file_name text not null,
  size_bytes bigint not null,
  uploaded_at timestamptz not null default now(),
  uploaded_by uuid default auth.uid() references auth.users (id) on delete set null,
  primary key (engine, slot)
);

alter table public.engine_source_files enable row level security;
grant select, insert, update on public.engine_source_files to authenticated;
create policy "engine_source_files_select" on public.engine_source_files
  for select to authenticated using (true);
create policy "engine_source_files_insert" on public.engine_source_files
  for insert to authenticated with check (true);
create policy "engine_source_files_update" on public.engine_source_files
  for update to authenticated using (true) with check (true);
