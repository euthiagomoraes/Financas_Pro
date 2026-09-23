# Correção da identificação do usuário

A identificação digitada em **Perfil > Minha identificação** agora é gravada no registro do próprio usuário, na coluna `tipo` de `profiles` (ou `perfis` na estrutura legada).

O app também tenta sincronizar o mesmo valor em `familia_membros.tipo`, sem bloquear o salvamento caso o RLS dessa tabela impeça a atualização.

Execute `corrigir-identificacao-v5.sql` uma vez no SQL Editor do Supabase.

Exemplo:

`Marido` → `Namorado`

O valor principal será persistido em `profiles.tipo` e continuará aparecendo após recarregar a página.


## Correção aplicada nesta revisão
A identificação digitada pelo usuário é persistida em `profiles.tipo` (ou `perfis.tipo` como legado). A rotina de salvar perfil não altera `familia_membros.tipo`, evitando conflitos com restrições/checks legados dessa coluna.
