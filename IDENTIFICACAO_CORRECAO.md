# Correção da identificação do usuário

1. No Supabase, abra **SQL Editor**.
2. Execute o arquivo `corrigir-identificacao.sql`.
3. Publique os arquivos do projeto.

A tela de Perfil agora usa a função SQL `update_my_family_identification` para atualizar somente a identificação do usuário autenticado, sem depender da política de `UPDATE` diretamente no navegador.
