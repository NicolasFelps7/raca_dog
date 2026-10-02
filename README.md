# DOG LAB — Consulta de Raças com Dog API

Projeto acadêmico de Programação Front-End que consulta uma API pública e atualiza a interface sem recarregar a página.

## API escolhida

- **Nome:** Dog API (Dog CEO)
- **O que fornece:** lista de raças e imagens aleatórias de cachorros por raça.
- **Documentação oficial:** https://dog.ceo/dog-api/documentation/
- **Dado informado pelo usuário:** nome da raça em inglês, por exemplo `husky`, `pug`, `poodle` ou `akita`.
- **Endpoint principal:** `https://dog.ceo/api/breed/{raça}/images/random`
- **Endpoint usado para carregar as opções de raças:** `https://dog.ceo/api/breeds/list/all`

## Funcionalidade

O usuário informa uma raça em inglês. O JavaScript valida a entrada, monta a URL da Dog API, realiza uma requisição assíncrona com `fetch()` e atualiza a página sem recarregar.

Quando a consulta é válida, a página apresenta:

1. Imagem retornada pela API (`message`).
2. Nome da raça pesquisada.
3. Status da API (`status`).
4. Caminho da raça utilizado no endpoint.
5. Horário da atualização.
6. Resumo do JSON retornado.

## Requisitos da atividade atendidos

- RF01 — campo de entrada para a raça.
- RF02 — requisição HTTP após ação do usuário.
- RF03 — mais de três informações exibidas no DOM.
- RF04 — mensagem para raça ou campo inválido.
- RF05 — tratamento de falha de comunicação com `try/catch`.
- RF06 — atualização dinâmica usando JavaScript, sem recarregar a página.
- Uso de `fetch()` nativo.
- Uso de `async/await`.
- Processamento de JSON com `response.json()`.
- Validação de `response.ok` e `status`.
- Manipulação do DOM.

## Recurso visual do cachorro

O destaque visual do Hero carrega um **modelo GLB de cachorro realista** usando Three.js e `GLTFLoader`. O modelo é somente um recurso de interface e não interfere na lógica avaliada da Dog API.

O enquadramento do cachorro é calculado automaticamente pelos três eixos (largura, altura e profundidade). Assim, o modelo não fica gigante nem cortado dentro do quadro, inclusive em telas menores.

O código tenta carregar primeiro o modelo público disponibilizado para estudo no projeto Three.js de Teekam Singh. Se esse arquivo não estiver acessível, tenta uma segunda fonte pública. Caso a rede da escola bloqueie os arquivos, existe um modelo reserva construído pelo próprio JavaScript para a página não quebrar.

Os ossos são objetos 3D da cena e podem ser clicados e arrastados com o mouse usando `THREE.Raycaster`. Também é possível arrastar fora dos ossos para girar o cachorro e clicar no cachorro para ele fazer uma pequena reação. Essas interações foram deixadas simples para crianças conseguirem brincar sem atrapalhar a consulta da API.

**Importante:** nenhuma biblioteca é usada para fazer a requisição da Dog API. A consulta continua sendo feita exclusivamente por `fetch()`.

## Arquivos

- `index.html` — estrutura semântica da página, sem uma seção extra de “Como funciona”.
- `style.css` — layout, cores e responsividade.
- `script.js` — Dog API, tratamento de erros, manipulação do DOM e detalhe visual do Hero.
- `README.md` — documentação da atividade.

## Como executar

1. Abra a pasta no VS Code.
2. Instale ou utilize a extensão **Live Server**.
3. Abra `index.html` pelo Live Server.
4. Mantenha conexão com a internet para acessar a Dog API e carregar os recursos externos do Hero.

## Exemplos para testar

- `husky`
- `pug`
- `poodle`
- `akita`
- `hound afghan`

Teste também:

- campo vazio;
- `cachorroinexistente`;
- desligar a internet antes de realizar uma consulta.

## Defesa técnica — respostas rápidas

### O que o `fetch()` faz?

Realiza uma requisição HTTP para o endpoint da Dog API e devolve uma `Promise` com a resposta.

### Por que usamos `async/await`?

Porque a requisição é assíncrona. `await` permite aguardar a `Promise` sem recarregar a página e deixa o fluxo do código mais fácil de ler.

### O que é `response.ok`?

É uma propriedade que indica se a resposta HTTP ficou na faixa de sucesso. O `fetch()` não gera erro automaticamente para um HTTP 404, por isso o código verifica `response.ok`.

### O que `response.json()` faz?

Converte o corpo JSON da resposta em um objeto JavaScript que pode ser utilizado pelo programa.

### Onde está o tratamento de erro?

Dentro do `try/catch` da função `searchBreed()`. Também existem validações para campo vazio, raça inexistente, resposta JSON inválida e imagem que não carrega.

### Como a página atualiza sem recarregar?

O JavaScript altera propriedades do DOM como `textContent`, `src`, `alt` e `hidden` depois que os dados chegam da API.

### Se a professora pedir uma nova informação?

Depois de `const data = await response.json()`, basta utilizar uma informação existente na resposta e inseri-la em um elemento do DOM. Neste endpoint, os principais campos retornados são `message` e `status`.

## Integrantes

- Integrante 1: ______________________________
- Integrante 2: ______________________________

## Observação

As informações de raça e foto exibidas após a consulta não são simuladas: elas vêm da Dog API em tempo real.
