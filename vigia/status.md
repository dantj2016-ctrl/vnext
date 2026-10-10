# Status VIGIA (último ciclo registrado: 2026-10-10T14:25Z)

- D0 VOLTARAM às 13:59:59Z (plugin 10.9.27 ativo; pausa liberada). Painel (fórmula do HTML) 74,1% às 14:08Z: ready 62, concluídos 24h 108, D0 24h 69, pagos 0.
- Plugin 10.9.27-BRAKE-BY-CODE-RC1 pronto (vigia/plugins/10.9.27/): o freio ignora 130472 e 131026 (lado do destinatário); 131049 continua contando. Depois de instalar, liberar a pausa atual (wfca_d0_brake_until=0 e released_at=agora) porque o incidente não frearia mais com a regra nova.
- Plugin 10.9.26 instalado (códigos reais de erro já gravados em Commercial Error).
- Janela de D0 de hoje estendida até 20:00 BRT (reverter para 18:00 depois). Freio com razão 0,30. spacing_max 300 s.
- Logo v=3: pacote pronto em vigia/worker-wordmark-v3/ (157 checagens passam, flag desligada = produção idêntica); aguardando Mac/Daniel aplicar e fazer deploy.
