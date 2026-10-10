# Status VIGIA (último ciclo registrado: 2026-10-10T14:25Z)

- D0 VOLTARAM às 13:59:59Z (plugin 10.9.27 ativo; pausa liberada). Painel (fórmula do HTML) 74,1% às 14:08Z: ready 62, concluídos 24h 108, D0 24h 69, pagos 0.
- Plugin 10.9.27-BRAKE-BY-CODE-RC1 pronto (vigia/plugins/10.9.27/): o freio ignora 130472 e 131026 (lado do destinatário); 131049 continua contando. Depois de instalar, liberar a pausa atual (wfca_d0_brake_until=0 e released_at=agora) porque o incidente não frearia mais com a regra nova.
- Plugin 10.9.26 instalado (códigos reais de erro já gravados em Commercial Error).
- Janela de D0 de hoje estendida até 20:00 BRT (reverter para 18:00 depois). Freio com razão 0,30. spacing_max 300 s.
- Logo v=3: pacote pronto em vigia/worker-wordmark-v3/ (157 checagens passam, flag desligada = produção idêntica); aguardando Mac/Daniel aplicar e fazer deploy.

## 2026-10-10 19:20Z — pausa de 68 min do D0 e plugin 10.9.28
- Causa raiz: freio de entrega olha os ultimos 10 D0 (codigo) e pausa 1 h se falhas/resolvidos > 0,30. 17:17Z (131049), 17:38Z (131049), 17:44Z (131053) = 3/9 => pausa 17:45Z-~18:50Z. Hipersensivel: varias pausas/dia esperadas.
- Mudanca em Config (WFCA_RULES_V1): razao 0,30 -> 0,40; d0_delivery_brake_ignore_codes += 131053. Rollback na linha [MUDANCA] 19:20Z do Progress Log.
- Plugin 10.9.28-RESILIENCE-RC1 em vigia/plugins/10.9.28/ (zip + SHA256 + AUDIT + PATCH-NOTES + diff): 131053 transitorio com reenvio seguro (chave INITIAL|lead|phone|R<n>), 402 pausa o provedor sem queimar lead, reconciliador de handoffs transitorios a cada 10 min, follow-up so para D0 nao falho, probe da previa antes do envio, wfca_health_v1. Testes offline: 640 passaram.
- Instalar no domingo (D0 desligado), conferir wfca_health_v1 e so entao segunda 08:00.

## 2026-10-10 20:25Z — plugin 10.9.29-SELFHEAL-RC1 (pronto, NAO instalado)
- vigia/plugins/10.9.29/: zip + SHA256 + AUDIT (premortem, 20 achados) + PATCH-NOTES + diff p28->p29. Testes offline: 37 arquivos, 0 falhas (revisado e rerodado por mim).
- Politica de agenda invalida: last-known-good (48 h) + alerta; d0_stall_reason/d0_age_s em wfca_health_v1; alertas CRITICAL sem SMTP (wfca_alerts_ring); 5xx ambiguo do D0 sem handoff e sem reenvio; reconciliador com disjuntor (10/h); cursor no materializador de follow-up.
- Instalar depois das 21h BRT ou no domingo; conferir wfca_health_v1 e o 1o D0 de segunda com assinatura 10.9.29.

## 2026-10-10 ~23:00Z — Plano de correção (pós-print "R$700" para robô)

**Achado:** a resposta automática do WhatsApp Business de uma clínica foi tratada como humano e recebeu "R$700 na opção de entrada." (causa: detector de robô sem as frases + regra de preço disparando em "investimento"). Nas 8 entradas de hoje não marcadas como AUTO_REPLY, quase todas eram robôs → "conversas/engajadas" estão infladas; resposta humana real hoje ≈ 0.

**Feito (P0):** plugin 10.9.30-AUTORESPONDER-PRICE-GUARD-RC1 (`vigia/plugins/10.9.30/`), 38 arquivos de teste, 0 falhas. Precisa ser instalado pelo Daniel.

**Próximos (ordem):**
- P1 Limpar estado: conversas ENGAGED/QUESTION/PRICE que são robôs → voltar a WAITING_REPLY (depois da instalação; checar se a Luna já respondeu a outros robôs).
- P2 Métrica real: taxa de resposta humana = respostas não-AUTO_REPLY / D0, por nicho, cidade, logo, template e dia da semana (sábado vs dia útil).
- P3 Copy do preço (decisão do Daniel): trocar "R$700 na opção de entrada." por resposta com contexto (o que inclui).
- P4 Abastecimento: Finder + caps de descoberta no Worker (domingo); fila Prepared quase vazia.
- P5 Causa raiz do REQUEST_FILE_MISSING do Autopilot (3x hoje, só quarentena aplicada).

## 2026-10-10 ~23:15Z — fechamento de pendências
- Plugin 10.9.31 (preço com contexto, só fatos do catálogo). Instalar e ativar.
- Economia observada hoje: Kapso ≈ US$0,022 por mensagem (166 msgs ≈ US$3,64); OpenAI ledger ≈ US$3,44. Saldo Kapso informado: US$6,46 (≈ 290 msgs).
- Métrica de segunda: resposta humana = entradas em Touches (INBOUND) que não são AUTO_REPLY nem OWNER_HOLD, ÷ D0 enviados; quebrar por nicho, cidade, logo, template, dia.
- Gate de decisão (Quarta 14/10 18h BRT): com ≥300 mensagens enviadas e zero respostas humanas, parar de produzir e revisar oferta/mensagem antes de gastar mais.
