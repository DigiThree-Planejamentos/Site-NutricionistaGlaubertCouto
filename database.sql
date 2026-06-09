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

alter table public.admin_users enable row level security;
alter table public.site_settings enable row level security;
alter table public.site_sections enable row level security;

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
grant select, insert, update on public.site_settings to authenticated;
grant select, insert, update on public.site_sections to authenticated;
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
