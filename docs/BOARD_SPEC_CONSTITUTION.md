# 📜 Constituição do BoardSpec — RetroMaker

Este documento é o **contrato único** que descreve como um tema e uma dinâmica de retrospectiva devem ser estruturados no RetroMaker. Qualquer IA (ou pessoa) que for gerar um novo tema **deve** produzir um JSON que siga exatamente este formato. Seguindo a constituição, o app renderiza qualquer tema/dinâmica sem erros.

> Regra de ouro: **os IDs das colunas são fixos** (`good`, `improve`, `action`). A IA personaliza apenas os **rótulos, emojis, cores e textos** — nunca a estrutura. Isso mantém o dashboard de métricas consistente entre todas as retros.

---

## 1. Estrutura do objeto `BoardSpec`

```jsonc
{
  "themeName": "string",        // Nome do tema. Ex.: "Star Wars", "Divertidamente"
  "tagline": "string",          // Frase de efeito curta (máx. 80 chars)
  "emoji": "string",            // 1 emoji que representa o tema. Ex.: "🚀"

  "palette": {                  // Cores em HEX (#rrggbb)
    "bgTop": "#rrggbb",         // topo do fundo do quadro
    "bgBottom": "#rrggbb",      // base do fundo do quadro
    "good": "#rrggbb",          // cor da coluna "O que foi bom"
    "improve": "#rrggbb",       // cor da coluna "O que pode melhorar"
    "action": "#rrggbb"         // cor da coluna "Ações"
  },

  "columns": {                  // SOMENTE rótulos/textos — as chaves são fixas
    "good":    { "title": "string", "emoji": "string", "hint": "string" },
    "improve": { "title": "string", "emoji": "string", "hint": "string" },
    "action":  { "title": "string", "emoji": "string", "hint": "string" }
  },

  "dynamic": {                  // O jogo rápido (10–15 min)
    "format": "two-truths | prompt-response | scale-rating",
    "title": "string",         // Nome temático do jogo. Ex.: "Jedi ou Sith?"
    "emoji": "string",
    "instructions": "string",  // Como jogar, no clima do tema (máx. 280 chars)
    "durationMin": 10,          // Inteiro entre 5 e 15

    // Campos condicionais — só o que o formato escolhido exige:
    "prompt": "string",        // OBRIGATÓRIO se format = "prompt-response"
    "scale": {                  // OBRIGATÓRIO se format = "scale-rating"
      "label": "string",
      "options": ["string", "string", "string"]   // de 3 a 6 opções
    }
  }
}
```

---

## 2. Regras (invariantes)

1. **Não invente colunas.** As chaves de `columns` são exatamente `good`, `improve`, `action`. O sentido é sempre: bom / melhorar / ações. Só o texto muda para caber no tema.
2. **Cores em HEX válido** (`#` + 6 dígitos hex). Prefira boa legibilidade; o app calcula o contraste do texto automaticamente.
3. **`dynamic.format` deve ser um dos 3 valores suportados** (ver seção 3). Nunca crie um formato novo — escolha o que melhor encaixa no tema.
4. **Campos condicionais**: inclua `prompt` só no formato `prompt-response`; inclua `scale` só no formato `scale-rating`. No `two-truths` não precisa de campo extra.
5. **Textos curtos e no clima**: `tagline` ≤ 80, `instructions` ≤ 280. Sem markdown, sem quebras de linha.
6. **Emojis**: 1 emoji por campo `emoji`.
7. **Saída = só o JSON.** Nada de texto antes/depois, nada de ```` ```json ````. Um único objeto JSON válido.
8. Se algum campo faltar ou vier inválido, o servidor **normaliza** com um valor seguro — mas o ideal é já vir completo.

---

## 3. Formatos de dinâmica suportados

O app sabe renderizar **três** formatos. Toda dinâmica precisa ser um deles:

### `two-truths` — "Duas verdades e uma mentira"
Cada pessoa escreve 3 afirmações sobre si; 1 é falsa. O time lê e adivinha qual é a mentira; o líder revela.
- Não requer campos extras.
- Bom para: qualquer tema (é o formato coringa).

### `prompt-response` — "Pergunta temática"
Há **uma pergunta** (`dynamic.prompt`) no clima do tema. Cada pessoa responde em 1 card, privado até a revelação; o líder revela todas as respostas.
- Requer: `dynamic.prompt` (a pergunta).
- Ex. (Star Wars): *"Se você fosse um personagem de Star Wars nessa sprint, qual seria e por quê?"*

### `scale-rating` — "Classifique-se numa escala"
Cada pessoa se classifica escolhendo **uma opção** de uma escala temática (`dynamic.scale`). Revela junto; ótimo para "termômetro" do time.
- Requer: `dynamic.scale = { label, options[3..6] }`.
- Ex. (Divertidamente): `label: "Qual emoção dominou sua sprint?"`, `options: ["Alegria","Tristeza","Raiva","Medo","Nojinho","Ansiedade"]`.

---

## 4. Exemplo completo e válido (tema Star Wars)

```json
{
  "themeName": "Star Wars",
  "tagline": "Que a retrospectiva esteja com você",
  "emoji": "🚀",
  "palette": {
    "bgTop": "#0b1020",
    "bgBottom": "#1a2340",
    "good": "#4aa3ff",
    "improve": "#f2b705",
    "action": "#e23b3b"
  },
  "columns": {
    "good":    { "title": "A Força esteve conosco", "emoji": "✨", "hint": "Vitórias que iluminaram a sprint" },
    "improve": { "title": "O Lado Sombrio", "emoji": "🌑", "hint": "O que nos puxou pro lado negro" },
    "action":  { "title": "Missões da Aliança", "emoji": "🛰️", "hint": "Próximos passos da resistência" }
  },
  "dynamic": {
    "format": "scale-rating",
    "title": "Jedi ou Sith?",
    "emoji": "⚔️",
    "instructions": "Cada tripulante se classifica na escala da Força durante esta sprint. Revelamos juntos e comentamos!",
    "durationMin": 10,
    "scale": {
      "label": "Como esteve sua Força nesta sprint?",
      "options": ["Mestre Jedi", "Padawan", "Neutro da Força", "Flertei com o Lado Sombrio", "Full Sith"]
    }
  }
}
```

---

## 5. Prompt pronto para enviar a uma IA

Cole o texto abaixo (e substitua `{TEMA}` por um tema, ou peça pra IA escolher um em alta):

```
Você é o gerador de temas do RetroMaker. Gere UM tema de retrospectiva de Scrum
divertido baseado em: "{TEMA}" (se vazio, escolha algo da cultura pop em alta).

Responda APENAS com um objeto JSON válido (sem texto extra, sem crases), seguindo
EXATAMENTE este formato e regras:

- Chaves de "columns" fixas: good, improve, action (só personalize title/emoji/hint).
- "palette": 5 cores HEX (#rrggbb) legíveis e no clima do tema.
- "dynamic.format" DEVE ser um de: "two-truths", "prompt-response", "scale-rating".
  - two-truths: sem campos extras.
  - prompt-response: inclua "dynamic.prompt" (uma pergunta temática).
  - scale-rating: inclua "dynamic.scale" = { "label", "options" (3 a 6) }.
- tagline <= 80 chars, instructions <= 280 chars, 1 emoji por campo "emoji".
- durationMin: inteiro de 5 a 15.

Formato:
{
  "themeName","tagline","emoji",
  "palette": { "bgTop","bgBottom","good","improve","action" },
  "columns": {
    "good": {"title","emoji","hint"},
    "improve": {"title","emoji","hint"},
    "action": {"title","emoji","hint"}
  },
  "dynamic": { "format","title","emoji","instructions","durationMin", (+ "prompt" OU "scale" conforme o formato) }
}
```

O RetroMaker usa esse mesmo prompt automaticamente ao criar cada board (ver `docs/ARCHITECTURE.md`). Você também pode gerar um tema manualmente numa IA de sua preferência e colar o JSON no board.
