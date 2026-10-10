# Sugestões do VIGIA para o Mac (mais novas no topo)

## 2026-10-10T12:23Z - Correção minha: o "teto de 60/dia" NÃO é aplicado pelo código; o limite real é a cadência (~6,5 min por D0)
Evidência (leitura do código 10.9.25, zip extraído): (1) o único teto diário de D0 que o código lê é `COMMERCIAL_MAX_NEW_CONTACTS_DAY` (class-wfca-engine.php:2182, valor 999 na Config). `D0_hard_ceiling`/`new_d0_cap` (=60) são só texto na Config, nenhum código os referencia (grep). Atenção: se o Daniel acha que há um limite de 60/dia, ele NÃO existe; hoje só freio, agenda e cadência limitam. (2) Cadência: `latest_initial_contact_at()` = MAX(COALESCE(sent_at,created_at)) e o gap é spread_gap(240..spacing_max) a partir do ÚLTIMO ENVIO; o tick roda a cada minuto e o D0 usa 2 ticks (reservar, depois enviar), então o período efetivo ≈ gap médio + ~90-100 s. Medido hoje: envios às 11:48, 11:55, 12:02, 12:08, 12:15Z = ~6,7 min mesmo com spacing_max=360 (gap médio 300 s). Projeção: ~98 D0 no dia com 360; ~115 no melhor caso (spacing_max=240, sem variação). 150 não cabe sem mudar a lógica de cadência (medir o gap a partir da reserva, não do envio), que é decisão do Daniel e NÃO está na 10.9.26. Pedido: informe ao Daniel e, se ele quiser buscar mais que ~100/dia, diga se autoriza o VIGIA a preparar essa mudança (com testes) para uma 10.9.27 revisada.

## 2026-10-10T11:05Z - Meta 150 D0 do Daniel esbarra no TETO de 60 D0/dia da Config (decisão dele)
Evidência (leitura de Config, Touches e Conversations): COMMERCIAL_FOLLOWUP_AUTONOMY_V1 D0_hard_ceiling=60/dia e TEMPLATE_SPEC new_d0_cap=60 (capacity target antigo ainda diz 48). Sábado: spacing 240-600 s. D0 hoje desde 09:00Z: 13 (6,3/h). Para 60 até 21:00Z faltam 47 = 4,7/h, então o ritmo atual já fecha 60 sem mexer em spacing. Passar de 60 exige elevar o teto, que é decisão de risco de WhatsApp do Daniel (freio de entrega ativo desde 10:28Z, 3 de 9 com KAPSO_DELIVERY_FAILED). Pedido: levar ao Daniel as opções (manter 60 / subir com cautela e só com entrega saudável) e, se ele aprovar subir, reduzir spacing_max (~360 s) junto. O VIGIA não altera Config. Também vale reconciliar os registros conflitantes (48 vs 60, 900 s vs 240 s, janela 09-13 vs 06-18 BRT).

## 2026-10-10T10:28Z - Autopilot em BACKOFF: SYSTEMIC:REQUEST_FILE_MISSING (lead recFIMZv1lZcn79ph)
Evidência (WPVibe 10:24Z): phase=BACKOFF, failures=3, retry_after 10:39:07Z, active_op vnext.auto.recFIMZv1lZcn79ph.g1; o request_path (.json em uploads/wf-vnext-autopilot) não existe. Último sucesso 10:03:47Z. Não é IMAGE_FETCH, então o VIGIA não repara. Pedido: ver se o retry das 10:39Z destrava; se continuar em BACKOFF, decidir sobre o lead (o estoque de 60 READY cobre a janela de D0, o impacto é baixo).

## 2026-10-10 03:50Z - Espelhar o estado do Autopilot no Progress Log
O VIGIA não consegue ler `wfvn_autopilot_state_v1` sem aprovação manual (run_wp_cli pede permissão). Sugestão: a cada hora o Mac registre no Progress Log: phase, failures, last_success_at, active_lead (sem segredos). Assim o VIGIA lê só o Airtable.

## 2026-10-10 03:09Z - Telefones no Progress Log
A entrada [NAO APLICADO] (recYyh6uGFRS0vDAI) tem telefones completos no Detail. A tabela diz "sem telefones". Trocar por IDs de registro de Commercial Conversations.

## 2026-10-10 03:05Z - Aviso PHP strlen() em RUNNING_BUILD
Warning 8192 aparece como `last_death` a cada build. Corrigir o null passado a strlen() para limpar o sinal (hoje é só ruído).
