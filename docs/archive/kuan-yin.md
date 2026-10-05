# Kuan-Yin vendável — fase 1

Kuan-Yin é a presença comercial que acolhe, orienta e organiza a relação entre o Guardião do Negócio e seus clientes.

## Papéis

- **Guardião do Negócio**: usuário autenticado que configura negócio, serviços, agenda, pedidos e comprovantes.
- **Cliente final**: visitante da página pública; não precisa de login.
- **Admin**: operador da plataforma que pode auditar conforme as permissões existentes.

## Fluxo público

1. O Guardião configura perfil e slug em Kuan-Yin.
2. O cliente final acessa `/g/:guardianSlug` sem login.
3. A página mostra apenas dados públicos: nome, descrição, serviços, regras visíveis e formas de pagamento.
4. O cliente envia solicitação de agendamento, pedido/orçamento ou comprovante textual.
5. Cada envio retorna um código `trace_id` de suporte.

A página pública não lista agenda completa, outros clientes, comprovantes, logs, tokens ou configurações privadas.

## Agendamentos

Nesta fase, agendamento é **solicitação**. A página pública informa que o Guardião ainda precisa conferir e confirmar o horário. A confirmação automática e integrações externas de calendário ficam planejadas.

## Comprovantes e pagamento manual

Pagamento é manual nesta fase. O cliente pode informar referência/ID de transação e observação textual. O sistema registra comprovantes como pendentes (`received_proof`) e nunca aprova pagamento automaticamente.

Upload de imagem/arquivo de comprovante está **planned** até existir storage privado, validação de tipo/tamanho, nome sanitizado e acesso controlado.

## Segurança

- Cliente final não precisa de login.
- Guardião precisa de login.
- Frontend não usa chaves secretas.
- Inputs públicos têm validação de tamanho, honeypot e rate limit básico existente.
- Erros técnicos não devem aparecer para o visitante; use o código `trace_id`.

## Próximos passos planejados

- Painel admin visual de diagnóstico.
- Upload seguro de comprovantes.
- Conciliação Pix/gateway real.
- Google Calendar/agenda externa.
- CRM e notificações oficiais.
