# AUDIT 10.9.29-SELFHEAL-RC1 (base 10.9.28-RESILIENCE-RC1)

Linhas = arvore p29 (`wf-commercial-agent-supreme/`). Severidade S1 (para/perde lead sem avisar) .. S3. Testes sao OFFLINE com stubs (nada foi executado contra MySQL/Airtable/Kapso reais; nao ha acesso a producao).

## 1. O que mudou, por item

| # | Entrega | Onde |
|---|---|---|
| 1 | Politica de classe invalida: last-known-good (LKG) por chave, ate `policy_lkg_max_hours` (48 h) desde a ultima vez vista valida; motivo em `wfca_health_v1` (`policy_error`, `policy_source`, `policy_using_lkg`, `policy_lkg_age_s`, `policy_invalid_since`); 1 CRITICAL por episodio + 1 CRITICAL quando o LKG expira; resolve ao corrigir | util:`class_commercial_policy` / `policy_last_known_good` (todas as chamadas: engine 5x, rest 2x, passam pelo wrapper) |
| 2 | `d0_age_s`, `d0_stall_age_s`, `d0_stall_reason`, `fu_age_s`, `fu_stall_reason`, `d0_stock`; CRITICAL `D0_STALL` (>900 s dentro da janela, com estoque, sem razao legitima) | engine:`schedule_initial_contacts` (a variavel `$stall['d0']` sempre nomeia o gate em avaliacao, entao o `return` deixa a PRIMEIRA razao), `stall_diag`, `selfheal_health` |
| 3 | Canal de alerta independente de SMTP/Kapso (ver 2.3) | alerts:`ring_push`, `ring_tail`, `flush_ring`; engine tick `ALERTS_POST`; `health_v1.critical_alerts` |
| 4 | 5xx/timeout do Kapso no D0: UNCERTAIN sem handoff humano, resolve por webhook, libera apos X h sem reenviar (ver 2.4) | engine:`ambiguous_*`, `resolve_ambiguous_by_status`, `reconcile_ambiguous_d0`; db: 4 helpers novos |
| 5 | Reconciliador: disjuntor, nunca restaura inbound/opt-out/pagamento/manual, idempotencia provada, trilha de auditoria, contadores | engine:`reconcile_transient`, `reconcile_one_handoff`, `reconcile_skip`, `reconcile_paused` |
| 6 | Premortem (secao 3) | varios |

## 2. Decisoes de desenho

### 2.1 Politica LKG
* O LKG e re-avaliado pelos MESMOS validadores (piso 240/300 s, janelas, semana inteira); um JSON invalido nunca vira LKG. Dia da semana muda a politica efetiva, entao guardamos o JSON bruto, nao o resultado.
* Sem LKG ou LKG expirado: continua fail-closed (como 10.9.28), mas agora com motivo no health e CRITICAL. `policy_lkg_enabled:false` devolve exatamente o comportamento 10.9.28.
* Mudanca intencional de Daniel (ex.: desligar um dia): um JSON VALIDO sempre vence o LKG. So JSON invalido cai no LKG.

### 2.2 Estagnacao
* O relogio de estagnacao reinicia quando a janela abre (08:00 nao alarma por causa do ultimo D0 de ontem) e nunca corre fora da janela, em brake, hold, draining, teto diario ou sem estoque. `SPACING_WAIT` tolera 40 min (spacing_max da politica chega a 30 min).
* Follow-up: `fu_age_s` e `fu_stall_reason` somente diagnostico (cadencia por vencimento, sem alerta; decisao conservadora para nao gerar falso positivo).

### 2.3 Canal de alertas (achado S1)
* **Achado**: `WFCA_Alerts::enqueue()` so cria e-mail/WhatsApp para alertas COM conversa (alerts.php:76). Os CRITICAL de freio D0, reconciliador, politica e estagnacao tem `conversation_id=0` => ficavam so no painel. Tambem: com saldo zerado o canal WhatsApp morre e o e-mail depende de SMTP (`wp_mail` sem SMTP).
* **Solucao sem tabela nova**: (a) option `wfca_alerts_ring` (ultimos 50 CRITICAL, dedupe por chave) exposta em `health_v1.critical_alerts` (ultimos 10) e `critical_alerts_24h`: o vigia le `/commercial/health` (details) e ve tudo em 1 chamada, sem SMTP e sem Airtable; (b) espelho no campo existente `Commercial Error` da conversa (`WFCA_Airtable::update_commercial_by_phone`, 2 chamadas por alerta, max 2 por tick, para no primeiro erro, desiste apos 24 h); (c) 1 `wp_mail` direto para alertas sem conversa (marcado antes de enviar: SMTP travado nao repete).
* **Nao existe tabela de alertas no Airtable** (o plugin so usa Leads, Commercial Conversations, Touches, Config). Alerta sem conversa nao tem onde ser espelhado no Airtable sem criar tabela ou poluir Config (uma chave CURRENT duplicada em Config faz `config()` devolver [] => SHADOW), por isso ficam em ring + health + e-mail. `Commercial Error` e sobrescrito pelo alerta (o proprio texto do alerta contem o motivo).

### 2.4 Kapso 5xx/timeout (ambiguo) no D0 - riscos de duplicidade
* Escopo: so `TEMPLATE_INITIAL`. Resposta, checkout, follow-up e HANDOFF_ACK mantem handoff (ha prospect esperando ou ladder dependente).
* **Nunca reenvia**: a linha fica UNCERTAIN com `send_started_at` e a chave `INITIAL|lead|phone` consumida (`queue_initial_idempotent` => `INITIAL_OUTBOX_AMBIGUOUS`). R1/R2 so existem para falha CONFIRMADA (linha SENT + evento failed). Nao ha caminho novo de envio.
* (a) Sem `human_hold` nem `HUMAN_HANDOFF`: o lead segue LUNA; se respondeu (entregue de fato) o funil responde; Airtable guarda `Commercial Error=D0_SEND_AMBIGUOUS_AWAITING_STATUS`, estado fica `CONTACT_QUEUED` (nao e selecionado de novo).
* (b) Webhook de status: o provider id nunca foi aprendido (a chamada falhou), entao o vinculo e por TELEFONE + janela de tempo: status (sent/delivered/read/failed) de id desconhecido, mesmo telefone, com `send_started_at` entre -120 s e +2 h do evento, exatamente UMA linha UNCERTAIN candidata, owner LUNA, sem opt-out. Vira SENT (sent_at = send_started_at), `sync_pending=1` (o fluxo normal sincroniza Airtable/Touch e agenda follow-up), alerta UNCERTAIN resolvido. Risco residual: um status de OUTRA mensagem para o mesmo telefone na mesma janela seria atribuido ao D0; mitigado porque um D0 ambiguo e a primeira mensagem do lead e exige candidata unica; consequencia pior = follow-up agendado sobre D0 que pode nao ter chegado (ele so sai se o D0 estiver SENT sem `failed`).
* (c) Liberacao: apos 6 h sem status (`ambiguous_release_after_seconds`), a linha segue UNCERTAIN (marcador `RELEASED_AMBIGUOUS_NO_STATUS` que NAO casa com o filtro, para nao reprocessar - bug pego pelo teste), grava Touch OUTBOUND `D0_AMBIGUOUS_NO_STATUS` (conta como "D0 tentado" para a cerca de historico e o materializador de inventario), estado `WAITING_REPLY` (so se o remoto ainda esta CONTACT_QUEUED/READY_FOR_CONTACT, owner LUNA, sem opt-out) e alerta WARN. Nenhum follow-up e construido (a linha nao e SENT).
* Risco de duplicidade assumido: **zero reenvio automatico**. O custo e perder o D0 de leads cujo envio realmente falhou (aceitavel: 1 lead sem D0 vs. duas mensagens). Daniel pode reenviar manualmente.
* Linhas ambiguas ja em handoff humano (10.9.28) nao sao tocadas.

### 2.5 Reconciliador
* Disjuntor: max `reconcile_max_per_hour` (10) restauracoes/hora (contadas na trilha `wfca_reconcile_audit`), pausa e alerta WARN (1/hora) com `RECONCILER_PAUSED:<CIRCUIT_OPEN|BRAKE_ACTIVE|PROVIDER_HOLD>` somente se ha candidatos. Teto por rodada `reconcile_max_per_run` (ja existia; 1-20).
* Nunca restaura: opt-out, inbound do prospect, mensagem manual do Daniel (`last_manual_at`), pagamento terminal, motivo nao transitorio, owner diferente de HANDOFF_PENDING, falha com sid/sent_at. `Ownership::change` ainda re-le opt-out remoto. Cada recusa e registrada 1x por conversa a cada 6 h (`SKIP_*`) com contador.
* Idempotencia: provada por teste (3 rodadas => 1 mudanca de owner, 1 reset, 1 update Airtable, 0 linhas novas no outbox); `reset_failed_outbox` so atua em FAILED sem sid/send boundary; limite de 3 por outbox mantido.

## 3. Premortem (alem dos 22 modos da 10.9.28)

| # | Modo de falha | Evidencia | Sev/Prob | Status |
|---|---|---|---|---|
| P1 | Alertas CRITICAL sem conversa (freio, politica, estagnacao, reconciliador) nunca saem por e-mail/WhatsApp | alerts:72-76 | S1/alta | CORRIGIDO (2.3) |
| P2 | **Head-of-line do materializador de follow-up**: `waiting_followup_candidates(100)` ordenado por Last Outbound asc, sem paginar; quando 100+ leads antigos ficam em WAITING_REPLY sem nada a fazer (ladder concluido/desligado) os MESMOS 100 enchem todo tick e nenhum follow-up novo e materializado. Com ~100 D0/dia isso aparece a partir da 2a semana (ou ja, se ha historico) | engine:2004-2024, airtable:791 | S1/media | CORRIGIDO: cursor round-robin `wfca_fu_mat_cursor` (reinicia ao fim da fila) `fu_materialize_rotate` |
| P3 | Pagina de D0 elegiveis = `remaining*3`: perto do teto diario (remaining 1-4) le 3-12 registros; 3 rejeitados permanentes (G5, telefone nao canonico) escondem o estoque ("NO_ELIGIBLE") | engine `eligible_conversations_for_initial(`, airtable:752 | S1/media | MITIGADO: piso `d0_eligible_page_size` (50) + razao `CANDIDATES_REJECTED` + CRITICAL de estagnacao. Residual: >50 rejeitados no inicio da fila ainda escondem estoque; recomendacao: view/formula do Airtable que exclua `Commercial Error` de G5 ou ordenar por Last Modified |
| P4 | Cada registro rejeitado (G5 / telefone nao canonico / variavel ausente) gerava 1 GET + 1 PATCH Airtable POR TICK com o mesmo texto (ate 100 registros => 429) | engine:2759 e vizinhos | S2/media | CORRIGIDO: so grava se o registro ainda nao carrega o mesmo erro |
| P5 | 429 do Airtable sem backoff (5 req/s por base, 30 s de penalidade); `timeout` 15 s por chamada; ticks seguem martelando | airtable:36-70 | S2/media | CORRIGIDO: janela `wfca_airtable_backoff_until` (Retry-After 30-120 s), chamadas falham rapido (todos os chamadores ja sao fail-closed); `HTTP_429_BACKOFF`, `AIRTABLE_429` no health ring; `airtable_backoff_enabled`. Sem retry automatico |
| P6 | Config com chave CURRENT duplicada (edicao manual) ou HTTP erro => `config()` devolve [] => SHADOW => TUDO para, sem rastro alem de "SHADOW" | airtable:134 | S1/media | CORRIGIDO a visibilidade: `wfca_config_error` (DUPLICATE_CURRENT_KEY:<chave>, READ_FAIL), `health_v1.config_error(_age_s)` e razao `CONFIG_UNAVAILABLE`. Opcional `config_stale_ttl_seconds` (default 0 = fail-closed): serve a ultima config boa por ate N s (max 900). **Decisao do Daniel** (a chave de modo OFF/LIVE tambem ficaria "stale") |
| P7 | Cache de config de 60 s serve valor invalido por ate 1 min | airtable:155 | S3/baixa | Coberto pelo LKG para politicas; `WFCA_RULES_V1` invalido cai em defaults (rules():~295) |
| P8 | Indice de Touches truncado em 20 paginas (2000), ordem do Airtable = mais antigos primeiro: os toques NOVOS (incl. mensagens manuais do Daniel) somem da cerca "ja houve outbound" | airtable:694 | S1/media | MITIGADO: 60 paginas (`touch_index_max_pages` 20-200) + `touch_index_truncated` no health. A cerca local (outbox SENT) continua; o risco restante e D0 para lead que so o Daniel contactou. Recomendacao: vista/filtro por Direction no Airtable |
| P9 | Timeout de PHP no meio do envio Kapso => `AMBIGUOUS_SEND_CRASH_WINDOW` (tick ate 8 envios x ate 20 s Kapso + 15 s por GET Airtable) | engine tick; kapso:132 | S2/media | MITIGADO: `set_time_limit(180)` no tick e orcamento: nenhum envio NOVO apos 100 s, etapas opcionais puladas (`TICK_BUDGET_HIT` no health ring). Depende do host aceitar `set_time_limit` (php-fpm `request_terminate_timeout` ignora) |
| P10 | Lock preso: `GET_LOCK(...,0)` e por conexao; so solta ao fechar a conexao ou `RELEASE_LOCK` no `finally`. Conexao persistente ou processo pendurado deixa o tick pulando | ownership:50-55, engine tick | S3/baixa | Visivel: `tick_overlap_skip_count` + `last_tick_at`. Vigia: alarmar se `last_tick_at` > 180 s |
| P11 | Clock skew: webhook com timestamp > agora+300 s e rejeitado (`INVALID_MESSAGE_ID_OR_TIMESTAMP`); servidor atrasado >5 min perde TODOS os webhooks (inclusive opt-out) | kapso:196 | S2/baixa | NAO alterado (gate de seguranca). Recomendacao: NTP; vigia compara `health_v1.at` com relogio externo |
| P12 | Fuso/horario de verao e virada de dia: cap diario usa meia-noite LOCAL da politica e `+1 day` (24/23/25 h correto; verificado com America/New_York). Brasil sem DST desde 2019 | util:822 | S3/baixa | Sem achado. Obs.: retries R1/R2 e linhas FAILED consomem o teto (10.9.28) |
| P13 | Opcoes autoload | grep `update_option` | S3 | Sem achado: todas `autoload=false`; opcoes novas tambem |
| P14 | Crescimento sem limite de outbox/events/alerts (nenhum DELETE no plugin); `MAX(COALESCE(sent_at,created_at))` e contagens sem indice (action_type) | db:802,818 | S3/baixa | NAO alterado (exige schema). ~150 linhas outbox + ~600 events/dia: ok por meses. Recomendacao 10.9.30: indice (action_type,created_at) + purge de events>90 d |
| P15 | Retry sem teto: `recover_stale_outbox` volta lease vencida para PENDING SEM contar tentativa (worker que morre antes do envio, em loop) | db:592-599 | S2/baixa | NAO alterado (precisa de caminho terminal+alerta). Demais retries tem teto: retry_outbox 5, reconciler 3/outbox + 10/h, R1/R2 max 2 |
| P16 | Handoff por erro transitorio (5 falhas ~15 min) | engine `retry_or_alert` | S2/media | Coberto pelo reconciliador 10.9.28 + disjuntor 10.9.29 |
| P17 | FOLLOWUP_SCHEDULED que nunca sai | engine:1890 | S2/media | 10.9.28 (stuck >2 h) + P2 |
| P18 | Race do materializador | engine:1890 vs 2004 | S3/baixa | Chave `FOLLOWUP|D0_n|lead|phone` impede duplicata; nao alterado |
| P19 | Memoria: `outbound_touch_index` pode carregar ate 6000 toques (transient 5 min) e `config()` todas as chaves (prompts) | airtable:694, :155 | S3/media | Nao medido (sem producao); recomendacao: observar `memory_get_peak_usage` no 1o dia |
| P20 | `update_option('wfca_last_airtable_transport')` a cada chamada Airtable (escrita no MySQL por request) | airtable:23 | S3/baixa | Nao alterado |

## 4. Reversao por Config (sem deploy) - `WFCA_RULES_V1`
Tudo desligado (volta ao comportamento 10.9.28):
`{"policy_lkg_enabled":false,"stall_diag_enabled":false,"alerts_ring_enabled":false,"ambiguous_soft_enabled":false,"ambiguous_resolve_by_status":false,"ambiguous_release_enabled":false,"reconcile_breaker_enabled":false,"airtable_backoff_enabled":false,"fu_materialize_rotate":false,"tick_time_limit_seconds":0,"tick_send_budget_seconds":400,"d0_eligible_page_size":10,"touch_index_max_pages":20}`
Individualmente: `alerts_airtable_mirror`, `alerts_direct_mail`, `reconcile_max_per_hour` (1-100), `reconcile_max_per_run`, `stall_alert_after_seconds` (300-7200), `policy_lkg_max_hours` (1-168), `ambiguous_release_after_seconds` (3600-172800), `config_stale_ttl_seconds` (0-900, default 0).
Itens sem chave: a instrumentacao de gate (`$stall`, so le), a nao-regravacao de `Commercial Error` identico (P4), flags `config_error`/`touch_index_truncated` (so leitura), os campos novos de health. Rollback total: reinstalar o zip 10.9.28 (sem migracao). Options novas (`wfca_policy_*`, `wfca_alerts_ring`, `wfca_selfheal_*`, `wfca_reconcile_audit`, `wfca_stall_state_v1`, `wfca_d0_*`, `wfca_fu_mat_cursor`, `wfca_config_*`, `wfca_airtable_backoff_until`, `wfca_touch_index_truncated`, `wfca_last_*_sent_ts`) sao inertes e podem ser apagadas.

## 5. Riscos e decisoes do Daniel
1. **Vigia**: ler 1x `/commercial/health` (details) e alarmar: `last_tick_at` > 180 s; `d0_stalled=true`; `policy_error!=''`; `config_error!=''`; `provider_hold_active`/`brake_active`; `critical_alerts_24h>0`; `touch_index_truncated`; `d0_age_s` alto em janela. O endpoint exige autorizacao de detalhes (`health_details_allowed`); confirmar que o vigia a possui.
2. `config_stale_ttl_seconds`: manter 0 (fail-closed) ou ligar 300? Ligar mantem D0/follow-up vivos em blip de Airtable/429, mas uma mudanca de modo (ex.: OFF) so vale apos o blip.
3. `ambiguous_release_after_seconds` 6 h e `policy_lkg_max_hours` 48 h (cobre o fim de semana): ok?
4. Aceitar que D0 ambiguo nunca e reenviado automaticamente (2.4).
5. Alerta espelhado sobrescreve `Commercial Error` da conversa.
6. P3 residual (fila de rejeitados > 50 na frente) e P8 (toques novos alem de 6000) exigem ajuste no Airtable (vista/filtro).
7. Causa raiz do 503 do preview (servidor) continua fora do plugin; `d0_presend_probe` mantido.
8. Testes sao offline; fazer deploy em horario de baixo volume e conferir `health_v1` (campos `v2`, `d0_stall_reason`) antes de segunda 08:00.
