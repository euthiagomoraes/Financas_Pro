# Finanças Pro — Protótipo Frontend

Protótipo funcional do sistema financeiro baseado no design aprovado.

## Incluído
- Login de protótipo
- Dashboard moderno e responsivo
- Contas da casa separadas dos empréstimos
- Cadastro, edição, exclusão e pagamento de contas
- Cadastro de empréstimos
- Geração automática das parcelas
- Tela de detalhes do empréstimo
- Registro/desfazimento de pagamentos de parcelas
- Cálculo de total previsto, total pago e saldo restante
- Calendário mensal com contas e parcelas
- Relatórios
- Navegação SPA sem recarregar a página
- Persistência local via localStorage
- Layout desktop/tablet/mobile

## Próxima etapa
Substituir o localStorage pelo Supabase:
1. Supabase Auth
2. tabela `perfis`
3. tabela `categorias`
4. tabela `contas`
5. tabela `emprestimos`
6. tabela `emprestimo_parcelas`
7. RLS
8. triggers/funções para parcelas
9. consultas agregadas para dashboard e relatórios

## Como executar
Abra `index.html` no navegador. Para um ambiente local recomendado, rode um servidor estático, por exemplo:
`python -m http.server 5500`
e acesse `http://localhost:5500`.

Observação: os dados atuais são dados demonstrativos e ficam no navegador.
