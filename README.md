# Finanças Pro — Revisão 19 corrigida

## Ajustes desta revisão
- O clique no cartão de empréstimo abre primeiro a tela de detalhes com as parcelas.
- A ação no cartão foi alterada de **Excluir** para **Editar**.
- A edição completa do empréstimo fica disponível pelo botão **Editar empréstimo** dentro dos detalhes.
- A exclusão permanece dentro da tela de edição, com confirmação.
- As parcelas continuam podendo alternar entre **Pago** e **Pendente**.
- A alteração de status tenta os formatos `pago/pendente` e `Pago/Pendente` para compatibilidade com a restrição existente no Supabase.
- O botão de status das parcelas é vinculado também dentro dos modais.

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
