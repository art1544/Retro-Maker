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

  "images": [                   // 3 a 6 prompts de arte (EM INGLÊS) de cenas/objetos do tema.
    "epic castle on a hill at sunset, digital art",
    "..."                       // O 1º vira o banner; os demais viram stickers no quadro.
  ],

  "columns": {                  // SOMENTE rótulos/textos — as chaves são fixas
    "good":    { "title": "string", "emoji": "string", "hint": "string" },
    "improve": { "title": "string", "emoji": "string", "hint": "string" },
    "action":  { "title": "string", "emoji": "string", "hint": "string" }
  },

  "dynamic": {                  // Atividade de grupo ELABORADA (5–10 min)
    "format": "two-truths | prompt-response | scale-rating",
    "title": "string",         // Nome temático do jogo. Ex.: "Jedi ou Sith?"
    "emoji": "string",
    "goal": "string",          // Objetivo da dinâmica (máx. 160 chars)
    "instructions": "string",  // Como jogar, no clima do tema (máx. 280 chars)
    "steps": ["string", ...],  // 4 a 6 passos para conduzir em 5–10 min
    "durationMin": 8,           // Inteiro entre 5 e 10

    // Campos condicionais — só o que o formato escolhido exige:
    "prompt": "string",        // OBRIGATÓRIO se format = "prompt-response"
    "scale": {                  // OBRIGATÓRIO se format = "scale-rating"
      "label": "string",
      "options": ["string", "string", "string", "string"]   // de 4 a 6 opções
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
5. **`images`**: 3 a 6 prompts **em inglês**, estilo prompt de gerador de imagem, cada um descrevendo uma cena/objeto icônico e visualmente rico do tema. Variados entre si (não repita a mesma cena). São usados para gerar as ilustrações do quadro.
6. **Dinâmica elaborada**: `goal` (por que vale a pena) + `steps` (4 a 6 passos de condução) + `durationMin` entre **5 e 10**. A atividade deve render uma conversa de verdade, não só 30 segundos.
7. **Textos curtos e no clima**: `tagline` ≤ 80, `goal` ≤ 160, `instructions` ≤ 280. Português do Brasil (exceto `images`, que é em inglês). Sem markdown.
8. **Emojis**: 1 emoji por campo `emoji`.
9. **Sempre diferente**: cada retro deve ter um tema e uma dinâmica **novos**. Ao gerar, evite repetir temas/dinâmicas já usados (o servidor envia a lista dos já existentes).
10. **Saída = só o JSON.** Nada de texto antes/depois, nada de ```` ```json ````. Um único objeto JSON válido.
11. Se algum campo faltar ou vier inválido, o servidor **normaliza** com um valor seguro — mas o ideal é já vir completo.

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
  "images": [
    "epic star wars space battle with x-wings and star destroyer, cinematic, digital art",
    "lightsaber duel on a dark planet, dramatic lighting",
    "cute droid robot in a desert, stylized illustration",
    "millennium falcon flying through hyperspace, vibrant"
  ],
  "columns": {
    "good":    { "title": "A Força esteve conosco", "emoji": "✨", "hint": "Vitórias que iluminaram a sprint" },
    "improve": { "title": "O Lado Sombrio", "emoji": "🌑", "hint": "O que nos puxou pro lado negro" },
    "action":  { "title": "Missões da Aliança", "emoji": "🛰️", "hint": "Próximos passos da resistência" }
  },
  "dynamic": {
    "format": "scale-rating",
    "title": "Jedi ou Sith?",
    "emoji": "⚔️",
    "goal": "Medir o astral do time de forma leve e abrir conversa sobre altos e baixos da sprint.",
    "instructions": "Cada tripulante se classifica na escala da Força durante esta sprint. Revelamos juntos e comentamos!",
    "steps": [
      "Cada pessoa escolhe sua posição na Força em segredo (1 min).",
      "O líder revela todas as escolhas de uma vez.",
      "Quem ficou nos extremos (Jedi/Sith) comenta o porquê.",
      "O time procura padrões e um aprendizado comum.",
      "Definam 1 ação para equilibrar a Força na próxima sprint."
    ],
    "durationMin": 9,
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
MUITO criativo baseado em: "{TEMA}" (se vazio, escolha algo da cultura pop em alta).
Traga uma ideia ORIGINAL — evite repetir estes temas já usados: {LISTA_JA_USADOS}.

Responda APENAS com um objeto JSON válido (sem texto extra, sem crases), seguindo
EXATAMENTE este formato e regras:

- Chaves de "columns" fixas: good, improve, action (só personalize title/emoji/hint).
- "palette": 5 cores HEX (#rrggbb) bonitas e no clima do tema.
- "images": 3 a 6 prompts de arte EM INGLÊS de cenas/objetos icônicos do tema (variados).
- "dynamic.format" DEVE ser um de: "two-truths", "prompt-response", "scale-rating".
  - two-truths: sem campos extras.
  - prompt-response: inclua "dynamic.prompt" (uma pergunta temática instigante).
  - scale-rating: inclua "dynamic.scale" = { "label", "options" (4 a 6) }.
- "dynamic" também tem "goal" (objetivo), "instructions" e "steps" (4 a 6 passos)
  para uma atividade que dure de 5 a 10 minutos. durationMin: inteiro de 5 a 10.
- tagline <= 80, goal <= 160, instructions <= 280 chars. 1 emoji por campo "emoji".

Formato:
{
  "themeName","tagline","emoji",
  "palette": { "bgTop","bgBottom","good","improve","action" },
  "images": ["...", "..."],
  "columns": {
    "good": {"title","emoji","hint"},
    "improve": {"title","emoji","hint"},
    "action": {"title","emoji","hint"}
  },
  "dynamic": { "format","title","emoji","goal","instructions","steps":["..."],"durationMin", (+ "prompt" OU "scale" conforme o formato) }
}
```

O RetroMaker usa esse mesmo prompt automaticamente ao criar cada board (ver `docs/ARCHITECTURE.md`). Você também pode gerar um tema manualmente numa IA de sua preferência e colar o JSON no board.
