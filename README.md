# Finanças Pro — Revisão 19

## Alice — pop-ups animados

- Ao marcar uma conta ou parcela de empréstimo como paga, exibe Alice comemorando.
- Ao adicionar uma nova conta, exibe Alice preocupada.
- Os pop-ups são independentes, responsivos e animados com CSS.
- As imagens ficam em `assets/alice-paga.png` e `assets/alice-nova-conta.png`.

## Publicação

```powershell
git add .
git commit -m "Revisao 19 - popups animados da Alice"
git push origin main
```


## Entrada após login
Foi adicionada uma splash screen da Alice, sem botões de preview. Ela aparece por aproximadamente 2,8 segundos e direciona automaticamente ao painel.


## Correção — compartilhamento familiar, fotos e notificações

Execute `corrigir-familia-notificacoes.sql` no SQL Editor do Supabase. Esta migração:
- garante acesso aos registros da mesma família por `familia_id`;
- corrige registros antigos que estejam sem `familia_id` quando o usuário possui uma única família;
- mantém as notificações privadas por destinatário;
- recria o gatilho de notificações sem depender de `updated_at`;
- habilita `notifications` no Realtime.

A Área da Família também passou a carregar `avatar_url` dos membros em `profiles` e, quando necessário, em `perfis`.

**VAPID:** a chave pública foi deixada como placeholder nesta revisão para não reutilizar uma chave antiga. Coloque no `index.html` a nova Public Key do par VAPID que está configurado nos Secrets do Supabase.

### Correção da identificação do usuário

Execute `corrigir-identificacao.sql` no SQL Editor do Supabase antes de testar a alteração de "Minha identificação" no Perfil.
