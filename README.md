# Finanças Pro — Revisão 6

Redesign mobile-first inspirado no template aprovado: verde floresta, creme, verde esmeralda e dourado, com cartões arredondados, navegação inferior no mobile e sidebar no desktop.

## Funcionalidades
- Login via Supabase Auth já existente.
- Dashboard sem dados fictícios.
- Contas: lançamento, filtros, pagamento e exclusão.
- Empréstimos: cadastro com geração das parcelas relacionadas.
- Calendário: contas, parcelas e assinaturas.
- Relatórios por categoria e compromissos.
- Categorias e contas recorrentes.
- Assinaturas: até 10 serviços, com logos via Simple Icons CDN; Netflix, Amazon Prime, Uber, YouTube Premium, Spotify, Disney+, Max, iCloud+, Google One e Prime Video.
- Relacionamento assinatura → conta recorrente → conta.
- Perfil com alteração de nome e foto armazenada no Supabase Storage.
- Responsivo mobile-first, com bottom navigation e menu lateral sobreposto.

## Supabase
1. Abra o SQL Editor do projeto.
2. Execute `supabase.sql`.
3. A aplicação usa as tabelas existentes e adiciona `assinaturas`; `avatar_url` é adicionado ao legado `perfis` para compatibilidade.

## Arquivos
- `index.html`
- `styles.css`
- `app.js`
- `supabase.sql`
