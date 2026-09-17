# Finanças Pro — Revisão 19

## CRUD completo de Contas e Empréstimos

- Contas: editar, excluir e alternar Pago/Pendente por ID único do Supabase.
- Empréstimos: editar dados, excluir com remoção das parcelas vinculadas e ajustar status das parcelas individualmente.
- Parcelas: atualização por ID, criação de parcelas adicionais e remoção das excedentes ao editar a quantidade.
- Todas as operações recarregam os dados do Supabase e atualizam as telas, abas e totais.
- Não usar posição do item na lista como identificador.

## Validação

- `node --check app.js` executado com sucesso.
- Testar no Supabase com pelo menos 3 contas e 3 empréstimos, incluindo edição/exclusão de itens que não sejam o último registro.
