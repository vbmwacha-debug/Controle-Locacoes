# Controle de Locações Ultra

Sistema da Ultra Engenharia e Construções para controlar equipamentos, veículos e imóveis locados nas obras:
fim contratual de cada item, responsável, status com antecedência para acionar Suprimentos (aditivo) e
histórico de quem mudou o quê.

- **Front-end:** React + Vite + TypeScript (pasta `src/`)
- **Banco:** Supabase (projeto do Fórum de Caixa), tudo com prefixo `loc_` (arquivo `supabase/schema.sql`)
- **Entrada:** só com o nome (sem e-mail e sem senha). O nome fica guardado no navegador.

## Como rodar no computador

Pré-requisitos: [Node.js LTS](https://nodejs.org) e [Git](https://git-scm.com).

1. Instale as dependências (uma vez):
   ```bash
   npm install
   ```
2. Crie o arquivo `.env.local` na raiz, copiando o `.env.example`, com a URL e a chave **anon/publishable** do
   Supabase (Project Settings → API). Esse arquivo **não** vai para o GitHub.
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=sb_publishable_...
   ```
3. Suba o sistema:
   ```bash
   npm run dev
   ```
   Abra http://localhost:5173. No celular, na mesma rede Wi-Fi, use o endereço "Network" que aparece no terminal.

### Testes

```bash
npm test
```

Rodam três grupos:
- `src/lib/calc.test.ts`: regras de status (inclui os 5 casos obrigatórios com hoje = 01/10/2026);
- `supabase/schema.test.ts`: roda o `schema.sql` num Postgres embutido (PGlite) e confere que o banco calcula
  igual ao app, que o histórico é gravado e não pode ser alterado e que a chave anon não grava direto nas tabelas;
- `src/lib/planilha.test.ts`: o modelo gerado tem as mesmas abas, cabeçalhos e listas do
  `Modelo_Importacao_Locacoes_Ultra.xlsx`, e exportar → importar devolve os mesmos dados.

### Modo demonstração (só no computador de desenvolvimento)

Para ver as telas com dados de exemplo **sem gravar nada no Supabase**:
```bash
node scripts/gerar-mock.mjs
```
Depois, com `npm run dev` rodando, abra o console do navegador (F12) e rode
`sessionStorage.loc_mock = "1"; location.reload()`. Toda gravação é recusada nesse modo.
Para sair: `sessionStorage.clear(); location.reload()`.

## Banco de dados

O arquivo `supabase/schema.sql` cria tudo o que o sistema usa (tabelas, view de status, funções e segurança).
Rode no Supabase → **SQL Editor** → nova consulta → colar o arquivo inteiro → **Run**.
Pode ser rodado de novo sempre que o arquivo mudar: ele só cria/atualiza objetos `loc_` e não mexe nas
tabelas do Fórum de Caixa. Se o Supabase avisar de "destructive operations", é por causa dos
`drop trigger/policy if exists loc_...` usados para recriar os gatilhos; escolha "Run and enable RLS".

Regras de segurança:
- a chave anon só **lê**; toda gravação passa pelas funções `loc_*` (RPC), que exigem nome e sobrenome e
  gravam o item e o histórico juntos;
- não há exclusão de itens pelo app (devolver ou encerrar);
- o histórico (`loc_historico`) não pode ser alterado nem apagado;
- CPF/CNPJ, e-mail e telefone do locador aparecem só na ficha do imóvel e na exportação de imóveis.
  Como não há login com senha, quem tiver a chave anon consegue ler as tabelas pela API; a proteção
  desses dados é na tela, não no banco.

A antecedência para aditar (30 dias) está em `ANTECEDENCIA` (`src/lib/calc.ts`) e em `c_antecedencia`
(`loc_calcular` no `schema.sql`). Se mudar, mude nos dois e rode o schema de novo.

## Como publicar (Vercel)

1. Suba o código para o GitHub (repositório `vbmwacha-debug/Controle-Locacoes`):
   ```bash
   git remote add origin https://github.com/vbmwacha-debug/Controle-Locacoes.git
   ```
   ```bash
   git push -u origin main
   ```
   O `.env.local` e as planilhas `*_para_importar.xlsx` ficam de fora (`.gitignore`).
2. Em [vercel.com](https://vercel.com) → **Add New → Project** → importe o repositório do GitHub.
   A Vercel detecta Vite sozinha (build `npm run build`, saída `dist`).
3. Antes de clicar em Deploy, abra **Environment Variables** e cadastre:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. **Deploy.** A cada `git push` na branch `main`, a Vercel publica a nova versão.

## Importação de planilhas

Nas abas **Lançamentos da obra** e **Imóveis**, botão **Importar / exportar planilha**:
- **Baixar modelo:** mesmo formato do `Modelo_Importacao_Locacoes_Ultra.xlsx` (abas Instruções, Locações,
  Imóveis e Listas, com listas suspensas);
- **Exportar dados atuais:** mesmo formato, com o Código de cada item (para atualizar em massa);
- **Importar:** prévia linha a linha (Nova / Atualiza código X / erros) e gravação de tudo numa única transação.
  Também aceita a planilha antiga "CONTROLE GERAL DE LOCAÇÕES IMÓVEIS".

Planilhas com dados reais de locadores (`*_para_importar.xlsx`) nunca devem ir para o GitHub.
