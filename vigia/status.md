# Status VIGIA (último ciclo registrado: 2026-10-10T13:58Z)

- D0 PAUSADOS pelo freio desde 13:39:30Z (3/6 falhas: 131049, 131026, 130472); pausa até 14:39:30Z. Último D0 13:32:20Z. Hoje ~28 D0 enviados (12:53Z em diante: 7 D0, 3 falhas).
- Plugin 10.9.27-BRAKE-BY-CODE-RC1 pronto (vigia/plugins/10.9.27/): o freio ignora 130472 e 131026 (lado do destinatário); 131049 continua contando. Depois de instalar, liberar a pausa atual (wfca_d0_brake_until=0 e released_at=agora) porque o incidente não frearia mais com a regra nova.
- Plugin 10.9.26 instalado (códigos reais de erro já gravados em Commercial Error).
- Janela de D0 de hoje estendida até 20:00 BRT (reverter para 18:00 depois). Freio com razão 0,30. spacing_max 300 s.
- Logo: 6 propostas renderizadas (A-F) e protótipo v3; aguardando escolha do Daniel.
