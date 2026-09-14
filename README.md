# Finanças Pro — Revisão 2

Versão revisada do Finanças Pro, preparada para uso com Supabase.

## Alterações da Revisão 2

- Menu lateral corrigido no celular: abre sobre o conteúdo com fundo de bloqueio e fecha ao selecionar uma página.
- Layout responsivo para celular, tablet e desktop.
- Removidos os registros fictícios do JavaScript e do HTML.
- Dashboard inicia zerado quando o banco não possui registros.
- Removida a dependência de `localStorage` para os dados financeiros.
- Login usando Supabase Auth.
- Contas, empréstimos, parcelas e categorias são lidos do Supabase para o usuário autenticado.
- Cards do Dashboard são interativos e levam para a tela correspondente.
- Cards de Pagas e Pendentes já abrem a tela de Contas com o filtro correspondente.
- Gráfico do Dashboard usa os dados reais das contas; sem registros, mostra estado vazio.
- Calendário usa a data atual e os dados reais.
- Tratamento de erros para evitar tela branca.
- UTF-8 configurado no HTML e tipografia revisada para melhor leitura.

## Supabase

O projeto utiliza a chave publicável do Supabase no navegador. O acesso aos dados deve ser protegido pelas políticas RLS do projeto.

Tabelas esperadas nesta versão:

- `profiles`
- `categorias`
- `contas`
- `emprestimos`
- `emprestimo_parcelas`

As consultas financeiras filtram pelo usuário autenticado (`usuario_id`).

## Como executar

Use um servidor estático. Por exemplo:

```bash
python -m http.server 5500
```

Depois abra `http://localhost:5500`.

Não abra o HTML por `file://` se o navegador bloquear recursos externos.
