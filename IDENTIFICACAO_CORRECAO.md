# Correção da identificação do usuário

A versão anterior tentava chamar a função RPC `update_my_family_identification`, mas essa função não existe no banco atual. Isso gerava o erro `PGRST202 / Could not find the function`.

Esta versão **não usa RPC**. Ela atualiza diretamente `public.familia_membros.tipo` pelo `id` do vínculo do usuário.

Antes de publicar, execute uma vez o arquivo `corrigir-identificacao-direto.sql` no Supabase SQL Editor. Ele cria a coluna `tipo` (caso necessário) e a política RLS para cada usuário atualizar apenas seu próprio vínculo.
