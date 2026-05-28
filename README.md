# Landing Page | Nutricionista Glaubert Couto

Landing page em HTML, CSS e JavaScript puro para captação de leads de consulta nutricional. O formulário salva os dados no Supabase e, após o envio bem-sucedido, redireciona o usuário para o WhatsApp com uma mensagem automática preenchida.

## Estrutura

```text
/
  index.html
  database.sql
  README.md
  assets/
    css/style.css
    js/config.js
    js/supabase.js
    js/form.js
    js/main.js
    img/.gitkeep
```

## Como abrir localmente

Por ser um projeto estático, você pode abrir o `index.html` diretamente no navegador. Para testar com um servidor local, use uma extensão como Live Server ou rode:

```bash
npx serve .
```

## Configuração do Supabase

1. Crie um projeto no Supabase.
2. Acesse **SQL Editor**.
3. Cole e execute o conteúdo de `database.sql`.
4. Vá em **Project Settings > API**.
5. Copie a **Project URL** e a chave **anon public**.
6. Edite `assets/js/config.js`:

```js
supabase: {
  url: "https://SEU-PROJETO.supabase.co",
  anonKey: "SUA_SUPABASE_ANON_KEY"
}
```

Nunca coloque a chave `service_role` no frontend.

## Onde alterar dados principais

Edite `assets/js/config.js` para mudar:

- Nome do profissional
- Instagram
- WhatsApp
- Chamada principal do WhatsApp
- Credenciais públicas do Supabase

O número de WhatsApp deve ficar em formato internacional, apenas com números. Exemplo:

```js
whatsapp: "5524000000000"
```

## Fluxo do formulário

1. O usuário preenche os dados de pré-agendamento.
2. O JavaScript valida nome, WhatsApp, objetivo e consentimento LGPD.
3. O lead é salvo na tabela `leads_nutricionista`.
4. Se o Supabase confirmar o insert, a mensagem é montada automaticamente.
5. O usuário é redirecionado para o WhatsApp via `wa.me`.

## Como subir para o GitHub

```bash
git init
git add .
git commit -m "Cria landing page do nutricionista"
git branch -M main
git remote add origin https://github.com/DigiThree-Planejamentos/Site-NutricionistaGlaubertCouto.git
git push -u origin main
```

## Como hospedar na Vercel

1. Suba o projeto para o GitHub.
2. Acesse a Vercel e clique em **Add New Project**.
3. Importe o repositório.
4. Como é um site estático, não é necessário configurar framework.
5. Publique o projeto.

## Cuidados sobre LGPD e dados de saúde

Este formulário coleta dados para contato, agendamento e triagem inicial. Evite pedir informações clínicas profundas na landing page. Mantenha a política de RLS ativa no Supabase, permita apenas insert público e não exponha dados dos leads no frontend.

Use os dados somente para a finalidade autorizada pelo usuário. Caso o projeto evolua, inclua uma política de privacidade completa e revise o fluxo com apoio jurídico especializado.
