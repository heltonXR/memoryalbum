# Memory Album — Graduação das Gêmeas 2026

Sistema de álbuns digitais para Gio e Edy, evento de **16 de Outubro de 2026**. Interface em português. Implementação de referência pronta para executar; não foi publicada num domínio externo.

## Instalação e execução

Pré-requisitos: **Node.js 22.11+ (LTS 22 recomendado)**, npm, Docker Compose ou PostgreSQL 17 e aproximadamente 200 MB para a demonstração. O seed cria **92 imagens JPEG reais de gradientes**, não downloads simulados; produz derivados WebP automaticamente. Nenhum serviço S3 é necessário no desenvolvimento.

```bash
npm ci
cp .env.example .env
# Gere um segredo e substitua SESSION_SECRET no .env:
openssl rand -hex 32
docker compose up -d db
npm run db:migrate
npm run db:seed
```

No `.env`, preencha `ADMIN_EMAIL` e `ADMIN_PASSWORD` com uma palavra-passe de pelo menos 12 caracteres. Execute:

```bash
npm run admin:create
npm run dev
```

Abra **http://localhost:3000/a/graduacao-2026** e **http://localhost:3000/admin**. Não há administrador nem palavra-passe predefinidos. Depois de criar a conta, remova `ADMIN_PASSWORD` do ambiente do servidor. Para trocar a palavra-passe do administrador, volte a executar o comando; todas as sessões existentes serão revogadas.

O seed é idempotente. Não apaga dados nem altera a configuração de um álbum já existente. `DEMO_MULTIPLIER=2` cria 184 fotografias para ensaio, acrescentando apenas as que faltam. Na primeira execução, o álbum de demonstração é **público** para poder ser explorado sem senha. Para fotografias reais, escolha **Link secreto** ou **Protegido por palavra-passe** antes do upload.

## Estrutura

```text
src/
  app/
    a/[slug]/page.tsx        # SSR, SEO, gate de acesso
    admin/page.tsx           # login e painel
    api/
      auth/route.ts
      admin/route.ts         # CRUD de álbuns/categorias/fotos
      admin/upload/route.ts
      admin/qr/route.ts
      albums/[slug]/access/route.ts
      albums/[slug]/visit/route.ts
      albums/[slug]/zip/route.ts
      photos/[id]/media/route.ts
      photos/[id]/download/route.ts
      zip/[id]/route.ts      # streaming e progresso
    globals.css
    layout.tsx
    page.tsx
    robots.ts
    error.tsx
    not-found.tsx
  components/
    AlbumClient.tsx
    Album.module.css
    AdminPanel.tsx
    Admin.module.css
    Login.tsx
    Unlock.tsx
  lib/
    album.ts
    db.ts
    errors.ts
    images.ts
    security.ts
    storage.ts
    types.ts
    zip.ts
prisma/
  schema.prisma
  migrations/
  seed.ts
scripts/
  create-admin.ts
  maintenance.ts
tests/
  security.test.ts
  e2e/album.spec.ts
deploy/Caddyfile
Dockerfile
compose.yaml
.env.example
```

`CODIGO-COMPLETO.md` contém o conteúdo integral, ficheiro a ficheiro, dos fontes e da configuração. `VALIDACAO.md` documenta os testes efetivamente executados. O arquivo não inclui segredos, dependências instaladas ou fotografias pessoais.

## Utilização

**Visitante:** capa → Ver álbum → categoria → fotografia. Esc fecha; setas navegam em círculo; Tab fica no visualizador e o foco regressa à miniatura ao fechar. Swipe horizontal tem limiar de 50 px, rejeitando gestos predominantemente verticais. São pré-carregadas as duas imagens adjacentes. A partilha inclui `?photo=ID`; quando existe link secreto, o parâmetro `k` é conservado.

**Admin:** crie um álbum; escolha a visibilidade; crie categorias; carregue fotografias pelo seletor ou por arrastar-e-largar. O upload apresenta progresso de transferência por ficheiro e a contagem do lote; a geração de derivados decorre no servidor depois da transferência. Não feche a página enquanto o lote está em execução. Cada fotografia tem legenda/alt, categoria, ordem numérica e destaque. A capa do álbum e a de cada categoria são escolhidas nos respetivos formulários. Antes de apagar uma categoria, mova ou apague as fotos. Apagar uma foto pede confirmação e remove original e derivados.

**Link secreto:** o segredo de 256 bits é mostrado apenas quando criado/rotacionado. Só o hash fica na base de dados. Guarde o link/QR nesse momento. Se o perdeu, gerar um novo invalida o anterior e as concessões já emitidas. Uma concessão dura sete dias. Alterar a senha ou a visibilidade também invalida concessões anteriores. Acesso administrativo é independente.

**ZIP:** o navegador descarrega nativamente o fluxo para disco, sem criar um Blob de centenas de MB no frontend. A interface consulta o progresso de geração (fotografias concluídas/total), não a percentagem da transferência do navegador. Cada job pode iniciar uma única vez e expira após uma hora. Nome do álbum: `graduacao-2026.zip`. Subpastas usam nome sanitizado da categoria e sufixo de ID para evitar colisões. Os ficheiros usam ID único, evitando nomes duplicados e caminhos perigosos. Não há conteúdo simulado.

**Temas:** modo automático usa CSS `prefers-color-scheme`, sem esperar pelo JavaScript. O tema inicial do álbum pode ser claro/escuro/automático e é renderizado no servidor. O seletor altera `data-theme` durante a visita; não persiste uma preferência no localStorage, evitando flashes ao carregar.

## Dados e decisões

- Next.js App Router + TypeScript + CSS Modules; tipografia nativa, sem fontes externas.
- Os tokens da paleta pedida foram mantidos. Para texto pequeno, `--mut-aa` e `--acc-ink` são ligeiramente mais escuros no modo claro: as cores originais têm contraste de cerca de 4,2:1 no fundo indicado, abaixo de AA (4,5:1).
- Prisma 6 e PostgreSQL; migration inicial incluída, sem depender de `db push` em produção.
- Autenticação equivalente a Auth.js: sessões opacas aleatórias, hash no banco, cookies HttpOnly/Secure/SameSite, validade de oito horas e hashes scrypt com salt. Não utiliza JWT de admin guardado em localStorage.
- Armazenamento local fora de `public/` ou bucket S3 privado. O backend só aceita chaves que criou; os utilizadores não fornecem URLs externas.
- Originais preservados; derivados sem EXIF/GPS. EXIF é opcional no modelo e não é indexado na versão inicial. Os originais podem conservar metadados do fotógrafo; para partilha sem metadados, exporte os originais limpos antes do upload.
- JPEG/PNG/WebP/AVIF validados pela descodificação real, não apenas pelo MIME enviado. SVGs e imagens animadas são rejeitados. Limite de 60 milhões de pixels e tamanho configurável (25 MiB por defeito); resize respeita orientação EXIF. HEIC não é suportado: exporte para JPEG no iPhone.
- Derivados WebP a 320/640/960 px e imagem de visualização até 2048 px. `srcset` nas miniaturas; capa prioritária; dimensões reservadas; originais usados apenas no download.
- Os campos `originalKey`, `largeKey`, `thumbnailKeys` guardam identificadores do armazenamento; URLs HTTP são derivadas nas APIs. Não são guardadas URLs assinadas que expiram.
- Fotografias pertencem a uma categoria; destaque é uma marca adicional. Os destaques são sinalizados na galeria; a categoria inicial Destaques continua a ser uma categoria normal, com os seus próprios ficheiros e ZIP. Não usa reconhecimento facial.
- Logs agregados contam visitas ao abrir o cliente e downloads iniciados/concluídos; não são visitantes únicos nem telemetria de entrega garantida.
- O ZIP não recomprime JPEG/WebP. Archiver gera ZIP64 em streaming e lê um original de cada vez, com backpressure. Consulta fotos em lotes de 50 para evitar carregar metadados de todo o álbum.
- Jobs e limites persistem no PostgreSQL. Sessões expiradas, limites antigos e jobs antigos são limpos pelo comando de manutenção.
- React escapa o conteúdo; Zod valida os formulários; mutações exigem Origin válido. O CSP inclui `unsafe-inline` para os scripts de hidratação do Next; evoluir para nonces quando houver requisitos mais restritos.

## Produção, R2/S3 e CDN

1. Configure PostgreSQL com backups e TLS; defina `DATABASE_URL` com `sslmode=require` quando apropriado.
2. Crie um bucket **privado** e uma credencial com permissões limitadas a esse bucket.
3. No ambiente, configure:

```dotenv
APP_URL=https://memoryalbum.com
STORAGE_DRIVER=s3
S3_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=memoryalbum
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
```

Para AWS S3, use a região do bucket e deixe `S3_ENDPOINT` vazio. As URLs de download são assinadas por 60 segundos, incluindo Content-Disposition. O ZIP lê S3 diretamente. Como a sessão de autorização já foi verificada, um URL assinado emitido antes de uma revogação pode continuar válido até expirar.

4. Execute `npm ci`, `npm run db:migrate`, `npm run admin:create`, `npm run build` e `npm start`, ou construa o `Dockerfile`. O build não necessita de contactar a base de dados, mas o servidor e os comandos Prisma necessitam dela na execução.
5. Use `deploy/Caddyfile` para HTTPS automático, limite do corpo e proxy sem buffering do ZIP. Num servidor remoto, configure o domínio/DNS antes de iniciar o Caddy. Defina `TRUST_PROXY=1` **apenas** atrás de um proxy que substitui X-Forwarded-For; com `0`, clientes partilham um limite conservador.
6. O container de runtime lê as variáveis em runtime. Execute migrations, seed (se necessário) e criação de admin no ambiente de gestão, antes de arrancar o runtime. Para armazenamento local num container, monte um volume persistente em `/app/data` com permissões para o utilizador `node`; nunca dependa do filesystem temporário de um serviço serverless.
7. CDN: os originais nunca ficam públicos. Nesta versão, as imagens passam pela API do mesmo domínio, protegida por sessão; o browser revalida o acesso, evitando que uma mudança de público para privado mantenha uma cópia de CDN acessível. Pode colocar Cloudflare à frente da aplicação para TLS, HTTP/3 e cache dos assets `_next/static`. **Não** configure Cache Everything em `/api/`, `/admin` ou em páginas privadas. Uma CDN pública dedicada de miniaturas requer política de revogação/purge ou URLs assinadas; fica como extensão, não é ativada de forma insegura.
8. Agende diariamente:

```bash
node --env-file=.env --import tsx scripts/maintenance.ts
```

O ZIP mantém um pedido HTTP aberto; use um servidor Node/container com timeout suficiente. Não use uma função serverless com limite curto para ZIPs grandes. Para escala elevada, migre para fila de tarefas e ZIP temporário no bucket, mantendo os endpoints de progresso.

Se usar Docker para build, não copie `.env` para a imagem. O `.dockerignore` já exclui segredos e fotografias. Segredos devem entrar por variáveis ou um gestor de segredos.

## Deploy completo com Docker Compose

No `.env`, defina `APP_URL=https://SEU_DOMINIO`, `SESSION_SECRET` aleatório e `POSTGRES_PASSWORD` (use o resultado hexadecimal de `openssl rand -hex 32`, para ser seguro numa URL de ligação). Defina também os dados S3 ou use o volume local persistente. `ADMIN_EMAIL` e `ADMIN_PASSWORD` são necessários só para criar a conta.

```bash
docker compose -f compose.prod.yaml build
docker compose -f compose.prod.yaml up -d db
docker compose -f compose.prod.yaml run --rm tools npm run db:migrate
docker compose -f compose.prod.yaml run --rm tools npm run admin:create
# Opcional: criar o álbum com as 92 imagens de demonstração.
docker compose -f compose.prod.yaml run --rm tools npm run db:seed
docker compose -f compose.prod.yaml up -d app
```

As migrations são executadas pelo serviço `tools`, que tem o Prisma CLI e os fontes; o runtime contém apenas o necessário para servir a aplicação. A base de dados não expõe portas à Internet. Configure o Caddy no host para servir o domínio com HTTPS e encaminhar para `127.0.0.1:3000`. A imagem corre como utilizador `node`. Migrations e uploads partilham volumes com as permissões corretas.

Para manutenção programada: `docker compose -f compose.prod.yaml run --rm tools npm run maintenance`. Faça backup do volume PostgreSQL e dos objetos S3/volume `media`. Este deploy não foi executado num servidor externo durante a criação do projeto.

## Validação local

```bash
npm run check
npm run test
npm run build
npx playwright install --with-deps chromium firefox webkit
npm start
# Noutro terminal, com o seed público:
npm run test:e2e
```

Os testes E2E usam Chromium com viewport Pixel 7, Firefox e WebKit com viewport iPhone 13. WebKit em Linux aproxima o motor do Safari, mas não substitui um teste num iPhone real. O servidor não é arrancado automaticamente pelo Playwright para permitir escolher dev ou produção.

Meça Lighthouse em Chrome com build de produção, acesso ao álbum público e rede móvel simulada. Pontuações dependem do alojamento, fotos reais, CDN, dispositivo e carga. Consulte `VALIDACAO.md` para os resultados deste ambiente; não interpreta os testes como garantia universal de ≥90.

## Melhorias futuras

- Reconhecimento facial apenas com consentimento e política de retenção: “encontrar as minhas fotos”.
- Comentários, reações, favoritos pessoais, marcas d'água e aprovação de convidados.
- Upload direto para S3 com validação assíncrona, retoma de uploads e fila de transformação.
- MFA/SSO, vários administradores com permissões por álbum e auditoria de alterações.
- Pré-gerar ZIPs com validade, cache seguro de derivados e suporte HEIC.
- Paginação por cursor para álbuns com milhares de fotos, rotação das chaves e CSP com nonce.
- Mais idiomas; o conteúdo de demonstração está preparado para Gio e Edy, mas títulos, datas e categorias são editáveis.
