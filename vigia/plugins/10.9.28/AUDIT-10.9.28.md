# AUDIT 10.9.28-RESILIENCE-RC1 (base 10.9.27)

Linhas citadas = p27 (10.9.27) salvo indicacao. Severidade S1 (para/perde lead sem avisar) .. S3; probabilidade P (alta/media/baixa) para seg 12/10 a sex 16/10.

## 1. Auditoria

| # | Modo de falha | Evidencia | Sev/Prob | Status 10.9.28 |
|---|---|---|---|---|
| 1 | Freio conta falha de infra nossa (131053/503) como falha de qualidade | engine:2147-2172 (so ignora 130472/131026) | S1/alta | CORRIGIDO (A) |
| 2 | 402 tratado como erro comum: retry 5x, handoff com human_hold; follow-up trata KAPSO_HTTP_4xx como permanente | engine:1428-1437, 1579-1585, 1590 | S1/media | CORRIGIDO (B) |
| 3 | D0 com delivery failed nunca reenviavel (chave `INITIAL|lead|phone`, TERMINAL) | engine:2276 (key), db:436-445 | S1/alta | CORRIGIDO (A) via chave R1/R2 |
| 4 | **Follow-up sai para lead cujo D0 FALHOU na entrega**: `next_followup_stage` so exige status SENT + sid, ignora delivery_status | engine:1625-1635, 1820-1825 | S1/alta | CORRIGIDO (effective_initial) |
| 5 | **Head-of-line do follow-up**: `eligible_due_followups(min(limit,remaining))` = pageSize 1 e sem sort; um registro que sempre cai em `continue` (canonical, insight, lead nao pronto) starva todos os follow-ups | engine:1711, airtable:726-733 | S1/media | CORRIGIDO (pageSize 20) + reconciler de FOLLOWUP_SCHEDULED preso |
| 6 | Politica de classe invalida (`class_commercial_policy valid=false`) => D0 para em silencio (`return` sem log); no outbox vira defer 3600 s | engine:2180, 1064, 1168; util class_commercial_policy | S1/baixa-media (JSON editado a mao no Airtable) | NAO alterado; coberto por `tick_skip_reason`? **nao**: D0 nao grava motivo. RISCO CONHECIDO, ver 3 |
| 7 | Config Airtable fora do ar => `config()` devolve [] (modo SHADOW) => D0, outbox e follow-up param ate voltar; cache de 60 s so em sucesso | airtable:104-123, 164-185 | S2/media | Nao alterado (fail-closed correto). Visivel em health (`tick_skip_reason`) |
| 8 | Pre-check de midia cacheado 6 h ('OK'): servidor nosso pode estar 503 e o gate nao ve | airtable:429-444 (p28: ~) | S1/media | CORRIGIDO: probe sem cache imediatamente antes do envio (defer 5 min) |
| 9 | 5xx/rede do Kapso e `ambiguous` => UNCERTAIN + HUMAN_HANDOFF `AMBIGUOUS_TRANSPORT_SEND` e nunca retenta | kapso:139, engine:1243-1258, 921-936 | S2/baixa-media | NAO alterado (pode ter sido entregue; duplicar seria pior). Reconciler NAO toca. Decisao do Daniel (risco 2) |
| 10 | Retry sem teto de tempo: 5 tentativas 60/120/240/480 s (~15 min) e depois handoff; queda do Airtable >15 min vira N handoffs | db:622-640, engine:1000 | S2/media | Mitigado: reconciler restaura AIRTABLE_*_READ_FAIL/WORKER_EXCEPTION |
| 11 | Alerta de saldo/falha depende do proprio Kapso (WhatsApp) e do e-mail do WP (`wp_mail` sem SMTP e comum) | alerts:11-12, transport:~55 | S1/media | Hold alerta por e-mail; confirmar `WFCA_OWNER_EMAIL`/SMTP (risco 1) |
| 12 | Alerta sem conversa fica so no painel (`NO_SOURCE_CONVERSATION_LOCAL_ALERT_ONLY`, attempts=4) | alerts:24 | S2/baixa | Nao alterado; alertas novos sempre levam conversation_id |
| 13 | Contadores `wfca_delivery_fail_counters` e `tick_*` so diagnostico; ninguem e avisado de freio ativo/hold | util:record_delivery_failure; rest:186-197 | S2/alta | CORRIGIDO (D): `wfca_health_v1` |
| 14 | Tick/WP-cron parado: `ensure_schedule` so roda em `init` (precisa trafego/loop), `DISABLE_WP_CRON` sem cron real = tudo para; `GET_LOCK` solto so ao fim da conexao | plugin:73-82, engine:13-19 | S1/baixa-media | Nao alterado. `health.last_tick_at` agora permite o vigia alarmar se >3 min (risco 4) |
| 15 | Lock de tick preso por requisicao lenta: ticks sobrepostos so contam `wfca_tick_overlap_skip_count` | engine:13-19 | S3/baixa | Visivel em health |
| 16 | Teto diario `COMMERCIAL_MAX_NEW_CONTACTS_DAY` default 15 se a chave faltar/for lida vazia; conta tambem rows criadas e depois canceladas? (exclui CANCELLED, inclui FAILED/retry) | engine:2203-2209, db:711-720 | S2/media | Nao alterado. **Retry R1/R2 e linhas FAILED consomem teto** (aceitavel, conservador) |
| 17 | Espacamento: D0 reservado 1 por tick e `latest_initial_contact_at` usa created_at; reserva travada em PENDING (hold, janela, probe) empurra a proxima reserva e acumula lag | engine:2193-2201, db:727 | S3/media | Hold agora impede novas reservas durante pausa |
| 18 | Outbox UNCERTAIN: alerta unico e fica para sempre (sem expirar) | engine:921-936, db:582 | S2/baixa | Nao alterado (design intencional) |
| 19 | FOLLOWUP_SCHEDULED que nunca sai (policy/insight/canonical/cap/janela) | engine:1693-1750, 1760-1783 | S2/media | CORRIGIDO (C): >2 h sem outbox => limpa/reavalia + alerta |
| 20 | Race do materializador: `materialize_due_d0_followup` (1/tick, ordena por Last Outbound asc, 100 registros) e `schedule_due_followups` leem Airtable separadamente; write remoto antes do local (rollback manual) | engine:1807-1878 | S3/baixa | Nao alterado; chave de idempotencia do FU impede duplicata |
| 21 | Falha de preview 503 ocorre fora do plugin (`/wf-d0-preview/.../raw` e servido por outro componente) | engine:2263 | S1/media | **Fora do escopo do plugin: causa raiz da 503 (cache/limite PHP-FPM/WAF) precisa ser corrigida no servidor** |
| 22 | `d0_delivery_brake` pausa tambem follow-up? Nao (so D0). O "follow-up junto" parou por outra causa (1 por tick + proactive lock + class spacing global) | engine:2201 vs 1693; transport guard | S2/media | Investigar com logs de hoje (risco 5) |

## 2. Decisoes de desenho
* 131053/131016/131000 + texto `http code 5xx` = transitorio; `d0_brake_transient_free`=2 (0 restaura o comportamento antigo).
* Re-fila de D0 so quando o provider CONFIRMOU falha (evento delivery failed), nunca delivered/read, nunca UNCERTAIN/sem sid, sem inbound, owner LUNA, sem hold/opt-out. Nova chave `|R1`/`|R2`; linha original intocada; max 2, >=600 s. Mensagem entregue nunca duplica: o evento `failed` so aplica se `previous` in (accepted,sent,failed) e a linha e a ultima da cadeia.
* 402: nao conta tentativa, nao gera handoff, pausa TODO trafego Kapso (so ALERT_EMAIL passa), para novas reservas. Renovavel a cada 402 (10 min); termina no primeiro envio aceito.
* Reconciler restaura apenas handoffs gerados por `OUTBOX_FAILED:<transitorio>`; troca de dono via `Ownership::change(LUNA, explicit)` que re-le opt-out/permissao remotos. Nunca toca AMBIGUOUS_TRANSPORT_SEND, DANIEL_*, pagamento, opt-out, ou qualquer conversa com inbound. Teto 3 restauracoes por outbox.
* `effective_initial`: follow-up so existe sobre D0 que nao falhou; com R1 entregue, o prazo e contado do reenvio.
* Alertas novos: 1 CRITICAL por episodio de saldo, 1 INFO agregado por rodada do reconciler, WARN por follow-up preso.

## 3. Riscos conhecidos / decisoes do Daniel
1. Confirmar canal do alerta de saldo: e-mail do WP precisa de SMTP; o alerta WhatsApp morre com o saldo zerado. Vigia deve ler `health_v1.provider_hold_active`.
2. 5xx/timeout do Kapso continua indo para UNCERTAIN + handoff (pode ter sido entregue). Decidir se aceita reconciliar via evento de entrega (nao implementado).
3. Politica de classe invalida ainda para o D0 sem registrar o motivo em `wfca_health_v1`; recomendo validar o JSON `COMMERCIAL_D0_WEEKLY_SCHEDULE_V1` antes de segunda (REST /commercial/health ja mostra `d0_policy`).
4. Vigia: alarmar se `last_tick_at` > 3 min em horario comercial; WP-cron depende de trafego ou cron real.
5. O que pausou o follow-up junto com o D0 hoje nao esta provado (o freio so atua no D0). Ver logs `tick_skip_reason`/`proactive-send` de 17:44Z.
6. Retry R1/R2 consome o teto diario de D0 e uma janela de espacamento; follow-up de D0 que falhou e nao foi reenviado deixa de existir (antes saia indevidamente).
7. Presend probe soma ~1 GET por D0 (100/dia) ao servidor de preview; desligue com `d0_presend_probe:false` se o proprio probe causar carga.
8. Causa raiz do 503 em auracorp.online/wf-d0-preview fica fora do plugin.
9. Testes sao offline com stubs (nao exercitam MySQL/Airtable reais). Recomenda-se deploy em SHADOW/ASSISTED primeiro ou numa janela de baixo volume.

## 4. Como reverter
* Imediato por Config (sem deploy): `WFCA_RULES_V1` = `{"d0_brake_transient_free":0,"d0_transient_retry_enabled":false,"d0_presend_probe":false,"reconcile_enabled":false}` devolve freio/retry/probe/reconciler ao comportamento 10.9.27. O hold por 402 e o fix do follow-up nao tem chave (use rollback de versao).
* Rollback total: reinstalar o zip 10.9.27 (sem migracao de schema). Options novas (`wfca_provider_hold_*`, `wfca_health_*`, `wfca_reconcile_*`) sao inertes e podem ser apagadas. Linhas `|R1/|R2` no outbox ficam como historico.
* Se um lead restaurado nao deveria: colocar owner DANIEL no Airtable; reconciler nao toca DANIEL.
