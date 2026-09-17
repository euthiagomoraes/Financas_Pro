# Finanças Pro — Revisão 19 (correção CRUD)

## CRUD de Contas e Empréstimos

- Contas: editar, excluir e alternar Pago/Pendente por ID único do Supabase.
- Ao mudar uma conta de Pendente para Pago, ela passa a pertencer à aba **Pagas** e deixa de aparecer em **Pendentes** após a atualização dos dados.
- A aba **Pagas** não exibe a ação de lançar nova conta.
- O botão de lançamento foi removido do estado vazio das abas, evitando criar uma conta paga por engano.
- Empréstimos: editar dados, excluir com remoção das parcelas vinculadas e ajustar o status de parcelas individualmente.
- Parcelas: atualização por ID, criação de parcelas adicionais e remoção das excedentes ao editar a quantidade.
- Todas as operações recarregam os dados do Supabase e atualizam as telas, abas e totais.
- Não usar posição do item na lista como identificador.

## Validação local

- `node --check app.js` executado com sucesso usando Node.js 22.
- Teste recomendado no Supabase: pelo menos 3 contas e 3 empréstimos, incluindo edição, status e exclusão de itens que não sejam o último registro.
