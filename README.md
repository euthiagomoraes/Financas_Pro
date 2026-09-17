# Finanças Pro — Revisão 19 corrigida

## Ajustes desta revisão
- O clique no cartão de empréstimo abre primeiro a tela de detalhes com as parcelas.
- A ação no cartão foi alterada de **Excluir** para **Editar**.
- A edição completa do empréstimo fica disponível pelo botão **Editar empréstimo** dentro dos detalhes.
- A exclusão permanece dentro da tela de edição, com confirmação.
- As parcelas continuam podendo alternar entre **Pago** e **Pendente**.
- A alteração de status tenta os formatos `pago/pendente` e `Pago/Pendente` para compatibilidade com a restrição existente no Supabase.
- O botão de status das parcelas é vinculado também dentro dos modais.

## Ajuste financeiro do dashboard e relatórios
- O total de **Contas do mês** soma contas avulsas, parcelas de empréstimos e assinaturas ativas.
- Os indicadores **Pago** e **Pendente** consideram os mesmos lançamentos consolidados.
- O gráfico dos últimos 6 meses inclui contas avulsas, empréstimos e assinaturas.
- A aba **Relatórios** usa a mesma consolidação mensal, evitando divergência com o dashboard.

## Publicação
1. Substitua os arquivos do projeto local.
2. Teste no navegador:
   - abrir um empréstimo e visualizar parcelas;
   - clicar em Editar;
   - alterar dados e salvar;
   - alterar o status de várias parcelas, incluindo parcelas que não sejam a última;
   - excluir um empréstimo somente pela tela de edição.
3. Execute os comandos Git:

```powershell
git add .
git commit -m "Revisao 19 - detalhes e status das parcelas"
git push origin main
```


## Ajuste — Aba Quitados
- Um empréstimo é exibido em **Quitados** somente quando todas as suas parcelas cadastradas estiverem pagas.
- O status exibido no cartão é calculado automaticamente a partir das parcelas, sem depender apenas do campo `emprestimos.status`.
- A aba **Ativos** não exibe empréstimos totalmente quitados.
