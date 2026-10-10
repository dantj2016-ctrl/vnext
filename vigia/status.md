# Status VIGIA (último ciclo registrado: 2026-10-10T12:45Z)

- D0 PARADOS pelo freio de entrega (2/6 falhas) desde 12:22Z; o freio expira 13:22Z (10:22 BRT). Último D0 12:15:19Z. Estoque READY_FOR_CONTACT=81 (não falta estoque).
- D0 hoje: ~23 enviados. Projeção até 18:00 BRT: ~90 (ritmo atual ~6,7 min por D0 após a pausa); ~105 no melhor caso com spacing_max=240. 150 exige cadência bem menor que o piso de 240 s: fora do que o VIGIA pode mudar.
- Plugin 10.9.26 (PEAK-PERF-RC1) pronto (vigia/plugins/10.9.26/); instalar agora não custa D0.
- 1º payload real de falha Kapso visto: `kapso.statuses` existe (10.9.26 lê); a 10.9.25 gravou NO_DETAIL.
- Teto de 60 D0/dia NÃO é aplicado pelo código (ver sugestões).
- Finder: ciclo 2 (17 candidatos em Goiânia, Florianópolis, Campo Grande e João Pessoa) em verificação antes de gravar.
