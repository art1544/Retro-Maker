# 🏗️ Arquitetura do RetroMaker

Visão geral de como o app funciona, com foco em **como temas e dinâmicas são gerados por IA e persistidos por board**.

## Visão macro

```
┌─────────────┐        WebSocket + REST        ┌──────────────────────┐
│   Client    │  ◄───────────────────────────► │        Server        │
│ React + TS  │                                 │  Express + Socket.io │
│  (Vite)     │                                 │                      │
└─────────────┘                                 │  ┌────────────────┐  │
                                                 │  │  ai.js         │──┼──► IA gratuita
                                                 │  │  (gera spec)   │  │   (Pollinations/
                                                 │  └───────┬────────┘  │    Gemini/Groq)
                                                 │  ┌───────▼────────┐  │
                                                 │  │ spec.js        │  │
                                                 │  │ normaliza+valida│ │
                                                 │  └───────┬────────┘  │
                                                 │  ┌───────▼────────┐  │
                                                 │  │ store.js        │──┼──► data/boards.json
                                                 │  │ (persiste board)│  │   (spec fica salvo
                                                 │  └────────────────┘  │    junto do board)
                                                 └──────────────────────┘
```

## O ciclo de criação de um board

1. O usuário clica **"Nova retro"** e (opcionalmente) digita um tema (ex.: "Senhor dos Anéis") ou deixa em branco.
2. `POST /api/boards { title, prompt }` chega ao servidor.
3. `ai.js` monta o prompt (o mesmo da constituição) e chama a **IA gratuita** configurada.
4. A resposta é parseada e passada por `spec.js → normalizeSpec()`, que **garante um objeto válido** (preenche faltas, corrige cores/enum, aplica limites). Se a IA falhar/estiver indisponível, cai num **spec de fallback** local (banco de temas em `spec.js`).
5. O `BoardSpec` resultante é **salvo dentro do board** em `data/boards.json`.
6. Daí em diante, o board carrega **sempre com aquele mesmo tema/dinâmica** — entrar num board antigo mostra tudo exatamente como foi gerado. O spec **não** é regenerado.

> Ou seja: a IA roda **uma vez por board**, na criação. O resultado é imutável e local àquele board.

## Por que um "contrato" (constituição)?

Renderizar um tema arbitrário sem quebrar exige um formato previsível. A constituição (`BOARD_SPEC_CONSTITUTION.md` + `board-spec.schema.json`) fixa:

- **IDs de coluna imutáveis** (`good`/`improve`/`action`) → o dashboard de métricas continua somando os mesmos tipos em qualquer tema.
- **Formatos de dinâmica enumerados** (`two-truths`, `prompt-response`, `scale-rating`) → o client tem um renderizador para cada um; a IA só preenche o conteúdo temático.
- **Campos e limites bem definidos** → `normalizeSpec` sempre produz algo exibível.

## Arquivos-chave

| Arquivo | Papel |
|---|---|
| `docs/BOARD_SPEC_CONSTITUTION.md` | Contrato legível + prompt pronto pra IA |
| `docs/board-spec.schema.json` | Mesmo contrato, em JSON Schema (validação/tooling) |
| `server/src/spec.js` | `normalizeSpec`, `validateSpec` e banco de fallbacks |
| `server/src/ai.js` | Chama a IA e devolve um spec validado (ou `null`) |
| `server/src/store.js` | Cria/persiste boards **com o spec embutido** |
| `server/src/index.js` | REST + realtime; gera o spec no `POST /api/boards` |
| `client/src/lib/theme.ts` | Defaults + helper que deriva a UI a partir do spec |
| `client/src/components/DynamicModal.tsx` | Renderiza a dinâmica conforme `dynamic.format` |

## Configurando a IA

Ver `server/.env.example`. Por padrão usa **Pollinations** (grátis, sem chave). Para trocar por Gemini/Groq/OpenRouter, defina `AI_PROVIDER` e a chave correspondente. Sem internet ou com erro, o app usa os temas de fallback — nunca quebra.

## Como adicionar um novo FORMATO de dinâmica (evolução futura)

1. Adicione o valor ao enum em `board-spec.schema.json` e na constituição.
2. Trate a privacidade do novo formato em `viewFor()` (`server/src/index.js`).
3. Adicione o render do formulário e da revelação em `DynamicModal.tsx`.
4. Atualize `normalizeSpec` se o formato exigir campos novos.

Enquanto isso não for feito, a IA só pode escolher entre os 3 formatos existentes — de propósito, para nunca gerar algo que o app não saiba exibir.
