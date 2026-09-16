# Finanças Pro — Revisão 9

Aplicação financeira mobile-first com Supabase Auth/Database.

## Ajustes desta revisão
- Categorias padrão separadas por tipo interno: `DESPESA` e `RECEITA`, criadas automaticamente por usuário sem duplicação.
- Tela **Contas** mostra o previsto do mês em uma única lista, incluindo contas cadastradas, assinaturas ativas e parcelas de empréstimos.
- Status das contas reais é clicável: conta paga pode voltar para pendente; conta não paga aparece como **Vence hoje** quando o vencimento é hoje e **Pendente** nos demais dias.
- Clique em um empréstimo abre a relação completa de parcelas.
- Campos de formulário mobile usam fonte mínima de 16px e viewport sem zoom automático para evitar ampliação ao tocar nos inputs.
- Mantido Supabase como fonte dos dados, sem registros fictícios.


## Revisão 18
- Corrige gravação de contas com fallback para bancos sem o campo `recorrente`.
- Adiciona migração do campo `contas.recorrente`.
- Clique delegado permite editar qualquer registro da tabela.
- Tabela de Contas vira cartões no mobile, sem rolagem horizontal.
- Checkbox de recorrência foi redimensionado para mobile.
