# Persistência da identificação do usuário

A identificação digitada em **Minha identificação** pertence ao vínculo do usuário com a família e é gravada em `public.familia_membros.tipo`.

A aplicação não usa RPC para esta gravação.

Fluxo:
1. `loadFamilies()` carrega `id`, `familia_id`, `papel` e `tipo` do vínculo.
2. `saveProfile()` atualiza `familia_membros.tipo` pelo `id` do vínculo e pelo `usuario_id` autenticado.
3. O Supabase retorna o registro atualizado.
4. A aplicação confirma que o valor devolvido é exatamente o texto digitado.
5. Depois recarrega as famílias para garantir que o valor exibido vem do banco.

Antes de publicar, execute uma vez `corrigir-identificacao-v8.sql` no Supabase SQL Editor. Esse SQL não cria tabela nova: apenas garante a coluna `tipo` e a política RLS de atualização do próprio usuário.

A versão anterior que chamava `update_my_family_identification` foi removida.
