# Logo gerado v=3 (Worker wf-supply-engine-v1) — pacote pronto para aplicar

Autor: VIGIA (sessão da nuvem), 2026-10-10. **Nada disso foi para produção.** O Worker é do Mac/Daniel; este pacote é código testado + receita.

## O que muda
O gerador atual (v=2) desenha o nome com uma fonte de traços finos feita à mão (aspecto técnico) e **corta nomes longos em 48 letras**
(ex.: "...HARMONIZAÇÃO FAC"). O v=3:
- tipografia real (contornos de fontes OFL embutidos: Cormorant Infant/Garamond, Jost, Bodoni Moda), renderizada em JS puro dentro do Worker (sem canvas, sem API, sem custo);
- 2 modelos escolhidos de forma determinística pelo nome: **B** (moldura arco/oval/círculo/cápsula + monograma em itálico + nome serifado) em ~2/3 dos casos e **D** (disco de cor + inicial didone + nome em sans) em ~1/3; 3 paletas (marfim e ouro, sálvia e creme, grafite e rosé) → 12+ aparências sem repetir o mesmo logo;
- nome completo (até 80 letras, texto codificado ≤ 300 caracteres; separa "CLÍNICA/DRA." e "ESTÉTICA AVANÇADA" como texto pequeno), acentos e Ü/Ë corretos;
- PNG 1200×1200 RGB com deflate real (~165–250 KB em vez de 1,44 MB).

## Arquivos
- `wordmark3.js` + `wordmark3_fonts.js` — módulo ES (importa as fontes). Exporta `wm3 = { wordmarkText3, wordmarkPngV3, pickVariant, seedOf, parseName }`.
- `apply_wordmark_v3.py` — aplica 6 edições (E1–E6) em `index.js`; cada âncora tem que aparecer exatamente 1 vez, senão ABORTA sem escrever nada.
  - `--mode bundle`: embute o módulo (foi o modo testado contra o bundle em produção).
  - `--mode src`: adiciona `import { wm3 } from "./wordmark3.js"` (copie os 2 arquivos .js para ao lado de `src/index.js`).
- `check/` — verificador (`check_invariants.mjs` + golden hashes do v=2) e `extract_from_bundle.sh`.
- `exemplos/` — contact sheets: logo atual × v=3 (8 clínicas), 7 nomes pelo caminho real de emissão.

## As 6 edições (v=2 e v='' NÃO são editados)
E1 `var WORDMARK_VER = "2";` · E2 `wordmarkPngAsync` (ver!=="3" → `wordmarkPng` antigo; senão v=3) antes de `wordmarkSig` · E3 `wordmarkUrl` emite `&v=3` e o texto v3 **só se** `WORDMARK_VER==="3"` ·
E4 `wordmarkUrlValid` aceita `v=3` SEMPRE (URLs v=3 já gravadas continuam válidas mesmo se a chave for desligada) · E5 rota usa `await wordmarkPngAsync(...)` · E6 `setLogoHero` lê Config `FACTORY_WORDMARK_VER_V1`.

## Rollout (reversível)
0. (opcional, só leitura) medir os bytes da prévia D0 (`D0 Preview Image URL`) de alguns leads com herói LOGO: o portão do plugin Commercial exige ≥ 150 KB; um logo mais limpo pode mudar o screenshot.
1. Aplicar, rodar o verificador (abaixo) e `wrangler deploy` **com a chave desligada**: comportamento idêntico ao de hoje (provado: URLs emitidas e PNG v=2 byte-idênticos).
2. Criar a linha Config `FACTORY_WORDMARK_VER_V1 = 3` (status CURRENT). Só novos candidatos passam a receber v=3.
3. No primeiro lead novo: conferir URL `&v=3`, GET 200 `image/png`, revisão de pixel (a IA de visão precisa ler o nome inteiro), prévia D0 ≥ 150 KB.
4. Rollback: `FACTORY_WORDMARK_VER_V1 = 2` (ou apagar a linha). Não reverter o código: URLs v=3 já gravadas precisam continuar servindo v=3 (E4/E2).
Se o desenho mudar depois de leads emitidos, criar `v=4` (a URL é imutável com cache de 1 ano e o SHA do asset fica gravado na evidência).

## Verificação feita (Node 22, contra o bundle de produção wf-supply-engine-v1 de 2026-10-10)
`bash check/extract_from_bundle.sh <index patched> wm.mjs` e `node check/check_invariants.mjs --module ./wm.mjs --ver 3 --budget-ms 600`:
**157 checagens passam, 0 falham**: A) v=2 e v='' byte-idênticos ao golden de 26 casos; B) assinatura/URL/rota (v=2 antigo válido, v=9 rejeitado); C) PNG v3 válido (CRC, zlib, PIL), 1200×1200,
lado curto ≥180 / área ≥30.000 / proporção ≤4,5 do consumidor, ≤ 6,5 MB, determinístico, contrato `null` para nomes sem 2 letras.
Também: `flag desligada` ⇒ 26 nomes com URL e PNG v=2 idênticos aos de hoje; modo `src` e modo `bundle` compilam (node --check).

## Riscos conhecidos
- **CPU**: ~150–230 ms por PNG em Node (v=2: 14–29 ms); a rota recalcula a cada GET (≥2 por admissão) e workers.dev não tem cache de borda. Funciona no plano pago (a rota atual já passa de 10 ms); no plano gratuito (10 ms de CPU) falharia.
- **Revisão de pixel (IA de visão)**: o portão de pixel NÃO é pulado para o wordmark; o nome precisa ficar legível. Monograma é grande mas o nome completo sempre aparece em texto. Canário de poucos leads antes de confiar.
- **Prévia D0 ≥150 KB** (plugin Commercial): medir no passo 0.
- Licenças das fontes: conforme os arquivos usados pelo agente de design (SIL OFL); **confirmar** os arquivos de licença antes de redistribuir fora deste projeto.
