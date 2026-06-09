/*
  Banco de dados para a landing page do Nutricionista Glaubert Couto.

  Como executar no Supabase:
  1. Acesse o painel do seu projeto no Supabase.
  2. Abra SQL Editor > New query.
  3. Cole todo este arquivo e execute.
  4. Depois copie a Project URL e a anon public key para assets/js/config.js.

  Segurança:
  - A tabela usa RLS.
  - Visitantes do site podem apenas inserir leads com a role anon.
  - Deve existir apenas uma policy publica: INSERT anon "Permitir envio publico de leads".
  - Leitura, atualização e exclusão públicas não são permitidas.
  - Não crie policy de SELECT para anon ou authenticated nesta fase.
  - A leitura dos leads deve ser feita apenas pelo painel administrativo do Supabase, por enquanto.
  - Nunca use service_role no frontend.
*/

create extension if not exists "pgcrypto";

create table if not exists public.leads_nutricionista (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  whatsapp text not null,
  email text,
  cidade text,
  bairro text,
  objetivo text not null,
  acompanhamento_atual text,
  restricao_alimentar text,
  condicao_saude text,
  rotina_alimentar text,
  preferencia_atendimento text,
  melhor_horario text,
  mensagem_adicional text,
  consentimento_lgpd boolean not null default false,
  status text default 'novo',
  criado_em timestamp with time zone default now()
);

alter table public.leads_nutricionista enable row level security;

revoke all on public.leads_nutricionista from anon;
revoke all on public.leads_nutricionista from authenticated;

grant usage on schema public to anon;
grant insert (
  nome,
  whatsapp,
  email,
  cidade,
  bairro,
  objetivo,
  acompanhamento_atual,
  restricao_alimentar,
  condicao_saude,
  rotina_alimentar,
  preferencia_atendimento,
  melhor_horario,
  mensagem_adicional,
  consentimento_lgpd
) on public.leads_nutricionista to anon;

drop policy if exists "Permitir envio publico de leads" on public.leads_nutricionista;
drop policy if exists "Permitir insert publico de leads autorizados" on public.leads_nutricionista;
drop policy if exists "Permitir leitura para usuarios autenticados" on public.leads_nutricionista;
drop policy if exists "Permitir leitura para autenticados" on public.leads_nutricionista;
drop policy if exists "Allow authenticated select" on public.leads_nutricionista;
drop policy if exists "Enable read access for authenticated users" on public.leads_nutricionista;

create policy "Permitir envio publico de leads"
on public.leads_nutricionista
for insert
to anon
with check (
  consentimento_lgpd = true
  and status = 'novo'
  and nome is not null
  and length(trim(nome)) > 1
  and whatsapp is not null
  and length(trim(whatsapp)) > 6
  and objetivo is not null
  and length(trim(objetivo)) > 1
);

-- Não criar policy de SELECT para anon ou authenticated nesta fase.
-- A leitura dos leads deve ser feita apenas pelo painel administrativo do Supabase, por enquanto.

create index if not exists leads_nutricionista_criado_em_idx
on public.leads_nutricionista (criado_em desc);

create index if not exists leads_nutricionista_status_idx
on public.leads_nutricionista (status);

-- CMS administrativo - Fase 1

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null unique,
  nome text,
  role text not null default 'viewer' check (role in ('owner', 'editor', 'viewer')),
  ativo boolean not null default true,
  criado_em timestamp with time zone not null default now(),
  atualizado_em timestamp with time zone not null default now()
);

create table if not exists public.site_settings (
  chave text primary key,
  valor jsonb not null default '{}'::jsonb,
  tipo text not null default 'json',
  publico boolean not null default true,
  atualizado_em timestamp with time zone not null default now(),
  atualizado_por uuid references auth.users(id)
);

create table if not exists public.site_sections (
  id uuid primary key default gen_random_uuid(),
  chave text not null unique,
  nome text not null,
  titulo text,
  subtitulo text,
  conteudo text,
  imagem_url text,
  ativo boolean not null default true,
  ordem integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  atualizado_em timestamp with time zone not null default now(),
  atualizado_por uuid references auth.users(id)
);

create table if not exists public.site_blocks (
  id uuid primary key default gen_random_uuid(),
  section_key text not null,
  tipo text not null default 'card',
  titulo text,
  subtitulo text,
  conteudo text,
  icone text,
  imagem_url text,
  botao_texto text,
  botao_link text,
  ordem integer not null default 0,
  ativo boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  atualizado_em timestamp with time zone not null default now(),
  atualizado_por uuid references auth.users(id)
);

alter table public.admin_users enable row level security;
alter table public.site_settings enable row level security;
alter table public.site_sections enable row level security;
alter table public.site_blocks enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
      and ativo = true
  );
$$;

create or replace function public.is_content_editor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
      and ativo = true
      and role in ('owner', 'editor')
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_content_editor() to authenticated;

grant usage on schema public to anon, authenticated;
grant select on public.site_settings to anon, authenticated;
grant select on public.site_sections to anon, authenticated;
grant select on public.site_blocks to anon, authenticated;
grant select, insert, update on public.site_settings to authenticated;
grant select, insert, update on public.site_sections to authenticated;
grant select, insert, update on public.site_blocks to authenticated;
grant select on public.admin_users to authenticated;

drop policy if exists "Admins podem ver admins ativos" on public.admin_users;
drop policy if exists "Conteudo publico pode ser lido" on public.site_settings;
drop policy if exists "Admins podem ler configuracoes" on public.site_settings;
drop policy if exists "Editores podem alterar configuracoes" on public.site_settings;
drop policy if exists "Editores podem inserir configuracoes" on public.site_settings;
drop policy if exists "Editores podem atualizar configuracoes" on public.site_settings;
drop policy if exists "Secoes ativas podem ser lidas" on public.site_sections;
drop policy if exists "Admins podem ler secoes" on public.site_sections;
drop policy if exists "Editores podem alterar secoes" on public.site_sections;
drop policy if exists "Editores podem inserir secoes" on public.site_sections;
drop policy if exists "Editores podem atualizar secoes" on public.site_sections;
drop policy if exists "Blocos ativos podem ser lidos" on public.site_blocks;
drop policy if exists "Admins podem ler blocos" on public.site_blocks;
drop policy if exists "Editores podem inserir blocos" on public.site_blocks;
drop policy if exists "Editores podem atualizar blocos" on public.site_blocks;

create policy "Admins podem ver admins ativos"
on public.admin_users
for select
to authenticated
using (public.is_admin());

create policy "Conteudo publico pode ser lido"
on public.site_settings
for select
to anon, authenticated
using (publico = true);

create policy "Admins podem ler configuracoes"
on public.site_settings
for select
to authenticated
using (public.is_admin());

create policy "Editores podem inserir configuracoes"
on public.site_settings
for insert
to authenticated
with check (public.is_content_editor());

create policy "Editores podem atualizar configuracoes"
on public.site_settings
for update
to authenticated
using (public.is_content_editor())
with check (public.is_content_editor());

create policy "Secoes ativas podem ser lidas"
on public.site_sections
for select
to anon, authenticated
using (ativo = true);

create policy "Admins podem ler secoes"
on public.site_sections
for select
to authenticated
using (public.is_admin());

create policy "Editores podem inserir secoes"
on public.site_sections
for insert
to authenticated
with check (public.is_content_editor());

create policy "Editores podem atualizar secoes"
on public.site_sections
for update
to authenticated
using (public.is_content_editor())
with check (public.is_content_editor());

create policy "Blocos ativos podem ser lidos"
on public.site_blocks
for select
to anon, authenticated
using (ativo = true);

create policy "Admins podem ler blocos"
on public.site_blocks
for select
to authenticated
using (public.is_admin());

create policy "Editores podem inserir blocos"
on public.site_blocks
for insert
to authenticated
with check (public.is_content_editor());

create policy "Editores podem atualizar blocos"
on public.site_blocks
for update
to authenticated
using (public.is_content_editor())
with check (public.is_content_editor());

create index if not exists site_blocks_section_order_idx
on public.site_blocks (section_key, ativo, ordem);

insert into public.site_settings (chave, valor, tipo, publico)
values
  (
    'general',
    '{
      "professionalName": "Glaubert Couto",
      "instagram": "gcoutonutri",
      "whatsapp": "5524999242551",
      "email": "",
      "footerText": "Nutricionista",
      "privacyNotice": "As informações enviadas pelo formulário serão usadas para contato, pré-agendamento e acompanhamento inicial da solicitação, conforme autorização do usuário e nossa Política de Privacidade."
    }'::jsonb,
    'json',
    true
  )
on conflict (chave) do nothing;

insert into public.site_blocks (section_key, tipo, titulo, conteudo, icone, ordem, ativo, metadata)
select *
from (
  values
    ('diferenciais', 'tag', 'Plano alimentar possível', null, null, 1, true, '{}'::jsonb),
    ('diferenciais', 'tag', 'Escuta individualizada', null, null, 2, true, '{}'::jsonb),
    ('diferenciais', 'tag', 'Clareza para manter constância', null, null, 3, true, '{}'::jsonb),
    ('protocolos', 'tag', 'Rotina', null, null, 1, true, '{}'::jsonb),
    ('protocolos', 'tag', 'Preferências alimentares', null, null, 2, true, '{}'::jsonb),
    ('protocolos', 'tag', 'Objetivos', null, null, 3, true, '{}'::jsonb),
    ('protocolos', 'tag', 'Dificuldades', null, null, 4, true, '{}'::jsonb),
    ('protocolos', 'tag', 'Histórico', null, null, 5, true, '{}'::jsonb),
    ('protocolos', 'tag', 'Possibilidades reais', null, null, 6, true, '{}'::jsonb),
    ('beneficios', 'card', 'Plano alimentar individualizado', 'Orientações pensadas para seus objetivos, sua rotina e suas necessidades.', '01', 1, true, '{}'::jsonb),
    ('beneficios', 'card', 'Estratégia sem extremos', 'Condutas realistas, com equilíbrio e respeito ao seu momento.', '02', 2, true, '{}'::jsonb),
    ('beneficios', 'card', 'Mais clareza nas escolhas', 'Você entende melhor sua alimentação e aprende a organizar a rotina com mais segurança.', '03', 3, true, '{}'::jsonb),
    ('beneficios', 'card', 'Acompanhamento profissional', 'Direcionamento técnico e acolhedor para apoiar sua evolução.', '04', 4, true, '{}'::jsonb),
    ('beneficios', 'card', 'Organização para a vida real', 'Estratégias compatíveis com trabalho, família, treino, estudos e rotina.', '05', 5, true, '{}'::jsonb),
    ('beneficios', 'card', 'Cuidado com foco em constância', 'O objetivo é criar um caminho possível de manter, sem promessas rápidas.', '06', 6, true, '{}'::jsonb),
    ('como_funciona', 'step', 'Você preenche o formulário', 'As informações básicas ajudam a entender seu momento, sua rotina e sua necessidade.', '1', 1, true, '{}'::jsonb),
    ('como_funciona', 'step', 'Suas informações são enviadas com segurança', 'Os dados são registrados em nosso banco de dados para fins de contato e agendamento.', '2', 2, true, '{}'::jsonb),
    ('como_funciona', 'step', 'O nutricionista recebe um resumo pelo WhatsApp', 'A mensagem organiza os dados para facilitar o início da conversa.', '3', 3, true, '{}'::jsonb),
    ('como_funciona', 'step', 'A conversa de agendamento é iniciada', 'Após o envio, você é direcionado para combinar os próximos passos.', '4', 4, true, '{}'::jsonb),
    ('como_funciona', 'step', 'O atendimento é conduzido de forma personalizada', 'O plano é construído considerando sua rotina, preferências e objetivos.', '5', 5, true, '{}'::jsonb)
) as seed(section_key, tipo, titulo, conteudo, icone, ordem, ativo, metadata)
where not exists (
  select 1
  from public.site_blocks existing
  where existing.section_key = seed.section_key
);

insert into public.site_sections (chave, nome, titulo, subtitulo, conteudo, ordem, ativo, metadata)
values
  (
    'hero',
    'Hero principal',
    'Nutrição personalizada para transformar sua relação com a alimentação',
    'Cuidado nutricional com clareza e escuta',
    'Com orientação profissional, acolhimento e estratégia, o Nutricionista Glaubert Couto constrói planos alimentares possíveis para sua rotina, seus objetivos e sua vida real.',
    1,
    true,
    '{
      "primaryButtonText": "Realizar cadastro",
      "primaryButtonLink": "#agendamento",
      "secondaryButtonText": "Falar pelo WhatsApp",
      "secondaryButtonLink": "whatsapp",
      "tags": ["Plano alimentar possível", "Escuta individualizada", "Clareza para manter constância"]
    }'::jsonb
  ),
  (
    'sobre',
    'Sobre',
    'Um atendimento que começa entendendo sua rotina',
    'Sobre o Glaubert',
    'Glaubert Couto é nutricionista e acredita que um bom plano alimentar precisa considerar a rotina, a história e as possibilidades de cada pessoa. O atendimento é personalizado, com escuta atenta e orientação clara.\n\nA proposta é construir caminhos possíveis, com acolhimento e conhecimento técnico. Em vez de fórmulas prontas, o cuidado considera preferências, contexto de vida e possibilidades reais para que a alimentação seja mais organizada e sustentável.\n\nO acompanhamento busca tornar o processo mais leve e seguro, sem promessas irreais, sem condutas extremas e com respeito ao tempo de evolução de cada pessoa.',
    2,
    true,
    '{}'::jsonb
  )
on conflict (chave) do nothing;
