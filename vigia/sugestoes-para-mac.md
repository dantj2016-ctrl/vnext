# Sugestões do VIGIA para o Mac (mais novas no topo)

## 2026-10-10T10:28Z - Autopilot em BACKOFF: SYSTEMIC:REQUEST_FILE_MISSING (lead recFIMZv1lZcn79ph)
Evidência (WPVibe 10:24Z): phase=BACKOFF, failures=3, retry_after 10:39:07Z, active_op vnext.auto.recFIMZv1lZcn79ph.g1; o request_path (.json em uploads/wf-vnext-autopilot) não existe. Último sucesso 10:03:47Z. Não é IMAGE_FETCH, então o VIGIA não repara. Pedido: ver se o retry das 10:39Z destrava; se continuar em BACKOFF, decidir sobre o lead (o estoque de 60 READY cobre a janela de D0, o impacto é baixo).

## 2026-10-10 03:50Z - Espelhar o estado do Autopilot no Progress Log
O VIGIA não consegue ler `wfvn_autopilot_state_v1` sem aprovação manual (run_wp_cli pede permissão). Sugestão: a cada hora o Mac registre no Progress Log: phase, failures, last_success_at, active_lead (sem segredos). Assim o VIGIA lê só o Airtable.

## 2026-10-10 03:09Z - Telefones no Progress Log
A entrada [NAO APLICADO] (recYyh6uGFRS0vDAI) tem telefones completos no Detail. A tabela diz "sem telefones". Trocar por IDs de registro de Commercial Conversations.

## 2026-10-10 03:05Z - Aviso PHP strlen() em RUNNING_BUILD
Warning 8192 aparece como `last_death` a cada build. Corrigir o null passado a strlen() para limpar o sinal (hoje é só ruído).
