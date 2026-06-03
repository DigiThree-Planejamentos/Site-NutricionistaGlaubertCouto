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
