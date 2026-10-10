# Sugestões do VIGIA para o Mac (mais novas no topo)

## 2026-10-10 03:50Z - Espelhar o estado do Autopilot no Progress Log
O VIGIA não consegue ler `wfvn_autopilot_state_v1` sem aprovação manual (run_wp_cli pede permissão). Sugestão: a cada hora o Mac registre no Progress Log: phase, failures, last_success_at, active_lead (sem segredos). Assim o VIGIA lê só o Airtable.

## 2026-10-10 03:09Z - Telefones no Progress Log
A entrada [NAO APLICADO] (recYyh6uGFRS0vDAI) tem telefones completos no Detail. A tabela diz "sem telefones". Trocar por IDs de registro de Commercial Conversations.

## 2026-10-10 03:05Z - Aviso PHP strlen() em RUNNING_BUILD
Warning 8192 aparece como `last_death` a cada build. Corrigir o null passado a strlen() para limpar o sinal (hoje é só ruído).
