# Kanban — Supervisor de Equipe

Para um guia mais didático, veja também [README_EXPLICADO.md](README_EXPLICADO.md).

## ⚠️ NOVO: Autenticação Obrigatória

**A partir de agora, o app exige login para funcionar.**

Você precisa:
1. ✅ Habilitar **Email/Password Auth** no Supabase
2. ✅ Executar `SECURITY_SETUP.sql` para aplicar RLS
3. ✅ Criar uma conta para testar

👉 **[Guia completo aqui →](SUPABASE_AUTH_SETUP.md)**

---

## Configuração do Supabase

### Passo 1 — Criar o projeto
1. Acesse https://supabase.com e crie uma conta gratuita.
2. Clique em "New project" e aguarde cerca de 2 minutos.

### Passo 2 — Pegar as credenciais
1. Vá em: Settings → API.
2. Cole a "Project URL" e a "publishable key" no início do arquivo `script.js`.

### Passo 3 — Criar as tabelas e Segurança

**IMPORTANTE:** Use `SECURITY_SETUP.sql` para produção (recomendado):

#### ✅ Recomendado — Usar SECURITY_SETUP.sql

1. Abra `SQL Editor` no Supabase
2. Cole **TODO** o conteúdo de [SECURITY_SETUP.sql](SECURITY_SETUP.sql)
3. Clique **Run**

Este arquivo:
- Cria tabelas com `owner_id` (quem criou)
- Habilita RLS (cada usuário vê só seus dados)
- Define 12 políticas de segurança

👉 Para mais detalhes, veja [SUPABASE_AUTH_SETUP.md](SUPABASE_AUTH_SETUP.md).

---

#### ⚠️ Inseguro — SQL rápido (somente desenvolvimento local)

Se apenas testar localmente sem segurança:

```sql
CREATE TABLE columns (
  id        TEXT PRIMARY KEY,
  title     TEXT NOT NULL,
  color     TEXT DEFAULT '#7a7a8c',
  position  INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE lanes (
  id        TEXT PRIMARY KEY,
  title     TEXT NOT NULL,
  color     TEXT DEFAULT '#6ee7f7',
  position  INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE cards (
  id          TEXT PRIMARY KEY,
  col_id      TEXT REFERENCES columns(id) ON DELETE CASCADE,
  lane_id     TEXT REFERENCES lanes(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  tag         TEXT,
  date        TEXT,
  position    INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE lanes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_columns" ON columns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_lanes"   ON lanes   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_cards"   ON cards   FOR ALL USING (true) WITH CHECK (true);
```

### Segurança
Para produção, aplique as regras abaixo:

1. Use autenticação do Supabase (Auth) e não deixe tabelas com política `allow_all`.
2. Execute [SECURITY_SETUP.sql](SECURITY_SETUP.sql) no SQL Editor do Supabase.
3. Rotacione a chave atual se este projeto já foi compartilhado.
4. Restrinja leitura/escrita por usuário com RLS (já incluso no script seguro).

Observação importante:
o código atual ainda usa o token anônimo para requisições. Para usar o modo seguro de verdade, o frontend precisa enviar `access_token` de usuário autenticado (Supabase Auth) no header Authorization.