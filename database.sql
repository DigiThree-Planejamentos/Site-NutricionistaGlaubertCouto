/*
  Banco de dados para a landing page do Nutricionista Glaubert Couto.

  Como executar no Supabase:
  1. Acesse o painel do seu projeto no Supabase.
  2. Abra SQL Editor > New query.
  3. Cole todo este arquivo e execute.
  4. Depois copie a Project URL e a anon public key para assets/js/config.js.

  Segurança:
  - A tabela usa RLS.
  - Visitantes do site podem apenas inserir leads.
  - Leitura, atualização e exclusão públicas não são permitidas.
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

drop policy if exists "Permitir insert publico de leads autorizados" on public.leads_nutricionista;
create policy "Permitir insert publico de leads autorizados"
on public.leads_nutricionista
for insert
to anon
with check (
  consentimento_lgpd = true
  and nome is not null
  and length(trim(nome)) > 1
  and whatsapp is not null
  and length(trim(whatsapp)) > 6
  and objetivo is not null
  and length(trim(objetivo)) > 1
);

/*
  Opcional para uso interno autenticado:
  Se voce criar usuarios no Supabase Auth para administrar leads, esta politica
  permite leitura apenas para usuarios autenticados. Remova se preferir gerenciar
  permissoes manualmente no painel.
*/
drop policy if exists "Permitir leitura para usuarios autenticados" on public.leads_nutricionista;
create policy "Permitir leitura para usuarios autenticados"
on public.leads_nutricionista
for select
to authenticated
using (true);

create index if not exists leads_nutricionista_criado_em_idx
on public.leads_nutricionista (criado_em desc);

create index if not exists leads_nutricionista_status_idx
on public.leads_nutricionista (status);
