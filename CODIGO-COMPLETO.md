# Código completo — Memory Album

Projeto funcional: Graduação das Gêmeas 2026, Gio e Edy, 16 de Outubro de 2026.

O ZIP contém os mesmos ficheiros prontos a executar. Não há passos de implementação omitidos. O README explica configuração, migrações, seed, credenciais, execução e deploy. Segredos e dependências instaladas são excluídos; `npm ci` instala as versões do lockfile.

Etapas implementadas: configuração e infraestrutura; modelo de dados e seed; autenticação e armazenamento; APIs e ZIP streaming; interface do álbum e administração; testes e documentação.

## Estrutura de ficheiros

```text
.dockerignore
.env.example
.gitignore
Dockerfile
README.md
VALIDACAO.md
compose.prod.yaml
compose.yaml
deploy/Caddyfile
next-env.d.ts
next.config.ts
package-lock.json
package.json
playwright.config.ts
prisma/migrations/202610070001_initial/migration.sql
prisma/migrations/migration_lock.toml
prisma/schema.prisma
prisma/seed.ts
scripts/create-admin.ts
scripts/maintenance.ts
scripts/prepare-standalone.mjs
scripts/start.mjs
src/app/a/[slug]/page.tsx
src/app/admin/page.tsx
src/app/api/admin/qr/route.ts
src/app/api/admin/route.ts
src/app/api/admin/upload/route.ts
src/app/api/albums/[slug]/access/route.ts
src/app/api/albums/[slug]/visit/route.ts
src/app/api/albums/[slug]/zip/route.ts
src/app/api/auth/route.ts
src/app/api/photos/[id]/download/route.ts
src/app/api/photos/[id]/media/route.ts
src/app/api/zip/[id]/route.ts
src/app/error.tsx
src/app/globals.css
src/app/layout.tsx
src/app/not-found.tsx
src/app/page.tsx
src/app/robots.ts
src/components/Admin.module.css
src/components/AdminPanel.tsx
src/components/Album.module.css
src/components/AlbumClient.tsx
src/components/Login.tsx
src/components/Unlock.tsx
src/lib/album.ts
src/lib/db.ts
src/lib/errors.ts
src/lib/images.ts
src/lib/security.ts
src/lib/storage.ts
src/lib/types.ts
src/lib/zip.ts
tests/e2e/album.spec.ts
tests/security.test.ts
tsconfig.json
```

## .dockerignore

````text
node_modules
.next
.env
.env.local
data
test-results
playwright-report
*.tsbuildinfo
````

## .env.example

````text
DATABASE_URL=postgresql://album:album@localhost:5432/memoryalbum?schema=public
APP_URL=http://localhost:3000
# Gere com: openssl rand -hex 32
SESSION_SECRET=SUBSTITUIR_POR_64_CARACTERES_ALEATORIOS
STORAGE_DRIVER=local
LOCAL_STORAGE_PATH=./data/media
# Não expor originais num bucket público. O acesso é feito por URLs assinadas.
S3_ENDPOINT=
S3_REGION=auto
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
# Ativar apenas atrás de proxy que remove/substitui X-Forwarded-For.
TRUST_PROXY=0
MAX_UPLOAD_MB=25
ZIP_MAX_PHOTOS=10000
ADMIN_EMAIL=admin@example.com
# Só para o comando admin:create; não há palavra-passe predefinida.
ADMIN_PASSWORD=
# Seed idempotente: 92 fotos. Usar 2 para um teste com 184 fotografias.
DEMO_MULTIPLIER=1

# Apenas compose.prod.yaml. Use um segredo hexadecimal gerado por openssl.
POSTGRES_PASSWORD=
````

## .gitignore

````text
node_modules/
.next/
.env
.env.local
data/
test-results/
playwright-report/
*.tsbuildinfo
````

## Dockerfile

````text
FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN mkdir -p /app/data/media && chown -R node:node /app/data
USER node
FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
RUN mkdir -p /app/data/media && chown -R node:node /app/data
USER node
EXPOSE 3000
CMD ["node","server.js"]
````

## README.md

````markdown
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
````

## VALIDACAO.md

````markdown
# Validação executada — 7 de Outubro de 2026

## Resultados

| Verificação | Resultado |
| --- | --- |
| Build de produção Next.js | Aprovado |
| TypeScript | Aprovado |
| Testes unitários de segurança | 3 aprovados |
| Playwright Chromium, Firefox e WebKit | 9 aprovados |
| Axe: capa e visualizador | Zero violações |
| Lighthouse mobile: Performance | 98 |
| Lighthouse mobile: Acessibilidade | 100 |
| Lighthouse mobile: SEO | 100 |

O Lighthouse foi executado em Chromium, viewport mobile 390 × 844, com limitação simulada de rede/CPU e as imagens de demonstração. Os resultados podem mudar com fotografias reais, CDN, hardware e rede. Relatórios integrais em `docs/lighthouse-mobile.html`, `docs/lighthouse-mobile.json` e `docs/axe-result.json`. Capturas do fluxo em `docs/`.

## Integração do backend

O ambiente de ensaio usou PGlite (PostgreSQL em WASM) com protocolo PostgreSQL para o Prisma e armazenamento local. As migrações e o seed foram executados. Foram aprovadas estas verificações:

- Login administrativo e cookie de sessão
- Seed: 92 fotografias e contagens exatas das 9 categorias
- Capa SSR, metadados sociais e álbum público
- Miniatura real WebP e download original JPEG
- ZIP real com originais e pastas por categoria
- Senha: página, miniaturas e originais bloqueados; desbloqueio por cookie assinado
- Link secreto e revogação de permissões anteriores
- Proteção de origem/CSRF nas alterações
- Upload com extensão falsa rejeitado pela leitura binária
- Upload real, processamento e miniaturas automáticas
- Mover, reordenar, marcar destaque e apagar fotografia
- QR code PNG de link secreto
- ZIP 100 fotos/500 MiB: 500 MiB transmitidos, aumento máximo de RSS do processo Next: 61 MiB

O ZIP das 92 imagens foi aberto e verificado: 92 entradas, nove pastas e CRC correto. O ensaio de escala transmitiu 500 MiB de 100 originais; o aumento máximo medido de RSS do processo Next foi 61 MiB, com amostragem a cada 25 ms. O gerador não carrega o álbum completo em memória. Esse resultado não estabelece um limite universal de memória: concorrência, compressão e infraestrutura alteram o consumo.

## Alcance e limitações

- Chromium, Firefox e WebKit foram executados em Linux. WebKit com configuração móvel não substitui um ensaio num iPhone físico com Safari; esse ensaio fica pendente.
- Os testes de swipe exercitam os eventos de toque e a lógica do limiar; não medem comportamento físico do dispositivo.
- S3/R2 real, CDN, Docker Compose de produção e publicação num domínio externo não foram executados neste ambiente. A configuração e as instruções são fornecidas, mas precisam de validação na infraestrutura escolhida.
- As versões de PostgreSQL nativo usadas em produção devem receber o ensaio de instalação e carga. A integração local demonstrou o fluxo com o motor PostgreSQL em WASM.
- O suporte a `navigator.share` depende do navegador, HTTPS e de um gesto do utilizador. O fallback de cópia foi ensaiado.
- O seed contém imagens JPEG geradas a partir de SVGs internos; uploads SVG são rejeitados. Downloads e ZIPs são reais.

## Repetir os testes

Com a aplicação e a base de dados de demonstração disponíveis:

```bash
npm run check
npm test
npm run build
npx playwright install --with-deps
npm run start
# Noutro terminal:
npm run test:e2e
```

Consulte `playwright.config.ts` para os projetos e URL de base. Não execute o seed sobre uma base de produção sem rever os dados pretendidos. A política CSP permite recursos de desenvolvimento para o hot reload apenas com NODE_ENV=development; a política de produção mantém a configuração ensaiada.
````

## compose.prod.yaml

````yaml
services:
  db:
    image: postgres:17-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: album
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?Defina POSTGRES_PASSWORD no .env}
      POSTGRES_DB: memoryalbum
    volumes: ["postgres-data:/var/lib/postgresql/data"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U album -d memoryalbum"]
      interval: 5s
      retries: 10
  app:
    build: .
    restart: unless-stopped
    env_file: .env
    environment:
      DATABASE_URL: postgresql://album:${POSTGRES_PASSWORD}@db:5432/memoryalbum?schema=public
      LOCAL_STORAGE_PATH: /app/data/media
    ports: ["127.0.0.1:3000:3000"]
    volumes: ["media:/app/data"]
    depends_on:
      db:
        condition: service_healthy
  tools:
    build:
      context: .
      target: build
    profiles: ["maintenance"]
    env_file: .env
    environment:
      DATABASE_URL: postgresql://album:${POSTGRES_PASSWORD}@db:5432/memoryalbum?schema=public
      LOCAL_STORAGE_PATH: /app/data/media
    volumes: ["media:/app/data"]
    depends_on:
      db:
        condition: service_healthy
volumes:
  postgres-data:
  media:
````

## compose.yaml

````yaml
services:
  db:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: album
      POSTGRES_PASSWORD: album
      POSTGRES_DB: memoryalbum
    ports: ["127.0.0.1:5432:5432"]
    volumes: ["postgres-data:/var/lib/postgresql/data"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U album -d memoryalbum"]
      interval: 5s
      retries: 10
volumes:
  postgres-data:
````

## deploy/Caddyfile

````text
# Substitua o domínio e configure APP_URL=https://memoryalbum.com
memoryalbum.com {
    encode zstd gzip
    request_body {
        max_size 26MB
    }
    reverse_proxy 127.0.0.1:3000 {
        header_up X-Forwarded-For {remote_host}
        flush_interval -1
        transport http {
            read_timeout 1h
        }
    }
}
````

## next-env.d.ts

````typescript
/// <reference types="next" />
/// <reference types="next/image-types/global" />
import "./.next/types/routes.d.ts";
import "./.next/types/root-params.d.ts";

// NOTE: This file should not be edited
// see https://nextjs.org/docs/app/api-reference/config/typescript for more information.
````

## next.config.ts

````typescript
import type { NextConfig } from "next";
import path from "node:path";
const config: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  turbopack: { root: path.resolve(".") },
  outputFileTracingExcludes: { "*": ["./data/**/*"] },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            key: "Content-Security-Policy",
            value:
              `default-src 'self'; script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'${process.env.NODE_ENV === "development" ? " ws: wss:" : ""}; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'`,
          },
        ],
      },
    ];
  },
};
export default config;
````

## package-lock.json

````json
{
  "name": "memoryalbum",
  "version": "1.0.0",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "memoryalbum",
      "version": "1.0.0",
      "dependencies": {
        "@aws-sdk/client-s3": "^3.900.0",
        "@aws-sdk/s3-request-presigner": "^3.900.0",
        "@prisma/client": "6.19.0",
        "archiver": "^7.0.1",
        "next": "16.4.0",
        "qrcode": "^1.5.4",
        "react": "19.3.0",
        "react-dom": "19.3.0",
        "sharp": "^0.34.4",
        "zod": "^4.1.12"
      },
      "devDependencies": {
        "@playwright/test": "1.56.1",
        "@types/archiver": "^6.0.3",
        "@types/node": "^24.0.0",
        "@types/qrcode": "^1.5.5",
        "@types/react": "^19.2.0",
        "@types/react-dom": "^19.2.0",
        "prisma": "6.19.0",
        "tsx": "^4.20.6",
        "typescript": "^5.9.3"
      }
    },
    "node_modules/@aws-sdk/checksums": {
      "version": "3.1001.1",
      "resolved": "https://registry.npmjs.org/@aws-sdk/checksums/-/checksums-3.1001.1.tgz",
      "integrity": "sha512-x12Q17KYlJAd3nKf8LV5LV0vt8sh8/6YfQLGPtrGnQf/tW4jqxPGq5GPpuVitpQYM3eUR4XB7CbxZf751NMbLw==",
      "license": "Apache-2.0",
      "dependencies": {
        "@aws-sdk/core": "^3.978.1",
        "@aws-sdk/types": "^3.974.6",
        "@smithy/core": "^3.35.0",
        "@smithy/types": "^4.19.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@aws-sdk/client-s3": {
      "version": "3.1147.0",
      "resolved": "https://registry.npmjs.org/@aws-sdk/client-s3/-/client-s3-3.1147.0.tgz",
      "integrity": "sha512-uTrcJxnJKPr8bc1z7cMxopYSQyAm2dPfiMK+UiBr51L8MzimDxHbW/d9GR6X/LFbWDpMzfFPLhB4UohDrCSaPQ==",
      "license": "Apache-2.0",
      "dependencies": {
        "@aws-sdk/checksums": "^3.1001.1",
        "@aws-sdk/core": "^3.978.1",
        "@aws-sdk/credential-provider-node": "^3.972.84",
        "@aws-sdk/middleware-sdk-s3": "^3.972.77",
        "@aws-sdk/signature-v4-multi-region": "^3.996.47",
        "@aws-sdk/types": "^3.974.6",
        "@smithy/core": "^3.35.0",
        "@smithy/fetch-http-handler": "^5.8.0",
        "@smithy/node-http-handler": "^4.12.1",
        "@smithy/types": "^4.19.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@aws-sdk/core": {
      "version": "3.978.1",
      "resolved": "https://registry.npmjs.org/@aws-sdk/core/-/core-3.978.1.tgz",
      "integrity": "sha512-LbY9aGsEiznDWmUc30Nwv3aIX/+dbwTx8KfS0yOC3NPYMO+O91e6jkT1azf34FwjOndq8/Q+RcVVZz5xnerwdg==",
      "license": "Apache-2.0",
      "dependencies": {
        "@aws-sdk/types": "^3.974.6",
        "@aws-sdk/xml-builder": "^3.972.41",
        "@aws/lambda-invoke-store": "^0.3.0",
        "@smithy/core": "^3.35.0",
        "@smithy/signature-v4": "^5.7.3",
        "@smithy/types": "^4.19.0",
        "bowser": "^2.11.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@aws-sdk/credential-provider-env": {
      "version": "3.972.72",
      "resolved": "https://registry.npmjs.org/@aws-sdk/credential-provider-env/-/credential-provider-env-3.972.72.tgz",
      "integrity": "sha512-xTKO/FWJPozTIXbozVnVGoNBhaGba8TBcx+KyUjRVeOlXE+dUc7GTR1cLvu0uTdIdmemzaFbqqCshXeZA1fZew==",
      "license": "Apache-2.0",
      "dependencies": {
        "@aws-sdk/core": "^3.978.1",
        "@aws-sdk/types": "^3.974.6",
        "@smithy/core": "^3.35.0",
        "@smithy/types": "^4.19.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@aws-sdk/credential-provider-http": {
      "version": "3.972.74",
      "resolved": "https://registry.npmjs.org/@aws-sdk/credential-provider-http/-/credential-provider-http-3.972.74.tgz",
      "integrity": "sha512-u91E/hT8f4d1xy0Jl7VG4nVKJ3lxbrZkoBTeSVoJdWBiSEUMwMS/9+e0H/aJVQV//Lt5wuzP+E69v4aRSsNTmw==",
      "license": "Apache-2.0",
      "dependencies": {
        "@aws-sdk/core": "^3.978.1",
        "@aws-sdk/types": "^3.974.6",
        "@smithy/core": "^3.35.0",
        "@smithy/fetch-http-handler": "^5.8.0",
        "@smithy/node-http-handler": "^4.12.1",
        "@smithy/types": "^4.19.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@aws-sdk/credential-provider-ini": {
      "version": "3.973.17",
      "resolved": "https://registry.npmjs.org/@aws-sdk/credential-provider-ini/-/credential-provider-ini-3.973.17.tgz",
      "integrity": "sha512-ged4KXdBkvIC81bLvNHHuQKdKak/VXhQTR1NWYTTqW0474nlmsxy9O/vlgTIohDDWH3xpBdtVMZRyjb+DnocDA==",
      "license": "Apache-2.0",
      "dependencies": {
        "@aws-sdk/core": "^3.978.1",
        "@aws-sdk/credential-provider-env": "^3.972.72",
        "@aws-sdk/credential-provider-http": "^3.972.74",
        "@aws-sdk/credential-provider-login": "^3.972.79",
        "@aws-sdk/credential-provider-process": "^3.972.72",
        "@aws-sdk/credential-provider-sso": "^3.973.16",
        "@aws-sdk/credential-provider-web-identity": "^3.972.78",
        "@aws-sdk/nested-clients": "^3.997.46",
        "@aws-sdk/types": "^3.974.6",
        "@smithy/core": "^3.35.0",
        "@smithy/credential-provider-imds": "^4.5.2",
        "@smithy/types": "^4.19.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@aws-sdk/credential-provider-login": {
      "version": "3.972.79",
      "resolved": "https://registry.npmjs.org/@aws-sdk/credential-provider-login/-/credential-provider-login-3.972.79.tgz",
      "integrity": "sha512-L+Z85anONJd8MaiuraO4wRxATCdEejBZ3K3eymzWI5JPXa9sOS9CkIm72PBKqXKX+Z9p9NGMX5AIMXm0LEflgw==",
      "license": "Apache-2.0",
      "dependencies": {
        "@aws-sdk/core": "^3.978.1",
        "@aws-sdk/nested-clients": "^3.997.46",
        "@aws-sdk/types": "^3.974.6",
        "@smithy/core": "^3.35.0",
        "@smithy/types": "^4.19.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@aws-sdk/credential-provider-node": {
      "version": "3.972.84",
      "resolved": "https://registry.npmjs.org/@aws-sdk/credential-provider-node/-/credential-provider-node-3.972.84.tgz",
      "integrity": "sha512-oHt854odINVwzwsh+c5x69j0ajm4DbqqqVJ+O1ECsCIZeMDAbzFpXItaqP7UZstJj/ATdTk/KFSH0LaNAgV+kA==",
      "license": "Apache-2.0",
      "dependencies": {
        "@aws-sdk/credential-provider-env": "^3.972.72",
        "@aws-sdk/credential-provider-http": "^3.972.74",
        "@aws-sdk/credential-provider-ini": "^3.973.17",
        "@aws-sdk/credential-provider-process": "^3.972.72",
        "@aws-sdk/credential-provider-sso": "^3.973.16",
        "@aws-sdk/credential-provider-web-identity": "^3.972.78",
        "@aws-sdk/types": "^3.974.6",
        "@smithy/core": "^3.35.0",
        "@smithy/credential-provider-imds": "^4.5.2",
        "@smithy/types": "^4.19.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@aws-sdk/credential-provider-process": {
      "version": "3.972.72",
      "resolved": "https://registry.npmjs.org/@aws-sdk/credential-provider-process/-/credential-provider-process-3.972.72.tgz",
      "integrity": "sha512-rLIp2xbMjX/k9/od7APpqq1ZgXXnV0pOL1Th3ZsL8Wu0TRtBsDTVS8iPqcfRFcHakFxPvR04OSTv2ka2qOb/2A==",
      "license": "Apache-2.0",
      "dependencies": {
        "@aws-sdk/core": "^3.978.1",
        "@aws-sdk/types": "^3.974.6",
        "@smithy/core": "^3.35.0",
        "@smithy/types": "^4.19.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@aws-sdk/credential-provider-sso": {
      "version": "3.973.16",
      "resolved": "https://registry.npmjs.org/@aws-sdk/credential-provider-sso/-/credential-provider-sso-3.973.16.tgz",
      "integrity": "sha512-IGihaJfFZYacJJr/odqILCoK7W/mvrZ7cuK7ECn3sAu4vLC6u0V8bS7mCGbdugJ8Aum2tnvqmx0F2MRFp2rn9g==",
      "license": "Apache-2.0",
      "dependencies": {
        "@aws-sdk/core": "^3.978.1",
        "@aws-sdk/nested-clients": "^3.997.46",
        "@aws-sdk/token-providers": "3.1138.0",
        "@aws-sdk/types": "^3.974.6",
        "@smithy/core": "^3.35.0",
        "@smithy/types": "^4.19.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@aws-sdk/credential-provider-web-identity": {
      "version": "3.972.78",
      "resolved": "https://registry.npmjs.org/@aws-sdk/credential-provider-web-identity/-/credential-provider-web-identity-3.972.78.tgz",
      "integrity": "sha512-/y9WvNtlcPBGLR0qc1a+9J/xtYZfVczvLUOuXaVWylzttH7ewsxwHtjmiJSolNrVSDorIxHGHMU61CbonRkmwA==",
      "license": "Apache-2.0",
      "dependencies": {
        "@aws-sdk/core": "^3.978.1",
        "@aws-sdk/nested-clients": "^3.997.46",
        "@aws-sdk/types": "^3.974.6",
        "@smithy/core": "^3.35.0",
        "@smithy/types": "^4.19.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@aws-sdk/middleware-sdk-s3": {
      "version": "3.972.77",
      "resolved": "https://registry.npmjs.org/@aws-sdk/middleware-sdk-s3/-/middleware-sdk-s3-3.972.77.tgz",
      "integrity": "sha512-E7W2UOeUoc+lg3uIfR/dM7ZwusHwhBQrKMnlkRv4EXRR+C0YtV1pg25xC7GdZIhXH+NAMgZPCbE7o5to2cjFiw==",
      "license": "Apache-2.0",
      "dependencies": {
        "@aws-sdk/core": "^3.978.1",
        "@aws-sdk/signature-v4-multi-region": "^3.996.47",
        "@aws-sdk/types": "^3.974.6",
        "@smithy/core": "^3.35.0",
        "@smithy/types": "^4.19.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@aws-sdk/nested-clients": {
      "version": "3.997.46",
      "resolved": "https://registry.npmjs.org/@aws-sdk/nested-clients/-/nested-clients-3.997.46.tgz",
      "integrity": "sha512-oRxtBcka/JGHGs9l9p9IVajGoTP8vTPmoAzdHGy4Qcy9P5vPnDf6nhIeM/COQNY9k/OahImTRaLkHftoXvfcmQ==",
      "license": "Apache-2.0",
      "dependencies": {
        "@aws-sdk/core": "^3.978.1",
        "@aws-sdk/signature-v4-multi-region": "^3.996.47",
        "@aws-sdk/types": "^3.974.6",
        "@smithy/core": "^3.35.0",
        "@smithy/fetch-http-handler": "^5.8.0",
        "@smithy/node-http-handler": "^4.12.1",
        "@smithy/types": "^4.19.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@aws-sdk/s3-request-presigner": {
      "version": "3.1147.0",
      "resolved": "https://registry.npmjs.org/@aws-sdk/s3-request-presigner/-/s3-request-presigner-3.1147.0.tgz",
      "integrity": "sha512-9za8GOn8IRFz+foPbLfjFFfqDV87mLBhNbUg+8YgqaSIuvzx+o6bWgOAETqPev5wul6DAImTQSCgt8mBsKtGUg==",
      "license": "Apache-2.0",
      "dependencies": {
        "@aws-sdk/core": "^3.978.1",
        "@aws-sdk/signature-v4-multi-region": "^3.996.47",
        "@aws-sdk/types": "^3.974.6",
        "@smithy/core": "^3.35.0",
        "@smithy/types": "^4.19.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@aws-sdk/signature-v4-multi-region": {
      "version": "3.996.47",
      "resolved": "https://registry.npmjs.org/@aws-sdk/signature-v4-multi-region/-/signature-v4-multi-region-3.996.47.tgz",
      "integrity": "sha512-Zk08macMvQTHzQJCLJVkOlviVoqwYMrpXv4lmLN7b7sAbiMoOK7Go0NYdR5UeF+MW8LIbRmwrNy9u/5VvX1U5g==",
      "license": "Apache-2.0",
      "dependencies": {
        "@aws-sdk/types": "^3.974.6",
        "@smithy/signature-v4": "^5.7.3",
        "@smithy/types": "^4.19.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@aws-sdk/token-providers": {
      "version": "3.1138.0",
      "resolved": "https://registry.npmjs.org/@aws-sdk/token-providers/-/token-providers-3.1138.0.tgz",
      "integrity": "sha512-GpyAr0DD63YOEmYFM6Df+gJuIgC92MMTiBK4FTKfxii5MJ9ge20epR7LyroulscYlG89J+ZB2ivFDPjvfQhzdw==",
      "license": "Apache-2.0",
      "dependencies": {
        "@aws-sdk/core": "^3.978.1",
        "@aws-sdk/nested-clients": "^3.997.46",
        "@aws-sdk/types": "^3.974.6",
        "@smithy/core": "^3.35.0",
        "@smithy/types": "^4.19.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@aws-sdk/types": {
      "version": "3.974.6",
      "resolved": "https://registry.npmjs.org/@aws-sdk/types/-/types-3.974.6.tgz",
      "integrity": "sha512-v/clNZzZnDxGyvpHMOGpJKVXFAExJzUNAAjaWGdcx8QAcXLGwTaOkw33p5SHAi0YAioK32xB3hWwOekRVfmfKg==",
      "license": "Apache-2.0",
      "dependencies": {
        "@smithy/types": "^4.19.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@aws-sdk/xml-builder": {
      "version": "3.972.41",
      "resolved": "https://registry.npmjs.org/@aws-sdk/xml-builder/-/xml-builder-3.972.41.tgz",
      "integrity": "sha512-ctjVSyCMegrWfXlx6VqzSBFI6UqmQ5ZlnfMhdLIiWmhoH8UAQxSCP5N3OpG7X3k4LnS7ou74C4mt20+bfTW2aQ==",
      "license": "Apache-2.0",
      "dependencies": {
        "@smithy/types": "^4.19.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@aws/lambda-invoke-store": {
      "version": "0.3.0",
      "resolved": "https://registry.npmjs.org/@aws/lambda-invoke-store/-/lambda-invoke-store-0.3.0.tgz",
      "integrity": "sha512-sl4Bm6yiMNYrZKkqqDFWN0UfnWhlS8ivKxrYl+6t0gCLrqr8y3B2IqZZbFRkfaVVp7C/baApyh71P+LeE1A2sQ==",
      "license": "Apache-2.0",
      "engines": {
        "node": ">=18.0.0"
      }
    },
    "node_modules/@emnapi/runtime": {
      "version": "1.11.3",
      "resolved": "https://registry.npmjs.org/@emnapi/runtime/-/runtime-1.11.3.tgz",
      "integrity": "sha512-Xz4Tpyki7XyrpbUK1jR1AhdAdaXyhhY4lZ3neLodmhpuWfy2PAQN5B46sAiU4liOXGLkHypn/qU+jvfWSCYYLA==",
      "license": "MIT",
      "optional": true,
      "dependencies": {
        "tslib": "^2.4.0"
      }
    },
    "node_modules/@esbuild/aix-ppc64": {
      "version": "0.28.2",
      "resolved": "https://registry.npmjs.org/@esbuild/aix-ppc64/-/aix-ppc64-0.28.2.tgz",
      "integrity": "sha512-XExcO+dvLKvVtNTibSTBej1NCAbaGhWn9Ww1ZPx80qsahhPFe/8jgWP0IchNe0F3HwkU7n8ejhH8bjonqht8mQ==",
      "cpu": [
        "ppc64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "aix"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/android-arm": {
      "version": "0.28.2",
      "resolved": "https://registry.npmjs.org/@esbuild/android-arm/-/android-arm-0.28.2.tgz",
      "integrity": "sha512-kXXoiPVVGQcnIYGOeaovwOURpniDBpSq4A03qkQ+BMQqtGG6HYap3xne9C1O1yo4TR3qxlCX5IqqmX6fFo2Lqg==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/android-arm64": {
      "version": "0.28.2",
      "resolved": "https://registry.npmjs.org/@esbuild/android-arm64/-/android-arm64-0.28.2.tgz",
      "integrity": "sha512-5YfKeeI8qWfBZIX+u2xZC3Zlb3Os/gLS2sbEKM+I4ZOcsWmHS2WLysCcQZDAFRslDUU5Oiq44gf6PYN1vGwG5A==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/android-x64": {
      "version": "0.28.2",
      "resolved": "https://registry.npmjs.org/@esbuild/android-x64/-/android-x64-0.28.2.tgz",
      "integrity": "sha512-O387ite7SzUyCcy3JQX4P4bLtEA7bLLkx+esve5JHnyYfNTxcVpXZo9jhdB0lTKN44gztELTdU7nS8Nr16Fs1Q==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/darwin-arm64": {
      "version": "0.28.2",
      "resolved": "https://registry.npmjs.org/@esbuild/darwin-arm64/-/darwin-arm64-0.28.2.tgz",
      "integrity": "sha512-n4KqkOQrraxHJcgjM1RvwbigfQKIKJVpM7xp+KsxiyUSrRdIXnt73VhrPAx0fV44hgfmIVKjxMN9J1t5jySVkw==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/darwin-x64": {
      "version": "0.28.2",
      "resolved": "https://registry.npmjs.org/@esbuild/darwin-x64/-/darwin-x64-0.28.2.tgz",
      "integrity": "sha512-uq6suIWYP37qzGddBKPw5QEQPi6HiLGsO7UmkpfyaYNQ3D+rN6w6WfwH+nuqcGXWvawGwxOEroO4YGnFh95azw==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/freebsd-arm64": {
      "version": "0.28.2",
      "resolved": "https://registry.npmjs.org/@esbuild/freebsd-arm64/-/freebsd-arm64-0.28.2.tgz",
      "integrity": "sha512-n+I0BTSRIoy+d6RPKnEVwql5UwBJolytvY4mAOIEJorKlqgPII8ix6slVVrfZ5Tnj7glIZvloylbB/EJPMWEXw==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "freebsd"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/freebsd-x64": {
      "version": "0.28.2",
      "resolved": "https://registry.npmjs.org/@esbuild/freebsd-x64/-/freebsd-x64-0.28.2.tgz",
      "integrity": "sha512-78XJTJkvPs0kz2w61301PJjXl4g7q3JqiYMZ/M/yVI73EHBrCRTgkhu9oqG7vPqq+a/yadEW8aD+agKlk5xrmg==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "freebsd"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-arm": {
      "version": "0.28.2",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-arm/-/linux-arm-0.28.2.tgz",
      "integrity": "sha512-XlDnu2q5yoqems+xay6wSAcg9DDD7K9RLKZEBOMZm3ckNpJBvOX20tSfby8KfrrhINDyv9V2YVZKY/SpoGJI8w==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-arm64": {
      "version": "0.28.2",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-arm64/-/linux-arm64-0.28.2.tgz",
      "integrity": "sha512-pW4AC0P3it8c7do9MVM4p51FzHzdM/TZrerurgRcHJ2WTa1VQ1CIq18xncfpBJw4ojkiZZrKW2yIBWBP92j6Ug==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-ia32": {
      "version": "0.28.2",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-ia32/-/linux-ia32-0.28.2.tgz",
      "integrity": "sha512-CYbnj78HsIeA+DhgUKgFCfvNsTHFhMMrinUrMZpDXJXKN8T3XViTZ/+wtHeVxEWY8ewSzTFN+nRmSwO2tZaLUQ==",
      "cpu": [
        "ia32"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-loong64": {
      "version": "0.28.2",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-loong64/-/linux-loong64-0.28.2.tgz",
      "integrity": "sha512-buwkd8nsph4R+ajRvw0qM5Hja/TXQow3ptzWO2EbG/cqcIkHloRrdlBtQlshyYGTNFvfkfJ5tpPLVkY4DtsPfQ==",
      "cpu": [
        "loong64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-mips64el": {
      "version": "0.28.2",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-mips64el/-/linux-mips64el-0.28.2.tgz",
      "integrity": "sha512-ZVykbDyk7519VwiNb9Lcj9m8XM6v5V9uKPvrEMkkEedVewf+0itkhahp4HDpgERXhwLRpWFypsGbG/J8s0QjJA==",
      "cpu": [
        "mips64el"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-ppc64": {
      "version": "0.28.2",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-ppc64/-/linux-ppc64-0.28.2.tgz",
      "integrity": "sha512-CAXl+Dtd9UUuJd8pKKdwh6MLm3MUMiqMPmhZ3tTSXPqfyQ3vDl6R5hZdZ/kYojK4ofXtdfSv1tFq8XzWx3heNQ==",
      "cpu": [
        "ppc64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-riscv64": {
      "version": "0.28.2",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-riscv64/-/linux-riscv64-0.28.2.tgz",
      "integrity": "sha512-GeXCej4IQtU1B+QlDV8W/RRvbzI3O/Stss+/bCXv4lZls5WGRtu2a+3JkA3i4qIUlMXpcHebWpF8AkJhATowuA==",
      "cpu": [
        "riscv64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-s390x": {
      "version": "0.28.2",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-s390x/-/linux-s390x-0.28.2.tgz",
      "integrity": "sha512-3H1weTYZPxt/WOhByszQZybS9w5lKzUn1FDMsgEChbHWQwHYQQRfBxgCcZvPhjHfKyJjIievvMmEUawJrdY9Dg==",
      "cpu": [
        "s390x"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-x64": {
      "version": "0.28.2",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-x64/-/linux-x64-0.28.2.tgz",
      "integrity": "sha512-4xTZr1FUmSoQW4XIWmit3tzQrUTZM+N3P0XV8xROKYF50XfI7xeO90+1bZvNwxIufQ9hDQVRJH5YhgPVF8A/HQ==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/netbsd-arm64": {
      "version": "0.28.2",
      "resolved": "https://registry.npmjs.org/@esbuild/netbsd-arm64/-/netbsd-arm64-0.28.2.tgz",
      "integrity": "sha512-sSATRjPeDBg3pdgHoQfoYBob11Kk1FGa9lui5RIHZCoCkJa9QKlvl3/vKz2usCmYYjs7ymJR/2Nnsqe+Hjt5nw==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "netbsd"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/netbsd-x64": {
      "version": "0.28.2",
      "resolved": "https://registry.npmjs.org/@esbuild/netbsd-x64/-/netbsd-x64-0.28.2.tgz",
      "integrity": "sha512-lqnzCV+mM0gIADaKihiCg6ifgfU2L3h5E33rNQBN1Y4MaVGnzryzmvvf7UHxprpQdE8hpqLolJ9Rl+SkIRDpyw==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "netbsd"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/openbsd-arm64": {
      "version": "0.28.2",
      "resolved": "https://registry.npmjs.org/@esbuild/openbsd-arm64/-/openbsd-arm64-0.28.2.tgz",
      "integrity": "sha512-AL2qJILH7lNjrDmCQDvdxMfAUIv8KMNZOvrwAQ8i8//ntL9FflhOyMJ8OZSMBb8/AWXe3/5v5S20y3zCoZWKoQ==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "openbsd"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/openbsd-x64": {
      "version": "0.28.2",
      "resolved": "https://registry.npmjs.org/@esbuild/openbsd-x64/-/openbsd-x64-0.28.2.tgz",
      "integrity": "sha512-QtiuPytchRyC4rwUKhexJdQKvDuZ6hWloi3igqPQNUJCS1/v9EiO3UTOXR6A3FoMo4fnAKbWJdqaIwhOzh8qEw==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "openbsd"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/openharmony-arm64": {
      "version": "0.28.2",
      "resolved": "https://registry.npmjs.org/@esbuild/openharmony-arm64/-/openharmony-arm64-0.28.2.tgz",
      "integrity": "sha512-WkhYDmpTjLvGlScA1rwjRUmhl4k8oXR3cIbtqWmELgU/dFeHHlEllxDvdWcNJV9rbzCexB5vz8gtNewWLgCT7Q==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "openharmony"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/sunos-x64": {
      "version": "0.28.2",
      "resolved": "https://registry.npmjs.org/@esbuild/sunos-x64/-/sunos-x64-0.28.2.tgz",
      "integrity": "sha512-GPMSkTOtMnv2U2F8gxe4Io6qmVs+YKyp832Etqqxr0hFngmXQ3rzwytelm3GIn7T4VviRUlf3sOgBOiTdvaf7g==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "sunos"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/win32-arm64": {
      "version": "0.28.2",
      "resolved": "https://registry.npmjs.org/@esbuild/win32-arm64/-/win32-arm64-0.28.2.tgz",
      "integrity": "sha512-PIhhEkE9uPBleRBrQEJpUn7MBnibZzbGzYWPmY3x+YoVg/95zbjB4CxPPOQ8l5tYYM4mMaCthF8/1DIfBQQyWQ==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/win32-ia32": {
      "version": "0.28.2",
      "resolved": "https://registry.npmjs.org/@esbuild/win32-ia32/-/win32-ia32-0.28.2.tgz",
      "integrity": "sha512-YmJbfTlvU7Sdn9BB+4PRES4oB6pxgS37MAONj+hBr/cpXS1aBPKXxNnDbu+QCWPj0o9dgyxeq79g6c5P8KeuYA==",
      "cpu": [
        "ia32"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/win32-x64": {
      "version": "0.28.2",
      "resolved": "https://registry.npmjs.org/@esbuild/win32-x64/-/win32-x64-0.28.2.tgz",
      "integrity": "sha512-5ebpxr3nWMzrL/rnUI755Jkuee0bHL/Gq0WTF9lvcpv73wAp5eu8MfBUgWK9bhWvZjj7yX8etf/8tI8Ney695g==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@img/colour": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@img/colour/-/colour-1.1.0.tgz",
      "integrity": "sha512-Td76q7j57o/tLVdgS746cYARfSyxk8iEfRxewL9h4OMzYhbW4TAcppl0mT4eyqXddh6L/jwoM75mo7ixa/pCeQ==",
      "license": "MIT",
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@img/sharp-darwin-arm64": {
      "version": "0.34.5",
      "resolved": "https://registry.npmjs.org/@img/sharp-darwin-arm64/-/sharp-darwin-arm64-0.34.5.tgz",
      "integrity": "sha512-imtQ3WMJXbMY4fxb/Ndp6HBTNVtWCUI0WdobyheGf5+ad6xX8VIDO8u2xE4qc/fr08CKG/7dDseFtn6M6g/r3w==",
      "cpu": [
        "arm64"
      ],
      "license": "Apache-2.0",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": "^18.17.0 || ^20.3.0 || >=21.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      },
      "optionalDependencies": {
        "@img/sharp-libvips-darwin-arm64": "1.2.4"
      }
    },
    "node_modules/@img/sharp-darwin-x64": {
      "version": "0.34.5",
      "resolved": "https://registry.npmjs.org/@img/sharp-darwin-x64/-/sharp-darwin-x64-0.34.5.tgz",
      "integrity": "sha512-YNEFAF/4KQ/PeW0N+r+aVVsoIY0/qxxikF2SWdp+NRkmMB7y9LBZAVqQ4yhGCm/H3H270OSykqmQMKLBhBJDEw==",
      "cpu": [
        "x64"
      ],
      "license": "Apache-2.0",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": "^18.17.0 || ^20.3.0 || >=21.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      },
      "optionalDependencies": {
        "@img/sharp-libvips-darwin-x64": "1.2.4"
      }
    },
    "node_modules/@img/sharp-freebsd-wasm32": {
      "version": "0.35.5",
      "resolved": "https://registry.npmjs.org/@img/sharp-freebsd-wasm32/-/sharp-freebsd-wasm32-0.35.5.tgz",
      "integrity": "sha512-Y/z91nEZ4uIBX5X3nfTovjU9lHNKFYbL2lpHCLVNmXQK03VIZvXBBt0KxbPGp2SdGSF+2mQU4e+hQaWOt86iAw==",
      "license": "Apache-2.0",
      "optional": true,
      "os": [
        "freebsd"
      ],
      "dependencies": {
        "@img/sharp-wasm32": "0.35.5"
      },
      "engines": {
        "node": ">=20.9.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/@img/sharp-freebsd-wasm32/node_modules/@img/sharp-wasm32": {
      "version": "0.35.5",
      "resolved": "https://registry.npmjs.org/@img/sharp-wasm32/-/sharp-wasm32-0.35.5.tgz",
      "integrity": "sha512-Ptsga1su4tQx+LLF1ECS9U6nz5kmrXKo6XVbtR48Ke3ZRxxgaWBu7IDtEe1quo8hiupwm6WFqxVlXaSf7IINGQ==",
      "license": "Apache-2.0 AND LGPL-3.0-or-later AND MIT",
      "optional": true,
      "dependencies": {
        "@emnapi/runtime": "^1.11.3"
      },
      "engines": {
        "node": ">=20.9.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/@img/sharp-libvips-darwin-arm64": {
      "version": "1.2.4",
      "resolved": "https://registry.npmjs.org/@img/sharp-libvips-darwin-arm64/-/sharp-libvips-darwin-arm64-1.2.4.tgz",
      "integrity": "sha512-zqjjo7RatFfFoP0MkQ51jfuFZBnVE2pRiaydKJ1G/rHZvnsrHAOcQALIi9sA5co5xenQdTugCvtb1cuf78Vf4g==",
      "cpu": [
        "arm64"
      ],
      "license": "LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "darwin"
      ],
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/@img/sharp-libvips-darwin-x64": {
      "version": "1.2.4",
      "resolved": "https://registry.npmjs.org/@img/sharp-libvips-darwin-x64/-/sharp-libvips-darwin-x64-1.2.4.tgz",
      "integrity": "sha512-1IOd5xfVhlGwX+zXv2N93k0yMONvUlANylbJw1eTah8K/Jtpi15KC+WSiaX/nBmbm2HxRM1gZ0nSdjSsrZbGKg==",
      "cpu": [
        "x64"
      ],
      "license": "LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "darwin"
      ],
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/@img/sharp-libvips-linux-arm": {
      "version": "1.2.4",
      "resolved": "https://registry.npmjs.org/@img/sharp-libvips-linux-arm/-/sharp-libvips-linux-arm-1.2.4.tgz",
      "integrity": "sha512-bFI7xcKFELdiNCVov8e44Ia4u2byA+l3XtsAj+Q8tfCwO6BQ8iDojYdvoPMqsKDkuoOo+X6HZA0s0q11ANMQ8A==",
      "cpu": [
        "arm"
      ],
      "license": "LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "linux"
      ],
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/@img/sharp-libvips-linux-arm64": {
      "version": "1.2.4",
      "resolved": "https://registry.npmjs.org/@img/sharp-libvips-linux-arm64/-/sharp-libvips-linux-arm64-1.2.4.tgz",
      "integrity": "sha512-excjX8DfsIcJ10x1Kzr4RcWe1edC9PquDRRPx3YVCvQv+U5p7Yin2s32ftzikXojb1PIFc/9Mt28/y+iRklkrw==",
      "cpu": [
        "arm64"
      ],
      "license": "LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "linux"
      ],
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/@img/sharp-libvips-linux-ppc64": {
      "version": "1.2.4",
      "resolved": "https://registry.npmjs.org/@img/sharp-libvips-linux-ppc64/-/sharp-libvips-linux-ppc64-1.2.4.tgz",
      "integrity": "sha512-FMuvGijLDYG6lW+b/UvyilUWu5Ayu+3r2d1S8notiGCIyYU/76eig1UfMmkZ7vwgOrzKzlQbFSuQfgm7GYUPpA==",
      "cpu": [
        "ppc64"
      ],
      "license": "LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "linux"
      ],
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/@img/sharp-libvips-linux-riscv64": {
      "version": "1.2.4",
      "resolved": "https://registry.npmjs.org/@img/sharp-libvips-linux-riscv64/-/sharp-libvips-linux-riscv64-1.2.4.tgz",
      "integrity": "sha512-oVDbcR4zUC0ce82teubSm+x6ETixtKZBh/qbREIOcI3cULzDyb18Sr/Wcyx7NRQeQzOiHTNbZFF1UwPS2scyGA==",
      "cpu": [
        "riscv64"
      ],
      "license": "LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "linux"
      ],
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/@img/sharp-libvips-linux-s390x": {
      "version": "1.2.4",
      "resolved": "https://registry.npmjs.org/@img/sharp-libvips-linux-s390x/-/sharp-libvips-linux-s390x-1.2.4.tgz",
      "integrity": "sha512-qmp9VrzgPgMoGZyPvrQHqk02uyjA0/QrTO26Tqk6l4ZV0MPWIW6LTkqOIov+J1yEu7MbFQaDpwdwJKhbJvuRxQ==",
      "cpu": [
        "s390x"
      ],
      "license": "LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "linux"
      ],
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/@img/sharp-libvips-linux-x64": {
      "version": "1.2.4",
      "resolved": "https://registry.npmjs.org/@img/sharp-libvips-linux-x64/-/sharp-libvips-linux-x64-1.2.4.tgz",
      "integrity": "sha512-tJxiiLsmHc9Ax1bz3oaOYBURTXGIRDODBqhveVHonrHJ9/+k89qbLl0bcJns+e4t4rvaNBxaEZsFtSfAdquPrw==",
      "cpu": [
        "x64"
      ],
      "license": "LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "linux"
      ],
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/@img/sharp-libvips-linuxmusl-arm64": {
      "version": "1.2.4",
      "resolved": "https://registry.npmjs.org/@img/sharp-libvips-linuxmusl-arm64/-/sharp-libvips-linuxmusl-arm64-1.2.4.tgz",
      "integrity": "sha512-FVQHuwx1IIuNow9QAbYUzJ+En8KcVm9Lk5+uGUQJHaZmMECZmOlix9HnH7n1TRkXMS0pGxIJokIVB9SuqZGGXw==",
      "cpu": [
        "arm64"
      ],
      "license": "LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "linux"
      ],
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/@img/sharp-libvips-linuxmusl-x64": {
      "version": "1.2.4",
      "resolved": "https://registry.npmjs.org/@img/sharp-libvips-linuxmusl-x64/-/sharp-libvips-linuxmusl-x64-1.2.4.tgz",
      "integrity": "sha512-+LpyBk7L44ZIXwz/VYfglaX/okxezESc6UxDSoyo2Ks6Jxc4Y7sGjpgU9s4PMgqgjj1gZCylTieNamqA1MF7Dg==",
      "cpu": [
        "x64"
      ],
      "license": "LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "linux"
      ],
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/@img/sharp-linux-arm": {
      "version": "0.34.5",
      "resolved": "https://registry.npmjs.org/@img/sharp-linux-arm/-/sharp-linux-arm-0.34.5.tgz",
      "integrity": "sha512-9dLqsvwtg1uuXBGZKsxem9595+ujv0sJ6Vi8wcTANSFpwV/GONat5eCkzQo/1O6zRIkh0m/8+5BjrRr7jDUSZw==",
      "cpu": [
        "arm"
      ],
      "license": "Apache-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^18.17.0 || ^20.3.0 || >=21.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      },
      "optionalDependencies": {
        "@img/sharp-libvips-linux-arm": "1.2.4"
      }
    },
    "node_modules/@img/sharp-linux-arm64": {
      "version": "0.34.5",
      "resolved": "https://registry.npmjs.org/@img/sharp-linux-arm64/-/sharp-linux-arm64-0.34.5.tgz",
      "integrity": "sha512-bKQzaJRY/bkPOXyKx5EVup7qkaojECG6NLYswgktOZjaXecSAeCWiZwwiFf3/Y+O1HrauiE3FVsGxFg8c24rZg==",
      "cpu": [
        "arm64"
      ],
      "license": "Apache-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^18.17.0 || ^20.3.0 || >=21.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      },
      "optionalDependencies": {
        "@img/sharp-libvips-linux-arm64": "1.2.4"
      }
    },
    "node_modules/@img/sharp-linux-ppc64": {
      "version": "0.34.5",
      "resolved": "https://registry.npmjs.org/@img/sharp-linux-ppc64/-/sharp-linux-ppc64-0.34.5.tgz",
      "integrity": "sha512-7zznwNaqW6YtsfrGGDA6BRkISKAAE1Jo0QdpNYXNMHu2+0dTrPflTLNkpc8l7MUP5M16ZJcUvysVWWrMefZquA==",
      "cpu": [
        "ppc64"
      ],
      "license": "Apache-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^18.17.0 || ^20.3.0 || >=21.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      },
      "optionalDependencies": {
        "@img/sharp-libvips-linux-ppc64": "1.2.4"
      }
    },
    "node_modules/@img/sharp-linux-riscv64": {
      "version": "0.34.5",
      "resolved": "https://registry.npmjs.org/@img/sharp-linux-riscv64/-/sharp-linux-riscv64-0.34.5.tgz",
      "integrity": "sha512-51gJuLPTKa7piYPaVs8GmByo7/U7/7TZOq+cnXJIHZKavIRHAP77e3N2HEl3dgiqdD/w0yUfiJnII77PuDDFdw==",
      "cpu": [
        "riscv64"
      ],
      "license": "Apache-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^18.17.0 || ^20.3.0 || >=21.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      },
      "optionalDependencies": {
        "@img/sharp-libvips-linux-riscv64": "1.2.4"
      }
    },
    "node_modules/@img/sharp-linux-s390x": {
      "version": "0.34.5",
      "resolved": "https://registry.npmjs.org/@img/sharp-linux-s390x/-/sharp-linux-s390x-0.34.5.tgz",
      "integrity": "sha512-nQtCk0PdKfho3eC5MrbQoigJ2gd1CgddUMkabUj+rBevs8tZ2cULOx46E7oyX+04WGfABgIwmMC0VqieTiR4jg==",
      "cpu": [
        "s390x"
      ],
      "license": "Apache-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^18.17.0 || ^20.3.0 || >=21.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      },
      "optionalDependencies": {
        "@img/sharp-libvips-linux-s390x": "1.2.4"
      }
    },
    "node_modules/@img/sharp-linux-x64": {
      "version": "0.34.5",
      "resolved": "https://registry.npmjs.org/@img/sharp-linux-x64/-/sharp-linux-x64-0.34.5.tgz",
      "integrity": "sha512-MEzd8HPKxVxVenwAa+JRPwEC7QFjoPWuS5NZnBt6B3pu7EG2Ge0id1oLHZpPJdn3OQK+BQDiw9zStiHBTJQQQQ==",
      "cpu": [
        "x64"
      ],
      "license": "Apache-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^18.17.0 || ^20.3.0 || >=21.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      },
      "optionalDependencies": {
        "@img/sharp-libvips-linux-x64": "1.2.4"
      }
    },
    "node_modules/@img/sharp-linuxmusl-arm64": {
      "version": "0.34.5",
      "resolved": "https://registry.npmjs.org/@img/sharp-linuxmusl-arm64/-/sharp-linuxmusl-arm64-0.34.5.tgz",
      "integrity": "sha512-fprJR6GtRsMt6Kyfq44IsChVZeGN97gTD331weR1ex1c1rypDEABN6Tm2xa1wE6lYb5DdEnk03NZPqA7Id21yg==",
      "cpu": [
        "arm64"
      ],
      "license": "Apache-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^18.17.0 || ^20.3.0 || >=21.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      },
      "optionalDependencies": {
        "@img/sharp-libvips-linuxmusl-arm64": "1.2.4"
      }
    },
    "node_modules/@img/sharp-linuxmusl-x64": {
      "version": "0.34.5",
      "resolved": "https://registry.npmjs.org/@img/sharp-linuxmusl-x64/-/sharp-linuxmusl-x64-0.34.5.tgz",
      "integrity": "sha512-Jg8wNT1MUzIvhBFxViqrEhWDGzqymo3sV7z7ZsaWbZNDLXRJZoRGrjulp60YYtV4wfY8VIKcWidjojlLcWrd8Q==",
      "cpu": [
        "x64"
      ],
      "license": "Apache-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^18.17.0 || ^20.3.0 || >=21.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      },
      "optionalDependencies": {
        "@img/sharp-libvips-linuxmusl-x64": "1.2.4"
      }
    },
    "node_modules/@img/sharp-wasm32": {
      "version": "0.34.5",
      "resolved": "https://registry.npmjs.org/@img/sharp-wasm32/-/sharp-wasm32-0.34.5.tgz",
      "integrity": "sha512-OdWTEiVkY2PHwqkbBI8frFxQQFekHaSSkUIJkwzclWZe64O1X4UlUjqqqLaPbUpMOQk6FBu/HtlGXNblIs0huw==",
      "cpu": [
        "wasm32"
      ],
      "license": "Apache-2.0 AND LGPL-3.0-or-later AND MIT",
      "optional": true,
      "dependencies": {
        "@emnapi/runtime": "^1.7.0"
      },
      "engines": {
        "node": "^18.17.0 || ^20.3.0 || >=21.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/@img/sharp-webcontainers-wasm32": {
      "version": "0.35.5",
      "resolved": "https://registry.npmjs.org/@img/sharp-webcontainers-wasm32/-/sharp-webcontainers-wasm32-0.35.5.tgz",
      "integrity": "sha512-hfhF/FmoQyTUkA0bIKFOtw536BQSeBMe6BF6QyWlrPxT754+TFLaZ7sKKTfvvM0yJgKgaYTwnFCIZ/GuDw5SUA==",
      "cpu": [
        "wasm32"
      ],
      "license": "Apache-2.0",
      "optional": true,
      "dependencies": {
        "@img/sharp-wasm32": "0.35.5"
      },
      "engines": {
        "node": ">=20.9.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/@img/sharp-webcontainers-wasm32/node_modules/@img/sharp-wasm32": {
      "version": "0.35.5",
      "resolved": "https://registry.npmjs.org/@img/sharp-wasm32/-/sharp-wasm32-0.35.5.tgz",
      "integrity": "sha512-Ptsga1su4tQx+LLF1ECS9U6nz5kmrXKo6XVbtR48Ke3ZRxxgaWBu7IDtEe1quo8hiupwm6WFqxVlXaSf7IINGQ==",
      "license": "Apache-2.0 AND LGPL-3.0-or-later AND MIT",
      "optional": true,
      "dependencies": {
        "@emnapi/runtime": "^1.11.3"
      },
      "engines": {
        "node": ">=20.9.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/@img/sharp-win32-arm64": {
      "version": "0.34.5",
      "resolved": "https://registry.npmjs.org/@img/sharp-win32-arm64/-/sharp-win32-arm64-0.34.5.tgz",
      "integrity": "sha512-WQ3AgWCWYSb2yt+IG8mnC6Jdk9Whs7O0gxphblsLvdhSpSTtmu69ZG1Gkb6NuvxsNACwiPV6cNSZNzt0KPsw7g==",
      "cpu": [
        "arm64"
      ],
      "license": "Apache-2.0 AND LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": "^18.17.0 || ^20.3.0 || >=21.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/@img/sharp-win32-ia32": {
      "version": "0.34.5",
      "resolved": "https://registry.npmjs.org/@img/sharp-win32-ia32/-/sharp-win32-ia32-0.34.5.tgz",
      "integrity": "sha512-FV9m/7NmeCmSHDD5j4+4pNI8Cp3aW+JvLoXcTUo0IqyjSfAZJ8dIUmijx1qaJsIiU+Hosw6xM5KijAWRJCSgNg==",
      "cpu": [
        "ia32"
      ],
      "license": "Apache-2.0 AND LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": "^18.17.0 || ^20.3.0 || >=21.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/@img/sharp-win32-x64": {
      "version": "0.34.5",
      "resolved": "https://registry.npmjs.org/@img/sharp-win32-x64/-/sharp-win32-x64-0.34.5.tgz",
      "integrity": "sha512-+29YMsqY2/9eFEiW93eqWnuLcWcufowXewwSNIT6UwZdUUCrM3oFjMWH/Z6/TMmb4hlFenmfAVbpWeup2jryCw==",
      "cpu": [
        "x64"
      ],
      "license": "Apache-2.0 AND LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": "^18.17.0 || ^20.3.0 || >=21.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/@isaacs/cliui": {
      "version": "8.0.2",
      "resolved": "https://registry.npmjs.org/@isaacs/cliui/-/cliui-8.0.2.tgz",
      "integrity": "sha512-O8jcjabXaleOG9DQ0+ARXWZBTfnP4WNAqzuiJK7ll44AmxGKv/J2M4TPjxjY3znBCfvBXFzucm1twdyFybFqEA==",
      "license": "ISC",
      "dependencies": {
        "string-width": "^5.1.2",
        "string-width-cjs": "npm:string-width@^4.2.0",
        "strip-ansi": "^7.0.1",
        "strip-ansi-cjs": "npm:strip-ansi@^6.0.1",
        "wrap-ansi": "^8.1.0",
        "wrap-ansi-cjs": "npm:wrap-ansi@^7.0.0"
      },
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/@next/env": {
      "version": "16.4.0",
      "resolved": "https://registry.npmjs.org/@next/env/-/env-16.4.0.tgz",
      "integrity": "sha512-pyLlT5oafGlX8X7xjgGNXz5dNIDSxREm+qD6i9VLSZiZFopA/XWl8NM/KPmLx/8EG/++c49iid3gNWSQW1+2dQ==",
      "license": "MIT"
    },
    "node_modules/@next/swc-darwin-arm64": {
      "version": "16.4.0",
      "resolved": "https://registry.npmjs.org/@next/swc-darwin-arm64/-/swc-darwin-arm64-16.4.0.tgz",
      "integrity": "sha512-yyZ+9MgViAKLLb5l1gPBGjRwnq3teNLb5Zx6JEw8LzNSTjlsnp+baUHFxTgl7PpjCmKf48VQfyipG1eBflb48Q==",
      "cpu": [
        "arm64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/@next/swc-darwin-x64": {
      "version": "16.4.0",
      "resolved": "https://registry.npmjs.org/@next/swc-darwin-x64/-/swc-darwin-x64-16.4.0.tgz",
      "integrity": "sha512-RePEEejEj1Auf5s9qEcG0JbcDP3ceNUS/ofNX8AhxzgIjTVlZIHMatlp16YplcSMpsVo/ZMQHJTjbMYJznjGUg==",
      "cpu": [
        "x64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/@next/swc-linux-arm64-gnu": {
      "version": "16.4.0",
      "resolved": "https://registry.npmjs.org/@next/swc-linux-arm64-gnu/-/swc-linux-arm64-gnu-16.4.0.tgz",
      "integrity": "sha512-HhsyCqd+NpmvDDVY/LqkAN24f+QVvXh3ie+PfcwKinWL2Mu826JymQxJXGjAIfmJ4VlHjp4Pe/nZtXtUoEMAqw==",
      "cpu": [
        "arm64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/@next/swc-linux-arm64-musl": {
      "version": "16.4.0",
      "resolved": "https://registry.npmjs.org/@next/swc-linux-arm64-musl/-/swc-linux-arm64-musl-16.4.0.tgz",
      "integrity": "sha512-sN9Pf+Zh+RpZAOmbR7d8KAA8T61CVhawtbEJ2Bk6QrRzx6Z/6haaF4UiwBzytM96GRRRWZh9/WALIEO3npMamA==",
      "cpu": [
        "arm64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/@next/swc-linux-x64-gnu": {
      "version": "16.4.0",
      "resolved": "https://registry.npmjs.org/@next/swc-linux-x64-gnu/-/swc-linux-x64-gnu-16.4.0.tgz",
      "integrity": "sha512-D5M5xLWQVd1CvR+L7BickM1weRfmM41x3L1NWcnKY/oyJJqr1qwaCgmu3dMAhLBOMdZwSuDCRV6DJRRpiUkbDQ==",
      "cpu": [
        "x64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/@next/swc-linux-x64-musl": {
      "version": "16.4.0",
      "resolved": "https://registry.npmjs.org/@next/swc-linux-x64-musl/-/swc-linux-x64-musl-16.4.0.tgz",
      "integrity": "sha512-8d5WLS6a9YalqpOgXdlbvonFu+sIgjA+CO6tGzetrpPVcUL56foa7B7664h41rAlbLi5fJwK4vWji3zf4QDy+w==",
      "cpu": [
        "x64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/@next/swc-win32-arm64-msvc": {
      "version": "16.4.0",
      "resolved": "https://registry.npmjs.org/@next/swc-win32-arm64-msvc/-/swc-win32-arm64-msvc-16.4.0.tgz",
      "integrity": "sha512-sQuOIiW3snb48UwrBcDMvFA/u03qtw2LeuSIxFIQ9AJuW9UG/4Ddsfo+eV73PnZwBhyncMtsKVh7PrzMol2/fA==",
      "cpu": [
        "arm64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/@next/swc-win32-x64-msvc": {
      "version": "16.4.0",
      "resolved": "https://registry.npmjs.org/@next/swc-win32-x64-msvc/-/swc-win32-x64-msvc-16.4.0.tgz",
      "integrity": "sha512-6/33lCuxpdHUy27RegyGM/5uTpF7YZd3UR4D0gpkOA/tWY5YR7msbQjqPgCZmSmxrrTLGCXYA4A8vT2H5DPGTQ==",
      "cpu": [
        "x64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/@pkgjs/parseargs": {
      "version": "0.11.0",
      "resolved": "https://registry.npmjs.org/@pkgjs/parseargs/-/parseargs-0.11.0.tgz",
      "integrity": "sha512-+1VkjdD0QBLPodGrJUeqarH8VAIvQODIbwh9XpP5Syisf7YoQgsJKPNFoqqLQlu+VQ/tVSshMR6loPMn8U+dPg==",
      "license": "MIT",
      "optional": true,
      "engines": {
        "node": ">=14"
      }
    },
    "node_modules/@playwright/test": {
      "version": "1.56.1",
      "resolved": "https://registry.npmjs.org/@playwright/test/-/test-1.56.1.tgz",
      "integrity": "sha512-vSMYtL/zOcFpvJCW71Q/OEGQb7KYBPAdKh35WNSkaZA75JlAO8ED8UN6GUNTm3drWomcbcqRPFqQbLae8yBTdg==",
      "devOptional": true,
      "license": "Apache-2.0",
      "dependencies": {
        "playwright": "1.56.1"
      },
      "bin": {
        "playwright": "cli.js"
      },
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@prisma/client": {
      "version": "6.19.0",
      "resolved": "https://registry.npmjs.org/@prisma/client/-/client-6.19.0.tgz",
      "integrity": "sha512-QXFT+N/bva/QI2qoXmjBzL7D6aliPffIwP+81AdTGq0FXDoLxLkWivGMawG8iM5B9BKfxLIXxfWWAF6wbuJU6g==",
      "hasInstallScript": true,
      "license": "Apache-2.0",
      "engines": {
        "node": ">=18.18"
      },
      "peerDependencies": {
        "prisma": "*",
        "typescript": ">=5.1.0"
      },
      "peerDependenciesMeta": {
        "prisma": {
          "optional": true
        },
        "typescript": {
          "optional": true
        }
      }
    },
    "node_modules/@prisma/config": {
      "version": "6.19.0",
      "resolved": "https://registry.npmjs.org/@prisma/config/-/config-6.19.0.tgz",
      "integrity": "sha512-zwCayme+NzI/WfrvFEtkFhhOaZb/hI+X8TTjzjJ252VbPxAl2hWHK5NMczmnG9sXck2lsXrxIZuK524E25UNmg==",
      "devOptional": true,
      "license": "Apache-2.0",
      "dependencies": {
        "c12": "3.1.0",
        "deepmerge-ts": "7.1.5",
        "effect": "3.18.4",
        "empathic": "2.0.0"
      }
    },
    "node_modules/@prisma/debug": {
      "version": "6.19.0",
      "resolved": "https://registry.npmjs.org/@prisma/debug/-/debug-6.19.0.tgz",
      "integrity": "sha512-8hAdGG7JmxrzFcTzXZajlQCidX0XNkMJkpqtfbLV54wC6LSSX6Vni25W/G+nAANwLnZ2TmwkfIuWetA7jJxJFA==",
      "devOptional": true,
      "license": "Apache-2.0"
    },
    "node_modules/@prisma/engines": {
      "version": "6.19.0",
      "resolved": "https://registry.npmjs.org/@prisma/engines/-/engines-6.19.0.tgz",
      "integrity": "sha512-pMRJ+1S6NVdXoB8QJAPIGpKZevFjxhKt0paCkRDTZiczKb7F4yTgRP8M4JdVkpQwmaD4EoJf6qA+p61godDokw==",
      "devOptional": true,
      "hasInstallScript": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@prisma/debug": "6.19.0",
        "@prisma/engines-version": "6.19.0-26.2ba551f319ab1df4bc874a89965d8b3641056773",
        "@prisma/fetch-engine": "6.19.0",
        "@prisma/get-platform": "6.19.0"
      }
    },
    "node_modules/@prisma/engines-version": {
      "version": "6.19.0-26.2ba551f319ab1df4bc874a89965d8b3641056773",
      "resolved": "https://registry.npmjs.org/@prisma/engines-version/-/engines-version-6.19.0-26.2ba551f319ab1df4bc874a89965d8b3641056773.tgz",
      "integrity": "sha512-gV7uOBQfAFlWDvPJdQxMT1aSRur3a0EkU/6cfbAC5isV67tKDWUrPauyaHNpB+wN1ebM4A9jn/f4gH+3iHSYSQ==",
      "devOptional": true,
      "license": "Apache-2.0"
    },
    "node_modules/@prisma/fetch-engine": {
      "version": "6.19.0",
      "resolved": "https://registry.npmjs.org/@prisma/fetch-engine/-/fetch-engine-6.19.0.tgz",
      "integrity": "sha512-OOx2Lda0DGrZ1rodADT06ZGqHzr7HY7LNMaFE2Vp8dp146uJld58sRuasdX0OiwpHgl8SqDTUKHNUyzEq7pDdQ==",
      "devOptional": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@prisma/debug": "6.19.0",
        "@prisma/engines-version": "6.19.0-26.2ba551f319ab1df4bc874a89965d8b3641056773",
        "@prisma/get-platform": "6.19.0"
      }
    },
    "node_modules/@prisma/get-platform": {
      "version": "6.19.0",
      "resolved": "https://registry.npmjs.org/@prisma/get-platform/-/get-platform-6.19.0.tgz",
      "integrity": "sha512-ym85WDO2yDhC3fIXHWYpG3kVMBA49cL1XD2GCsCF8xbwoy2OkDQY44gEbAt2X46IQ4Apq9H6g0Ex1iFfPqEkHA==",
      "devOptional": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@prisma/debug": "6.19.0"
      }
    },
    "node_modules/@smithy/core": {
      "version": "3.35.1",
      "resolved": "https://registry.npmjs.org/@smithy/core/-/core-3.35.1.tgz",
      "integrity": "sha512-i4YPS4B6ts7bjn7UwLnGjiZdprOvHvgGobFZsYK3GIY3E5hIqtj0rReU69BcTpGp+fvtraSNXeG1l+jtJvF55w==",
      "license": "Apache-2.0",
      "dependencies": {
        "@smithy/types": "^4.19.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=18.0.0"
      }
    },
    "node_modules/@smithy/credential-provider-imds": {
      "version": "4.5.2",
      "resolved": "https://registry.npmjs.org/@smithy/credential-provider-imds/-/credential-provider-imds-4.5.2.tgz",
      "integrity": "sha512-A9uSdn72ozbRUSit0eib0TW7nXuNPlaeM0zcGkJ+nE6tFcSDbnmtwoxbTCFBukVQcszDAyvsd7+rTduPTXpygg==",
      "license": "Apache-2.0",
      "dependencies": {
        "@smithy/core": "^3.33.2",
        "@smithy/types": "^4.17.2",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=18.0.0"
      }
    },
    "node_modules/@smithy/fetch-http-handler": {
      "version": "5.8.0",
      "resolved": "https://registry.npmjs.org/@smithy/fetch-http-handler/-/fetch-http-handler-5.8.0.tgz",
      "integrity": "sha512-ycSJu3tFAQ4v04CBB0agqFMVsSQ1iG3yw+SpgxRqKfaURpQD4CZ8Wn0zPMmSnOuTpTh65Vz+EA0rMrw089wvkA==",
      "license": "Apache-2.0",
      "dependencies": {
        "@smithy/core": "^3.33.3",
        "@smithy/types": "^4.18.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=18.0.0"
      }
    },
    "node_modules/@smithy/node-http-handler": {
      "version": "4.12.1",
      "resolved": "https://registry.npmjs.org/@smithy/node-http-handler/-/node-http-handler-4.12.1.tgz",
      "integrity": "sha512-ThMkboGeONWXAelq9FvGsuJC4rOi+qyC4/zhUF58xYpxUg5sQKx2VXZYJmtNjr4dSuBJ1HeJXETQILCz3wOHvw==",
      "license": "Apache-2.0",
      "dependencies": {
        "@smithy/core": "^3.33.3",
        "@smithy/types": "^4.18.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=18.0.0"
      }
    },
    "node_modules/@smithy/signature-v4": {
      "version": "5.7.4",
      "resolved": "https://registry.npmjs.org/@smithy/signature-v4/-/signature-v4-5.7.4.tgz",
      "integrity": "sha512-tHy0K0VtqNd5Y7Y41h0a0Lhh0L1GzC08dTWg0F7vRJWFtTENg7IZikf3wQkanYIRdb7ngoIPMTmqgUi401fEeQ==",
      "license": "Apache-2.0",
      "dependencies": {
        "@smithy/core": "^3.35.0",
        "@smithy/types": "^4.19.0",
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=18.0.0"
      }
    },
    "node_modules/@smithy/types": {
      "version": "4.19.0",
      "resolved": "https://registry.npmjs.org/@smithy/types/-/types-4.19.0.tgz",
      "integrity": "sha512-r7jh49VJxGerfAcTQA6gXcKc+98zOp/tqRwzYjgOE+iSQsP6cEU1hq2QzbuipmP68QtYdY9wKEhiCQZIzHgZ4Q==",
      "license": "Apache-2.0",
      "dependencies": {
        "tslib": "^2.6.2"
      },
      "engines": {
        "node": ">=18.0.0"
      }
    },
    "node_modules/@standard-schema/spec": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@standard-schema/spec/-/spec-1.1.0.tgz",
      "integrity": "sha512-l2aFy5jALhniG5HgqrD6jXLi/rUWrKvqN/qJx6yoJsgKhblVd+iqqU4RCXavm/jPityDo5TCvKMnpjKnOriy0w==",
      "devOptional": true,
      "license": "MIT"
    },
    "node_modules/@swc/helpers": {
      "version": "0.5.23",
      "resolved": "https://registry.npmjs.org/@swc/helpers/-/helpers-0.5.23.tgz",
      "integrity": "sha512-5lSsMOTXURePglDfvuAQUqkGek9Hg2kksOYay2m0+XR++b2NWYL/4sWyuvVBIs8oKnJaxkdi9whaL/sqN13afw==",
      "license": "Apache-2.0",
      "dependencies": {
        "tslib": "^2.8.0"
      }
    },
    "node_modules/@types/archiver": {
      "version": "6.0.4",
      "resolved": "https://registry.npmjs.org/@types/archiver/-/archiver-6.0.4.tgz",
      "integrity": "sha512-ULdQpARQ3sz9WH4nb98mJDYA0ft2A8C4f4fovvUcFwINa1cgGjY36JCAYuP5YypRq4mco1lJp1/7jEMS2oR0Hg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@types/readdir-glob": "*"
      }
    },
    "node_modules/@types/node": {
      "version": "24.19.1",
      "resolved": "https://registry.npmjs.org/@types/node/-/node-24.19.1.tgz",
      "integrity": "sha512-aS3/DG0oM05K0RIXXP+hKjinGG5IgSSVGzswZxW3O0sS3pH4/fycXundUC9XsszgKCk4gHXylTEK6hyFxVxnoQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "undici-types": ">=7.24.0 <7.24.7"
      }
    },
    "node_modules/@types/qrcode": {
      "version": "1.5.6",
      "resolved": "https://registry.npmjs.org/@types/qrcode/-/qrcode-1.5.6.tgz",
      "integrity": "sha512-te7NQcV2BOvdj2b1hCAHzAoMNuj65kNBMz0KBaxM6c3VGBOhU0dURQKOtH8CFNI/dsKkwlv32p26qYQTWoB5bw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@types/node": "*"
      }
    },
    "node_modules/@types/react": {
      "version": "19.3.0",
      "resolved": "https://registry.npmjs.org/@types/react/-/react-19.3.0.tgz",
      "integrity": "sha512-N0rFCuH9YoxG9/m61l9MfpJKfmLOVU0em7ipIz6TRgSSkvReLB9vL85GB+yr8Bs5leqpvg96JSwF4ZS1s4viQg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "csstype": "^3.2.2"
      }
    },
    "node_modules/@types/react-dom": {
      "version": "19.3.0",
      "resolved": "https://registry.npmjs.org/@types/react-dom/-/react-dom-19.3.0.tgz",
      "integrity": "sha512-ZI7bU42mZXXKHn/qNLEw2IrbiINU7X5+vfgdixBHkCNpYWXjKgfQ/P+uyGb5CjOLB9UcnTeg3rylQtV2hym44Q==",
      "dev": true,
      "license": "MIT",
      "peerDependencies": {
        "@types/react": "^19.3.0"
      }
    },
    "node_modules/@types/readdir-glob": {
      "version": "1.1.5",
      "resolved": "https://registry.npmjs.org/@types/readdir-glob/-/readdir-glob-1.1.5.tgz",
      "integrity": "sha512-raiuEPUYqXu+nvtY2Pe8s8FEmZ3x5yAH4VkLdihcPdalvsHltomrRC9BzuStrJ9yk06470hS0Crw0f1pXqD+Hg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@types/node": "*"
      }
    },
    "node_modules/abort-controller": {
      "version": "3.0.0",
      "resolved": "https://registry.npmjs.org/abort-controller/-/abort-controller-3.0.0.tgz",
      "integrity": "sha512-h8lQ8tacZYnR3vNQTgibj+tODHI5/+l06Au2Pcriv/Gmet0eaj4TwWH41sO9wnHDiQsEj19q0drzdWdeAHtweg==",
      "license": "MIT",
      "dependencies": {
        "event-target-shim": "^5.0.0"
      },
      "engines": {
        "node": ">=6.5"
      }
    },
    "node_modules/ansi-regex": {
      "version": "6.4.0",
      "resolved": "https://registry.npmjs.org/ansi-regex/-/ansi-regex-6.4.0.tgz",
      "integrity": "sha512-KzTVk2tCWAHtYrvvvaP8bJKJq2pVinhLcGEQdtLIYPbmNGNyYe8QwNaTUYQp2J7/vIsUKt5QCqAfUkYyG9DkOw==",
      "license": "MIT",
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/chalk/ansi-regex?sponsor=1"
      }
    },
    "node_modules/ansi-styles": {
      "version": "6.2.3",
      "resolved": "https://registry.npmjs.org/ansi-styles/-/ansi-styles-6.2.3.tgz",
      "integrity": "sha512-4Dj6M28JB+oAH8kFkTLUo+a2jwOFkuqb3yucU0CANcRRUbxS0cP0nZYCGjcc3BNXwRIsUVmDGgzawme7zvJHvg==",
      "license": "MIT",
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/chalk/ansi-styles?sponsor=1"
      }
    },
    "node_modules/archiver": {
      "version": "7.0.1",
      "resolved": "https://registry.npmjs.org/archiver/-/archiver-7.0.1.tgz",
      "integrity": "sha512-ZcbTaIqJOfCc03QwD468Unz/5Ir8ATtvAHsK+FdXbDIbGfihqh9mrvdcYunQzqn4HrvWWaFyaxJhGZagaJJpPQ==",
      "license": "MIT",
      "dependencies": {
        "archiver-utils": "^5.0.2",
        "async": "^3.2.4",
        "buffer-crc32": "^1.0.0",
        "readable-stream": "^4.0.0",
        "readdir-glob": "^1.1.2",
        "tar-stream": "^3.0.0",
        "zip-stream": "^6.0.1"
      },
      "engines": {
        "node": ">= 14"
      }
    },
    "node_modules/archiver-utils": {
      "version": "5.0.2",
      "resolved": "https://registry.npmjs.org/archiver-utils/-/archiver-utils-5.0.2.tgz",
      "integrity": "sha512-wuLJMmIBQYCsGZgYLTy5FIB2pF6Lfb6cXMSF8Qywwk3t20zWnAi7zLcQFdKQmIB8wyZpY5ER38x08GbwtR2cLA==",
      "license": "MIT",
      "dependencies": {
        "glob": "^10.0.0",
        "graceful-fs": "^4.2.0",
        "is-stream": "^2.0.1",
        "lazystream": "^1.0.0",
        "lodash": "^4.17.15",
        "normalize-path": "^3.0.0",
        "readable-stream": "^4.0.0"
      },
      "engines": {
        "node": ">= 14"
      }
    },
    "node_modules/async": {
      "version": "3.2.6",
      "resolved": "https://registry.npmjs.org/async/-/async-3.2.6.tgz",
      "integrity": "sha512-htCUDlxyyCLMgaM3xXg0C0LW2xqfuQ6p05pCEIsXuyQ+a1koYKTuBMzRNwmybfLgvJDMd0r1LTn4+E0Ti6C2AA==",
      "license": "MIT"
    },
    "node_modules/b4a": {
      "version": "1.9.0",
      "resolved": "https://registry.npmjs.org/b4a/-/b4a-1.9.0.tgz",
      "integrity": "sha512-dpfcF9fDNR6++cthXR67iyhgqWy9CBouAvIWhIntzBG6cvK/cnIPiZQjBwi/ZqjjBEDGfoNDtmB0kTjroOJ3pQ==",
      "license": "Apache-2.0",
      "peerDependencies": {
        "react-native-b4a": "*"
      },
      "peerDependenciesMeta": {
        "react-native-b4a": {
          "optional": true
        }
      }
    },
    "node_modules/balanced-match": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/balanced-match/-/balanced-match-1.0.2.tgz",
      "integrity": "sha512-3oSeUO0TMV67hN1AmbXsK4yaqU7tjiHlbxRDZOpH0KW9+CeX4bRAaX0Anxt0tx2MrpRpWwQaPwIlISEJhYU5Pw==",
      "license": "MIT"
    },
    "node_modules/bare-events": {
      "version": "2.9.2",
      "resolved": "https://registry.npmjs.org/bare-events/-/bare-events-2.9.2.tgz",
      "integrity": "sha512-AIPKioV7/Y/8KfZ3AAhjPJxLLbY49S64Ym5DakZlUg75qQiTgUq9hEJoEwa4eUezPUlXRy/i5NpsKvo9jgKmoA==",
      "license": "Apache-2.0",
      "peerDependencies": {
        "bare-abort-controller": "*"
      },
      "peerDependenciesMeta": {
        "bare-abort-controller": {
          "optional": true
        }
      }
    },
    "node_modules/bare-fs": {
      "version": "4.8.2",
      "resolved": "https://registry.npmjs.org/bare-fs/-/bare-fs-4.8.2.tgz",
      "integrity": "sha512-+ZI68KHMUvosXfKbg/UOHK0tbCdRnegbvPEdEcZ3Nd6TetieQsJPRXBRXPdLyy8+3VSEbPXtsumTpEtt78xv9w==",
      "license": "Apache-2.0",
      "dependencies": {
        "bare-events": "^2.5.4",
        "bare-path": "^3.0.0",
        "bare-stream": "^2.6.4",
        "bare-url": "^2.2.2",
        "fast-fifo": "^1.3.2"
      },
      "engines": {
        "bare": ">=1.28.0"
      },
      "peerDependencies": {
        "bare-buffer": "*"
      },
      "peerDependenciesMeta": {
        "bare-buffer": {
          "optional": true
        }
      }
    },
    "node_modules/bare-path": {
      "version": "3.1.2",
      "resolved": "https://registry.npmjs.org/bare-path/-/bare-path-3.1.2.tgz",
      "integrity": "sha512-ZyKbsuuqK6Ag0K8pX6V5Txq6XeJRvY+wXucnFGRjiyVYP9YWDpIQugk/b+enRYrEYBJaqLzghRQpXPMR7341Nw==",
      "license": "Apache-2.0"
    },
    "node_modules/bare-stream": {
      "version": "2.13.4",
      "resolved": "https://registry.npmjs.org/bare-stream/-/bare-stream-2.13.4.tgz",
      "integrity": "sha512-PcrQ8lVLbiJscNm1Kez+Yp4Gy4AHGcN1lzwjvf5NybWen7VvEgUfyfnXYJ2zNqWnzOfCb1Abq6lH8ti0syQszA==",
      "license": "Apache-2.0",
      "dependencies": {
        "b4a": "^1.8.1",
        "streamx": "^2.25.0",
        "teex": "^1.0.1"
      },
      "peerDependencies": {
        "bare-abort-controller": "*",
        "bare-buffer": "*",
        "bare-events": "*"
      },
      "peerDependenciesMeta": {
        "bare-abort-controller": {
          "optional": true
        },
        "bare-buffer": {
          "optional": true
        },
        "bare-events": {
          "optional": true
        }
      }
    },
    "node_modules/bare-url": {
      "version": "2.5.4",
      "resolved": "https://registry.npmjs.org/bare-url/-/bare-url-2.5.4.tgz",
      "integrity": "sha512-Gxa7UVWBr0/edU1b+TJhn/AZvMQUj9OGspvYsaTYQrAbZA4BOTZGL3LiZxvD+CeMlDH4juwD84+eTAp/bLYW5g==",
      "license": "Apache-2.0",
      "dependencies": {
        "bare-path": "^3.0.0"
      }
    },
    "node_modules/base64-js": {
      "version": "1.5.1",
      "resolved": "https://registry.npmjs.org/base64-js/-/base64-js-1.5.1.tgz",
      "integrity": "sha512-AKpaYlHn8t4SVbOHCy+b5+KKgvR4vrsD8vbvrbiQJps7fKDTkjkDry6ji0rUJjC0kzbNePLwzxq8iypo41qeWA==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/feross"
        },
        {
          "type": "patreon",
          "url": "https://www.patreon.com/feross"
        },
        {
          "type": "consulting",
          "url": "https://feross.org/support"
        }
      ],
      "license": "MIT"
    },
    "node_modules/baseline-browser-mapping": {
      "version": "2.11.27",
      "resolved": "https://registry.npmjs.org/baseline-browser-mapping/-/baseline-browser-mapping-2.11.27.tgz",
      "integrity": "sha512-ElY12DaROGuan+lMmZ8Cvo/ZUbXPe7Enc/9VU/b1T3Kp4dwytRcNdR8DoSJN5SNJT/CuvcCA0DHDVmMOCePdRQ==",
      "license": "Apache-2.0",
      "bin": {
        "baseline-browser-mapping": "dist/cli.cjs"
      },
      "engines": {
        "node": ">=6.0.0"
      }
    },
    "node_modules/bowser": {
      "version": "2.14.1",
      "resolved": "https://registry.npmjs.org/bowser/-/bowser-2.14.1.tgz",
      "integrity": "sha512-tzPjzCxygAKWFOJP011oxFHs57HzIhOEracIgAePE4pqB3LikALKnSzUyU4MGs9/iCEUuHlAJTjTc5M+u7YEGg==",
      "license": "MIT"
    },
    "node_modules/brace-expansion": {
      "version": "2.1.7",
      "resolved": "https://registry.npmjs.org/brace-expansion/-/brace-expansion-2.1.7.tgz",
      "integrity": "sha512-uZbew1NqdmPDTMJ8ah1y+b+9QEJrfkXFk3RcTQw3X0jW/xRUvFKsg1CfQdSYGdTbXZWExtU3J3ccxtnfw1Fi0g==",
      "license": "MIT",
      "dependencies": {
        "balanced-match": "^1.0.0"
      }
    },
    "node_modules/buffer": {
      "version": "6.0.3",
      "resolved": "https://registry.npmjs.org/buffer/-/buffer-6.0.3.tgz",
      "integrity": "sha512-FTiCpNxtwiZZHEZbcbTIcZjERVICn9yq/pDFkTl95/AxzD1naBctN7YO68riM/gLSDY7sdrMby8hofADYuuqOA==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/feross"
        },
        {
          "type": "patreon",
          "url": "https://www.patreon.com/feross"
        },
        {
          "type": "consulting",
          "url": "https://feross.org/support"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "base64-js": "^1.3.1",
        "ieee754": "^1.2.1"
      }
    },
    "node_modules/buffer-crc32": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/buffer-crc32/-/buffer-crc32-1.0.0.tgz",
      "integrity": "sha512-Db1SbgBS/fg/392AblrMJk97KggmvYhr4pB5ZIMTWtaivCPMWLkmb7m21cJvpvgK+J3nsU2CmmixNBZx4vFj/w==",
      "license": "MIT",
      "engines": {
        "node": ">=8.0.0"
      }
    },
    "node_modules/c12": {
      "version": "3.1.0",
      "resolved": "https://registry.npmjs.org/c12/-/c12-3.1.0.tgz",
      "integrity": "sha512-uWoS8OU1MEIsOv8p/5a82c3H31LsWVR5qiyXVfBNOzfffjUWtPnhAb4BYI2uG2HfGmZmFjCtui5XNWaps+iFuw==",
      "devOptional": true,
      "license": "MIT",
      "dependencies": {
        "chokidar": "^4.0.3",
        "confbox": "^0.2.2",
        "defu": "^6.1.4",
        "dotenv": "^16.6.1",
        "exsolve": "^1.0.7",
        "giget": "^2.0.0",
        "jiti": "^2.4.2",
        "ohash": "^2.0.11",
        "pathe": "^2.0.3",
        "perfect-debounce": "^1.0.0",
        "pkg-types": "^2.2.0",
        "rc9": "^2.1.2"
      },
      "peerDependencies": {
        "magicast": "^0.3.5"
      },
      "peerDependenciesMeta": {
        "magicast": {
          "optional": true
        }
      }
    },
    "node_modules/camelcase": {
      "version": "5.3.1",
      "resolved": "https://registry.npmjs.org/camelcase/-/camelcase-5.3.1.tgz",
      "integrity": "sha512-L28STB170nwWS63UjtlEOE3dldQApaJXZkOI1uMFfzf3rRuPegHaHesyee+YxQ+W6SvRDQV6UrdOdRiR153wJg==",
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/caniuse-lite": {
      "version": "1.0.30001815",
      "resolved": "https://registry.npmjs.org/caniuse-lite/-/caniuse-lite-1.0.30001815.tgz",
      "integrity": "sha512-uDybUEyfgbyJJ93J1vikTylBX31AkdVYeVPeffMQpf8XN7hSfr0oZOn4VFOIMNvtU5+rHvC5Udg2TgtJKHm23Q==",
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/browserslist"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/caniuse-lite"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "CC-BY-4.0"
    },
    "node_modules/chokidar": {
      "version": "4.0.3",
      "resolved": "https://registry.npmjs.org/chokidar/-/chokidar-4.0.3.tgz",
      "integrity": "sha512-Qgzu8kfBvo+cA4962jnP1KkS6Dop5NS6g7R5LFYJr4b8Ub94PPQXUksCw9PvXoeXPRRddRNC5C1JQUR2SMGtnA==",
      "devOptional": true,
      "license": "MIT",
      "dependencies": {
        "readdirp": "^4.0.1"
      },
      "engines": {
        "node": ">= 14.16.0"
      },
      "funding": {
        "url": "https://paulmillr.com/funding/"
      }
    },
    "node_modules/citty": {
      "version": "0.1.6",
      "resolved": "https://registry.npmjs.org/citty/-/citty-0.1.6.tgz",
      "integrity": "sha512-tskPPKEs8D2KPafUypv2gxwJP8h/OaJmC82QQGGDQcHvXX43xF2VDACcJVmZ0EuSxkpO9Kc4MlrA3q0+FG58AQ==",
      "devOptional": true,
      "license": "MIT",
      "dependencies": {
        "consola": "^3.2.3"
      }
    },
    "node_modules/client-only": {
      "version": "0.0.1",
      "resolved": "https://registry.npmjs.org/client-only/-/client-only-0.0.1.tgz",
      "integrity": "sha512-IV3Ou0jSMzZrd3pZ48nLkT9DA7Ag1pnPzaiQhpW7c3RbcqqzvzzVu+L8gfqMp/8IM2MQtSiqaCxrrcfu8I8rMA==",
      "license": "MIT"
    },
    "node_modules/cliui": {
      "version": "6.0.0",
      "resolved": "https://registry.npmjs.org/cliui/-/cliui-6.0.0.tgz",
      "integrity": "sha512-t6wbgtoCXvAzst7QgXxJYqPt0usEfbgQdftEPbLL/cvv6HPE5VgvqCuAIDR0NgU52ds6rFwqrgakNLrHEjCbrQ==",
      "license": "ISC",
      "dependencies": {
        "string-width": "^4.2.0",
        "strip-ansi": "^6.0.0",
        "wrap-ansi": "^6.2.0"
      }
    },
    "node_modules/cliui/node_modules/ansi-regex": {
      "version": "5.0.1",
      "resolved": "https://registry.npmjs.org/ansi-regex/-/ansi-regex-5.0.1.tgz",
      "integrity": "sha512-quJQXlTSUGL2LH9SUXo8VwsY4soanhgo6LNSm84E1LBcE8s3O0wpdiRzyR9z/ZZJMlMWv37qOOb9pdJlMUEKFQ==",
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/cliui/node_modules/ansi-styles": {
      "version": "4.3.0",
      "resolved": "https://registry.npmjs.org/ansi-styles/-/ansi-styles-4.3.0.tgz",
      "integrity": "sha512-zbB9rCJAT1rbjiVDb2hqKFHNYLxgtk8NURxZ3IZwD3F6NtxbXZQCnnSi1Lkx+IDohdPlFp222wVALIheZJQSEg==",
      "license": "MIT",
      "dependencies": {
        "color-convert": "^2.0.1"
      },
      "engines": {
        "node": ">=8"
      },
      "funding": {
        "url": "https://github.com/chalk/ansi-styles?sponsor=1"
      }
    },
    "node_modules/cliui/node_modules/emoji-regex": {
      "version": "8.0.0",
      "resolved": "https://registry.npmjs.org/emoji-regex/-/emoji-regex-8.0.0.tgz",
      "integrity": "sha512-MSjYzcWNOA0ewAHpz0MxpYFvwg6yjy1NG3xteoqz644VCo/RPgnr1/GGt+ic3iJTzQ8Eu3TdM14SawnVUmGE6A==",
      "license": "MIT"
    },
    "node_modules/cliui/node_modules/string-width": {
      "version": "4.2.3",
      "resolved": "https://registry.npmjs.org/string-width/-/string-width-4.2.3.tgz",
      "integrity": "sha512-wKyQRQpjJ0sIp62ErSZdGsjMJWsap5oRNihHhu6G7JVO/9jIB6UyevL+tXuOqrng8j/cxKTWyWUwvSTriiZz/g==",
      "license": "MIT",
      "dependencies": {
        "emoji-regex": "^8.0.0",
        "is-fullwidth-code-point": "^3.0.0",
        "strip-ansi": "^6.0.1"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/cliui/node_modules/strip-ansi": {
      "version": "6.0.1",
      "resolved": "https://registry.npmjs.org/strip-ansi/-/strip-ansi-6.0.1.tgz",
      "integrity": "sha512-Y38VPSHcqkFrCpFnQ9vuSXmquuv5oXOKpGeT6aGrr3o3Gc9AlVa6JBfUSOCnbxGGZF+/0ooI7KrPuUSztUdU5A==",
      "license": "MIT",
      "dependencies": {
        "ansi-regex": "^5.0.1"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/cliui/node_modules/wrap-ansi": {
      "version": "6.2.0",
      "resolved": "https://registry.npmjs.org/wrap-ansi/-/wrap-ansi-6.2.0.tgz",
      "integrity": "sha512-r6lPcBGxZXlIcymEu7InxDMhdW0KDxpLgoFLcguasxCaJ/SOIZwINatK9KY/tf+ZrlywOKU0UDj3ATXUBfxJXA==",
      "license": "MIT",
      "dependencies": {
        "ansi-styles": "^4.0.0",
        "string-width": "^4.1.0",
        "strip-ansi": "^6.0.0"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/color-convert": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/color-convert/-/color-convert-2.0.1.tgz",
      "integrity": "sha512-RRECPsj7iu/xb5oKYcsFHSppFNnsj/52OVTRKb4zP5onXwVF3zVmmToNcOfGC+CRDpfK/U584fMg38ZHCaElKQ==",
      "license": "MIT",
      "dependencies": {
        "color-name": "~1.1.4"
      },
      "engines": {
        "node": ">=7.0.0"
      }
    },
    "node_modules/color-name": {
      "version": "1.1.4",
      "resolved": "https://registry.npmjs.org/color-name/-/color-name-1.1.4.tgz",
      "integrity": "sha512-dOy+3AuW3a2wNbZHIuMZpTcgjGuLU/uBL/ubcZF9OXbDo8ff4O8yVp5Bf0efS8uEoYo5q4Fx7dY9OgQGXgAsQA==",
      "license": "MIT"
    },
    "node_modules/compress-commons": {
      "version": "6.0.2",
      "resolved": "https://registry.npmjs.org/compress-commons/-/compress-commons-6.0.2.tgz",
      "integrity": "sha512-6FqVXeETqWPoGcfzrXb37E50NP0LXT8kAMu5ooZayhWWdgEY4lBEEcbQNXtkuKQsGduxiIcI4gOTsxTmuq/bSg==",
      "license": "MIT",
      "dependencies": {
        "crc-32": "^1.2.0",
        "crc32-stream": "^6.0.0",
        "is-stream": "^2.0.1",
        "normalize-path": "^3.0.0",
        "readable-stream": "^4.0.0"
      },
      "engines": {
        "node": ">= 14"
      }
    },
    "node_modules/confbox": {
      "version": "0.2.4",
      "resolved": "https://registry.npmjs.org/confbox/-/confbox-0.2.4.tgz",
      "integrity": "sha512-ysOGlgTFbN2/Y6Cg3Iye8YKulHw+R2fNXHrgSmXISQdMnomY6eNDprVdW9R5xBguEqI954+S6709UyiO7B+6OQ==",
      "devOptional": true,
      "license": "MIT"
    },
    "node_modules/consola": {
      "version": "3.4.2",
      "resolved": "https://registry.npmjs.org/consola/-/consola-3.4.2.tgz",
      "integrity": "sha512-5IKcdX0nnYavi6G7TtOhwkYzyjfJlatbjMjuLSfE2kYT5pMDOilZ4OvMhi637CcDICTmz3wARPoyhqyX1Y+XvA==",
      "devOptional": true,
      "license": "MIT",
      "engines": {
        "node": "^14.18.0 || >=16.10.0"
      }
    },
    "node_modules/core-util-is": {
      "version": "1.0.3",
      "resolved": "https://registry.npmjs.org/core-util-is/-/core-util-is-1.0.3.tgz",
      "integrity": "sha512-ZQBvi1DcpJ4GDqanjucZ2Hj3wEO5pZDS89BWbkcrvdxksJorwUDDZamX9ldFkp9aw2lmBDLgkObEA4DWNJ9FYQ==",
      "license": "MIT"
    },
    "node_modules/crc-32": {
      "version": "1.2.2",
      "resolved": "https://registry.npmjs.org/crc-32/-/crc-32-1.2.2.tgz",
      "integrity": "sha512-ROmzCKrTnOwybPcJApAA6WBWij23HVfGVNKqqrZpuyZOHqK2CwHSvpGuyt/UNNvaIjEd8X5IFGp4Mh+Ie1IHJQ==",
      "license": "Apache-2.0",
      "bin": {
        "crc32": "bin/crc32.njs"
      },
      "engines": {
        "node": ">=0.8"
      }
    },
    "node_modules/crc32-stream": {
      "version": "6.0.0",
      "resolved": "https://registry.npmjs.org/crc32-stream/-/crc32-stream-6.0.0.tgz",
      "integrity": "sha512-piICUB6ei4IlTv1+653yq5+KoqfBYmj9bw6LqXoOneTMDXk5nM1qt12mFW1caG3LlJXEKW1Bp0WggEmIfQB34g==",
      "license": "MIT",
      "dependencies": {
        "crc-32": "^1.2.0",
        "readable-stream": "^4.0.0"
      },
      "engines": {
        "node": ">= 14"
      }
    },
    "node_modules/cross-spawn": {
      "version": "7.0.6",
      "resolved": "https://registry.npmjs.org/cross-spawn/-/cross-spawn-7.0.6.tgz",
      "integrity": "sha512-uV2QOWP2nWzsy2aMp8aRibhi9dlzF5Hgh5SHaB9OiTGEyDTiJJyx0uy51QXdyWbtAHNua4XJzUKca3OzKUd3vA==",
      "license": "MIT",
      "dependencies": {
        "path-key": "^3.1.0",
        "shebang-command": "^2.0.0",
        "which": "^2.0.1"
      },
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/csstype": {
      "version": "3.2.3",
      "resolved": "https://registry.npmjs.org/csstype/-/csstype-3.2.3.tgz",
      "integrity": "sha512-z1HGKcYy2xA8AGQfwrn0PAy+PB7X/GSj3UVJW9qKyn43xWa+gl5nXmU4qqLMRzWVLFC8KusUX8T/0kCiOYpAIQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/decamelize": {
      "version": "1.2.0",
      "resolved": "https://registry.npmjs.org/decamelize/-/decamelize-1.2.0.tgz",
      "integrity": "sha512-z2S+W9X73hAUUki+N+9Za2lBlun89zigOyGrsax+KUQ6wKW4ZoWpEYBkGhQjwAjjDCkWxhY0VKEhk8wzY7F5cA==",
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/deepmerge-ts": {
      "version": "7.1.5",
      "resolved": "https://registry.npmjs.org/deepmerge-ts/-/deepmerge-ts-7.1.5.tgz",
      "integrity": "sha512-HOJkrhaYsweh+W+e74Yn7YStZOilkoPb6fycpwNLKzSPtruFs48nYis0zy5yJz1+ktUhHxoRDJ27RQAWLIJVJw==",
      "devOptional": true,
      "license": "BSD-3-Clause",
      "engines": {
        "node": ">=16.0.0"
      }
    },
    "node_modules/defu": {
      "version": "6.1.7",
      "resolved": "https://registry.npmjs.org/defu/-/defu-6.1.7.tgz",
      "integrity": "sha512-7z22QmUWiQ/2d0KkdYmANbRUVABpZ9SNYyH5vx6PZ+nE5bcC0l7uFvEfHlyld/HcGBFTL536ClDt3DEcSlEJAQ==",
      "devOptional": true,
      "license": "MIT"
    },
    "node_modules/destr": {
      "version": "2.0.5",
      "resolved": "https://registry.npmjs.org/destr/-/destr-2.0.5.tgz",
      "integrity": "sha512-ugFTXCtDZunbzasqBxrK93Ik/DRYsO6S/fedkWEMKqt04xZ4csmnmwGDBAb07QWNaGMAmnTIemsYZCksjATwsA==",
      "devOptional": true,
      "license": "MIT"
    },
    "node_modules/detect-libc": {
      "version": "2.1.2",
      "resolved": "https://registry.npmjs.org/detect-libc/-/detect-libc-2.1.2.tgz",
      "integrity": "sha512-Btj2BOOO83o3WyH59e8MgXsxEQVcarkUOpEYrubB0urwnN10yQ364rsiByU11nZlqWYZm05i/of7io4mzihBtQ==",
      "license": "Apache-2.0",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/dijkstrajs": {
      "version": "1.0.3",
      "resolved": "https://registry.npmjs.org/dijkstrajs/-/dijkstrajs-1.0.3.tgz",
      "integrity": "sha512-qiSlmBq9+BCdCA/L46dw8Uy93mloxsPSbwnm5yrKn2vMPiy8KyAskTF6zuV/j5BMsmOGZDPs7KjU+mjb670kfA==",
      "license": "MIT"
    },
    "node_modules/dotenv": {
      "version": "16.6.1",
      "resolved": "https://registry.npmjs.org/dotenv/-/dotenv-16.6.1.tgz",
      "integrity": "sha512-uBq4egWHTcTt33a72vpSG0z3HnPuIl6NqYcTrKEg2azoEyl2hpW0zqlxysq2pK9HlDIHyHyakeYaYnSAwd8bow==",
      "devOptional": true,
      "license": "BSD-2-Clause",
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://dotenvx.com"
      }
    },
    "node_modules/eastasianwidth": {
      "version": "0.2.0",
      "resolved": "https://registry.npmjs.org/eastasianwidth/-/eastasianwidth-0.2.0.tgz",
      "integrity": "sha512-I88TYZWc9XiYHRQ4/3c5rjjfgkjhLyW2luGIheGERbNQ6OY7yTybanSpDXZa8y7VUP9YmDcYa+eyq4ca7iLqWA==",
      "license": "MIT"
    },
    "node_modules/effect": {
      "version": "3.18.4",
      "resolved": "https://registry.npmjs.org/effect/-/effect-3.18.4.tgz",
      "integrity": "sha512-b1LXQJLe9D11wfnOKAk3PKxuqYshQ0Heez+y5pnkd3jLj1yx9QhM72zZ9uUrOQyNvrs2GZZd/3maL0ZV18YuDA==",
      "devOptional": true,
      "license": "MIT",
      "dependencies": {
        "@standard-schema/spec": "^1.0.0",
        "fast-check": "^3.23.1"
      }
    },
    "node_modules/emoji-regex": {
      "version": "9.2.2",
      "resolved": "https://registry.npmjs.org/emoji-regex/-/emoji-regex-9.2.2.tgz",
      "integrity": "sha512-L18DaJsXSUk2+42pv8mLs5jJT2hqFkFE4j21wOmgbUqsZ2hL72NsUU785g9RXgo3s0ZNgVl42TiHp3ZtOv/Vyg==",
      "license": "MIT"
    },
    "node_modules/empathic": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/empathic/-/empathic-2.0.0.tgz",
      "integrity": "sha512-i6UzDscO/XfAcNYD75CfICkmfLedpyPDdozrLMmQc5ORaQcdMoc21OnlEylMIqI7U8eniKrPMxxtj8k0vhmJhA==",
      "devOptional": true,
      "license": "MIT",
      "engines": {
        "node": ">=14"
      }
    },
    "node_modules/esbuild": {
      "version": "0.28.2",
      "resolved": "https://registry.npmjs.org/esbuild/-/esbuild-0.28.2.tgz",
      "integrity": "sha512-HKVLS8dvII+xoKW9kmqxbRKrnWEXfJJr/FZhhJmiqIB0e053QNYFqOBouTMO/k5sID4MvCiUCvv8b9M4h32wIA==",
      "dev": true,
      "hasInstallScript": true,
      "license": "MIT",
      "bin": {
        "esbuild": "bin/esbuild"
      },
      "engines": {
        "node": ">=18"
      },
      "optionalDependencies": {
        "@esbuild/aix-ppc64": "0.28.2",
        "@esbuild/android-arm": "0.28.2",
        "@esbuild/android-arm64": "0.28.2",
        "@esbuild/android-x64": "0.28.2",
        "@esbuild/darwin-arm64": "0.28.2",
        "@esbuild/darwin-x64": "0.28.2",
        "@esbuild/freebsd-arm64": "0.28.2",
        "@esbuild/freebsd-x64": "0.28.2",
        "@esbuild/linux-arm": "0.28.2",
        "@esbuild/linux-arm64": "0.28.2",
        "@esbuild/linux-ia32": "0.28.2",
        "@esbuild/linux-loong64": "0.28.2",
        "@esbuild/linux-mips64el": "0.28.2",
        "@esbuild/linux-ppc64": "0.28.2",
        "@esbuild/linux-riscv64": "0.28.2",
        "@esbuild/linux-s390x": "0.28.2",
        "@esbuild/linux-x64": "0.28.2",
        "@esbuild/netbsd-arm64": "0.28.2",
        "@esbuild/netbsd-x64": "0.28.2",
        "@esbuild/openbsd-arm64": "0.28.2",
        "@esbuild/openbsd-x64": "0.28.2",
        "@esbuild/openharmony-arm64": "0.28.2",
        "@esbuild/sunos-x64": "0.28.2",
        "@esbuild/win32-arm64": "0.28.2",
        "@esbuild/win32-ia32": "0.28.2",
        "@esbuild/win32-x64": "0.28.2"
      }
    },
    "node_modules/event-target-shim": {
      "version": "5.0.1",
      "resolved": "https://registry.npmjs.org/event-target-shim/-/event-target-shim-5.0.1.tgz",
      "integrity": "sha512-i/2XbnSz/uxRCU6+NdVJgKWDTM427+MqYbkQzD321DuCQJUqOuJKIA0IM2+W2xtYHdKOmZ4dR6fExsd4SXL+WQ==",
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/events": {
      "version": "3.3.0",
      "resolved": "https://registry.npmjs.org/events/-/events-3.3.0.tgz",
      "integrity": "sha512-mQw+2fkQbALzQ7V0MY0IqdnXNOeTtP4r0lN9z7AAawCXgqea7bDii20AYrIBrFd/Hx0M2Ocz6S111CaFkUcb0Q==",
      "license": "MIT",
      "engines": {
        "node": ">=0.8.x"
      }
    },
    "node_modules/events-universal": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/events-universal/-/events-universal-1.0.1.tgz",
      "integrity": "sha512-LUd5euvbMLpwOF8m6ivPCbhQeSiYVNb8Vs0fQ8QjXo0JTkEHpz8pxdQf0gStltaPpw0Cca8b39KxvK9cfKRiAw==",
      "license": "Apache-2.0",
      "dependencies": {
        "bare-events": "^2.7.0"
      }
    },
    "node_modules/exsolve": {
      "version": "1.1.3",
      "resolved": "https://registry.npmjs.org/exsolve/-/exsolve-1.1.3.tgz",
      "integrity": "sha512-kuzL9zherLQoqDeQaS55AiiIg1kb4KYXaSusTtgZTPlvKP2gGCI82LNmBNh5RjDVUXIcmgx+/Mx7vPwRzBbhJA==",
      "devOptional": true,
      "license": "MIT"
    },
    "node_modules/fast-check": {
      "version": "3.23.2",
      "resolved": "https://registry.npmjs.org/fast-check/-/fast-check-3.23.2.tgz",
      "integrity": "sha512-h5+1OzzfCC3Ef7VbtKdcv7zsstUQwUDlYpUTvjeUsJAssPgLn7QzbboPtL5ro04Mq0rPOsMzl7q5hIbRs2wD1A==",
      "devOptional": true,
      "funding": [
        {
          "type": "individual",
          "url": "https://github.com/sponsors/dubzzz"
        },
        {
          "type": "opencollective",
          "url": "https://opencollective.com/fast-check"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "pure-rand": "^6.1.0"
      },
      "engines": {
        "node": ">=8.0.0"
      }
    },
    "node_modules/fast-fifo": {
      "version": "1.3.2",
      "resolved": "https://registry.npmjs.org/fast-fifo/-/fast-fifo-1.3.2.tgz",
      "integrity": "sha512-/d9sfos4yxzpwkDkuN7k2SqFKtYNmCTzgfEpz82x34IM9/zc8KGxQoXg1liNC/izpRM/MBdt44Nmx41ZWqk+FQ==",
      "license": "MIT"
    },
    "node_modules/find-up": {
      "version": "4.1.0",
      "resolved": "https://registry.npmjs.org/find-up/-/find-up-4.1.0.tgz",
      "integrity": "sha512-PpOwAdQ/YlXQ2vj8a3h8IipDuYRi3wceVQQGYWxNINccq40Anw7BlsEXCMbt1Zt+OLA6Fq9suIpIWD0OsnISlw==",
      "license": "MIT",
      "dependencies": {
        "locate-path": "^5.0.0",
        "path-exists": "^4.0.0"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/foreground-child": {
      "version": "3.3.1",
      "resolved": "https://registry.npmjs.org/foreground-child/-/foreground-child-3.3.1.tgz",
      "integrity": "sha512-gIXjKqtFuWEgzFRJA9WCQeSJLZDjgJUOMCMzxtvFq/37KojM1BFGufqsCy0r4qSQmYLsZYMeyRqzIWOMup03sw==",
      "license": "ISC",
      "dependencies": {
        "cross-spawn": "^7.0.6",
        "signal-exit": "^4.0.1"
      },
      "engines": {
        "node": ">=14"
      },
      "funding": {
        "url": "https://github.com/sponsors/isaacs"
      }
    },
    "node_modules/fsevents": {
      "version": "2.3.3",
      "resolved": "https://registry.npmjs.org/fsevents/-/fsevents-2.3.3.tgz",
      "integrity": "sha512-5xoDfX+fL7faATnagmWPpbFtwh/R77WmMMqqHGS65C3vvB0YHrgF+B1YmZ3441tMj5n63k0212XNoJwzlhffQw==",
      "dev": true,
      "hasInstallScript": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": "^8.16.0 || ^10.6.0 || >=11.0.0"
      }
    },
    "node_modules/get-caller-file": {
      "version": "2.0.5",
      "resolved": "https://registry.npmjs.org/get-caller-file/-/get-caller-file-2.0.5.tgz",
      "integrity": "sha512-DyFP3BM/3YHTQOCUL/w0OZHR0lpKeGrxotcHWcqNEdnltqFwXVfhEBQ94eIo34AfQpo0rGki4cyIiftY06h2Fg==",
      "license": "ISC",
      "engines": {
        "node": "6.* || 8.* || >= 10.*"
      }
    },
    "node_modules/giget": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/giget/-/giget-2.0.0.tgz",
      "integrity": "sha512-L5bGsVkxJbJgdnwyuheIunkGatUF/zssUoxxjACCseZYAVbaqdh9Tsmmlkl8vYan09H7sbvKt4pS8GqKLBrEzA==",
      "devOptional": true,
      "license": "MIT",
      "dependencies": {
        "citty": "^0.1.6",
        "consola": "^3.4.0",
        "defu": "^6.1.4",
        "node-fetch-native": "^1.6.6",
        "nypm": "^0.6.0",
        "pathe": "^2.0.3"
      },
      "bin": {
        "giget": "dist/cli.mjs"
      }
    },
    "node_modules/glob": {
      "version": "10.5.0",
      "resolved": "https://registry.npmjs.org/glob/-/glob-10.5.0.tgz",
      "integrity": "sha512-DfXN8DfhJ7NH3Oe7cFmu3NCu1wKbkReJ8TorzSAFbSKrlNaQSKfIzqYqVY8zlbs2NLBbWpRiU52GX2PbaBVNkg==",
      "deprecated": "Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me",
      "license": "ISC",
      "dependencies": {
        "foreground-child": "^3.1.0",
        "jackspeak": "^3.1.2",
        "minimatch": "^9.0.4",
        "minipass": "^7.1.2",
        "package-json-from-dist": "^1.0.0",
        "path-scurry": "^1.11.1"
      },
      "bin": {
        "glob": "dist/esm/bin.mjs"
      },
      "funding": {
        "url": "https://github.com/sponsors/isaacs"
      }
    },
    "node_modules/graceful-fs": {
      "version": "4.2.11",
      "resolved": "https://registry.npmjs.org/graceful-fs/-/graceful-fs-4.2.11.tgz",
      "integrity": "sha512-RbJ5/jmFcNNCcDV5o9eTnBLJ/HszWV0P73bc+Ff4nS/rJj+YaS6IGyiOL0VoBYX+l1Wrl3k63h/KrH+nhJ0XvQ==",
      "license": "ISC"
    },
    "node_modules/ieee754": {
      "version": "1.2.1",
      "resolved": "https://registry.npmjs.org/ieee754/-/ieee754-1.2.1.tgz",
      "integrity": "sha512-dcyqhDvX1C46lXZcVqCpK+FtMRQVdIMN6/Df5js2zouUsqG7I6sFxitIC+7KYK29KdXOLHdu9zL4sFnoVQnqaA==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/feross"
        },
        {
          "type": "patreon",
          "url": "https://www.patreon.com/feross"
        },
        {
          "type": "consulting",
          "url": "https://feross.org/support"
        }
      ],
      "license": "BSD-3-Clause"
    },
    "node_modules/inherits": {
      "version": "2.0.4",
      "resolved": "https://registry.npmjs.org/inherits/-/inherits-2.0.4.tgz",
      "integrity": "sha512-k/vGaX4/Yla3WzyMCvTQOXYeIHvqOKtnqBduzTHpzpQZzAskKMhZ2K+EnBiSM9zGSoIFeMpXKxa4dYeZIQqewQ==",
      "license": "ISC"
    },
    "node_modules/is-fullwidth-code-point": {
      "version": "3.0.0",
      "resolved": "https://registry.npmjs.org/is-fullwidth-code-point/-/is-fullwidth-code-point-3.0.0.tgz",
      "integrity": "sha512-zymm5+u+sCsSWyD9qNaejV3DFvhCKclKdizYaJUuHA83RLjb7nSuGnddCHGv0hk+KY7BMAlsWeK4Ueg6EV6XQg==",
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/is-stream": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/is-stream/-/is-stream-2.0.1.tgz",
      "integrity": "sha512-hFoiJiTl63nn+kstHGBtewWSKnQLpyb155KHheA1l39uvtO9nWIop1p3udqPcUd/xbF1VLMO4n7OI6p7RbngDg==",
      "license": "MIT",
      "engines": {
        "node": ">=8"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/isarray": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/isarray/-/isarray-1.0.0.tgz",
      "integrity": "sha512-VLghIWNM6ELQzo7zwmcg0NmTVyWKYjvIeM83yjp0wRDTmUnrM678fQbcKBo6n2CJEF0szoG//ytg+TKla89ALQ==",
      "license": "MIT"
    },
    "node_modules/isexe": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/isexe/-/isexe-2.0.0.tgz",
      "integrity": "sha512-RHxMLp9lnKHGHRng9QFhRCMbYAcVpn69smSGcq3f36xjgVVWThj4qqLbTLlq7Ssj8B+fIQ1EuCEGI2lKsyQeIw==",
      "license": "ISC"
    },
    "node_modules/jackspeak": {
      "version": "3.4.3",
      "resolved": "https://registry.npmjs.org/jackspeak/-/jackspeak-3.4.3.tgz",
      "integrity": "sha512-OGlZQpz2yfahA/Rd1Y8Cd9SIEsqvXkLVoSw/cgwhnhFMDbsQFeZYoJJ7bIZBS9BcamUW96asq/npPWugM+RQBw==",
      "license": "BlueOak-1.0.0",
      "dependencies": {
        "@isaacs/cliui": "^8.0.2"
      },
      "funding": {
        "url": "https://github.com/sponsors/isaacs"
      },
      "optionalDependencies": {
        "@pkgjs/parseargs": "^0.11.0"
      }
    },
    "node_modules/jiti": {
      "version": "2.7.0",
      "resolved": "https://registry.npmjs.org/jiti/-/jiti-2.7.0.tgz",
      "integrity": "sha512-AC/7JofJvZGrrneWNaEnJeOLUx+JlGt7tNa0wZiRPT4MY1wmfKjt2+6O2p2uz2+skll8OZZmJMNqeke7kKbNgQ==",
      "devOptional": true,
      "license": "MIT",
      "bin": {
        "jiti": "lib/jiti-cli.mjs"
      }
    },
    "node_modules/lazystream": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/lazystream/-/lazystream-1.0.1.tgz",
      "integrity": "sha512-b94GiNHQNy6JNTrt5w6zNyffMrNkXZb3KTkCZJb2V1xaEGCk093vkZ2jk3tpaeP33/OiXC+WvK9AxUebnf5nbw==",
      "license": "MIT",
      "dependencies": {
        "readable-stream": "^2.0.5"
      },
      "engines": {
        "node": ">= 0.6.3"
      }
    },
    "node_modules/lazystream/node_modules/readable-stream": {
      "version": "2.3.8",
      "resolved": "https://registry.npmjs.org/readable-stream/-/readable-stream-2.3.8.tgz",
      "integrity": "sha512-8p0AUk4XODgIewSi0l8Epjs+EVnWiK7NoDIEGU0HhE7+ZyY8D1IMY7odu5lRrFXGg71L15KG8QrPmum45RTtdA==",
      "license": "MIT",
      "dependencies": {
        "core-util-is": "~1.0.0",
        "inherits": "~2.0.3",
        "isarray": "~1.0.0",
        "process-nextick-args": "~2.0.0",
        "safe-buffer": "~5.1.1",
        "string_decoder": "~1.1.1",
        "util-deprecate": "~1.0.1"
      }
    },
    "node_modules/lazystream/node_modules/safe-buffer": {
      "version": "5.1.2",
      "resolved": "https://registry.npmjs.org/safe-buffer/-/safe-buffer-5.1.2.tgz",
      "integrity": "sha512-Gd2UZBJDkXlY7GbJxfsE8/nvKkUEU1G38c1siN6QP6a9PT9MmHB8GnpscSmMJSoF8LOIrt8ud/wPtojys4G6+g==",
      "license": "MIT"
    },
    "node_modules/lazystream/node_modules/string_decoder": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/string_decoder/-/string_decoder-1.1.1.tgz",
      "integrity": "sha512-n/ShnvDi6FHbbVfviro+WojiFzv+s8MPMHBczVePfUpDJLwoLT0ht1l4YwBCbi8pJAveEEdnkHyPyTP/mzRfwg==",
      "license": "MIT",
      "dependencies": {
        "safe-buffer": "~5.1.0"
      }
    },
    "node_modules/locate-path": {
      "version": "5.0.0",
      "resolved": "https://registry.npmjs.org/locate-path/-/locate-path-5.0.0.tgz",
      "integrity": "sha512-t7hw9pI+WvuwNJXwk5zVHpyhIqzg2qTlklJOf0mVxGSbe3Fp2VieZcduNYjaLDoy6p9uGpQEGWG87WpMKlNq8g==",
      "license": "MIT",
      "dependencies": {
        "p-locate": "^4.1.0"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/lodash": {
      "version": "4.18.1",
      "resolved": "https://registry.npmjs.org/lodash/-/lodash-4.18.1.tgz",
      "integrity": "sha512-dMInicTPVE8d1e5otfwmmjlxkZoUpiVLwyeTdUsi/Caj/gfzzblBcCE5sRHV/AsjuCmxWrte2TNGSYuCeCq+0Q==",
      "license": "MIT"
    },
    "node_modules/lru-cache": {
      "version": "10.4.3",
      "resolved": "https://registry.npmjs.org/lru-cache/-/lru-cache-10.4.3.tgz",
      "integrity": "sha512-JNAzZcXrCt42VGLuYz0zfAzDfAvJWW6AfYlDBQyDV5DClI2m5sAmK+OIO7s59XfsRsWHp02jAJrRadPRGTt6SQ==",
      "license": "ISC"
    },
    "node_modules/minimatch": {
      "version": "9.0.9",
      "resolved": "https://registry.npmjs.org/minimatch/-/minimatch-9.0.9.tgz",
      "integrity": "sha512-OBwBN9AL4dqmETlpS2zasx+vTeWclWzkblfZk7KTA5j3jeOONz/tRCnZomUyvNg83wL5Zv9Ss6HMJXAgL8R2Yg==",
      "license": "ISC",
      "dependencies": {
        "brace-expansion": "^2.0.2"
      },
      "engines": {
        "node": ">=16 || 14 >=14.17"
      },
      "funding": {
        "url": "https://github.com/sponsors/isaacs"
      }
    },
    "node_modules/minipass": {
      "version": "7.1.3",
      "resolved": "https://registry.npmjs.org/minipass/-/minipass-7.1.3.tgz",
      "integrity": "sha512-tEBHqDnIoM/1rXME1zgka9g6Q2lcoCkxHLuc7ODJ5BxbP5d4c2Z5cGgtXAku59200Cx7diuHTOYfSBD8n6mm8A==",
      "license": "BlueOak-1.0.0",
      "engines": {
        "node": ">=16 || 14 >=14.17"
      }
    },
    "node_modules/nanoid": {
      "version": "3.3.20",
      "resolved": "https://registry.npmjs.org/nanoid/-/nanoid-3.3.20.tgz",
      "integrity": "sha512-uKdg2G3GNCKQn9byYOpxbGqrT2fGO5KRt5J/8b3pok8rT6qxGWF6hxMyJiEYtAf+FVyYuD9hRaDqX5uPFYJ4ZQ==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "bin": {
        "nanoid": "bin/nanoid.cjs"
      },
      "engines": {
        "node": "^10 || ^12 || ^13.7 || ^14 || >=15.0.1"
      }
    },
    "node_modules/next": {
      "version": "16.4.0",
      "resolved": "https://registry.npmjs.org/next/-/next-16.4.0.tgz",
      "integrity": "sha512-N2C+9q89Z/oLrsepSRS4jRMtwmUZAoZuAHU0e9T6+sAB5DdhADmrnOW+zjYijlrYFmVfmQhGVGy9eMFoB7UgKg==",
      "license": "MIT",
      "dependencies": {
        "@next/env": "16.4.0",
        "@swc/helpers": "0.5.23",
        "baseline-browser-mapping": "^2.9.19",
        "caniuse-lite": "^1.0.30001579",
        "postcss": "8.5.23",
        "styled-jsx": "5.1.6"
      },
      "bin": {
        "next": "dist/bin/next"
      },
      "engines": {
        "node": ">=20.9.0"
      },
      "optionalDependencies": {
        "@next/swc-darwin-arm64": "16.4.0",
        "@next/swc-darwin-x64": "16.4.0",
        "@next/swc-linux-arm64-gnu": "16.4.0",
        "@next/swc-linux-arm64-musl": "16.4.0",
        "@next/swc-linux-x64-gnu": "16.4.0",
        "@next/swc-linux-x64-musl": "16.4.0",
        "@next/swc-win32-arm64-msvc": "16.4.0",
        "@next/swc-win32-x64-msvc": "16.4.0",
        "sharp": "^0.35.4"
      },
      "peerDependencies": {
        "@opentelemetry/api": "^1.1.0",
        "@playwright/test": "^1.51.1",
        "babel-plugin-react-compiler": "*",
        "react": "^18.2.0 || 19.0.0-rc-de68d2f4-20241204 || ^19.0.0",
        "react-dom": "^18.2.0 || 19.0.0-rc-de68d2f4-20241204 || ^19.0.0",
        "sass": "^1.3.0"
      },
      "peerDependenciesMeta": {
        "@opentelemetry/api": {
          "optional": true
        },
        "@playwright/test": {
          "optional": true
        },
        "babel-plugin-react-compiler": {
          "optional": true
        },
        "sass": {
          "optional": true
        }
      }
    },
    "node_modules/next/node_modules/@img/sharp-darwin-arm64": {
      "version": "0.35.5",
      "resolved": "https://registry.npmjs.org/@img/sharp-darwin-arm64/-/sharp-darwin-arm64-0.35.5.tgz",
      "integrity": "sha512-QRUlFQ0WxvdWyqqG/WtI3iupfD5rBzmCHXSdPsY91sAtVtTo7Q4cb6zOccZ3gqEqkr0f1As1ehLqmEpDsRf+lg==",
      "cpu": [
        "arm64"
      ],
      "license": "Apache-2.0",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">=20.9.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      },
      "optionalDependencies": {
        "@img/sharp-libvips-darwin-arm64": "1.3.4"
      }
    },
    "node_modules/next/node_modules/@img/sharp-darwin-x64": {
      "version": "0.35.5",
      "resolved": "https://registry.npmjs.org/@img/sharp-darwin-x64/-/sharp-darwin-x64-0.35.5.tgz",
      "integrity": "sha512-+BR255RhDlpygUpOc/Jdt1nT6DQ3XG/ERo5wbcdOf5Q320dKtPCKPLR1LJs9VGXRaMa8l1uUa0tkCNOXiAxZUw==",
      "cpu": [
        "x64"
      ],
      "license": "Apache-2.0",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">=20.9.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      },
      "optionalDependencies": {
        "@img/sharp-libvips-darwin-x64": "1.3.4"
      }
    },
    "node_modules/next/node_modules/@img/sharp-libvips-darwin-arm64": {
      "version": "1.3.4",
      "resolved": "https://registry.npmjs.org/@img/sharp-libvips-darwin-arm64/-/sharp-libvips-darwin-arm64-1.3.4.tgz",
      "integrity": "sha512-5R89nBYiRdUlSWJxPhO+GVtaXzXSxKnRu/xqMn3KTA3L9EB9Oy/P+Nn2f2vlhPuUdy/Zusb2DarbyTpGCfEDuw==",
      "cpu": [
        "arm64"
      ],
      "license": "LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "darwin"
      ],
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/next/node_modules/@img/sharp-libvips-darwin-x64": {
      "version": "1.3.4",
      "resolved": "https://registry.npmjs.org/@img/sharp-libvips-darwin-x64/-/sharp-libvips-darwin-x64-1.3.4.tgz",
      "integrity": "sha512-iR2OKH80yi0U+dUplyh3/xdpFvps6YkCwsXenIJxqxR1v9o+xtKTGbS9H7cps+2Vxjc8B1j96p75NmTGjIhtpQ==",
      "cpu": [
        "x64"
      ],
      "license": "LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "darwin"
      ],
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/next/node_modules/@img/sharp-libvips-linux-arm": {
      "version": "1.3.4",
      "resolved": "https://registry.npmjs.org/@img/sharp-libvips-linux-arm/-/sharp-libvips-linux-arm-1.3.4.tgz",
      "integrity": "sha512-LmRtTsOHuvM2+wlO2Db37dx5MiZhB0FvSunciw48YjdOkZz9KAiRbm8ujeMOA1INqmei5NapFxYEK1D1ZSidmw==",
      "cpu": [
        "arm"
      ],
      "license": "LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "linux"
      ],
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/next/node_modules/@img/sharp-libvips-linux-arm64": {
      "version": "1.3.4",
      "resolved": "https://registry.npmjs.org/@img/sharp-libvips-linux-arm64/-/sharp-libvips-linux-arm64-1.3.4.tgz",
      "integrity": "sha512-Y3dgX/6lE2QhQb+Gxy0WZxfg9MEm/JBjamZpS2IklP7xIQoKN4hzAm7KcMVGtaVDt3neE9OKBC7vAfonA/Lr1A==",
      "cpu": [
        "arm64"
      ],
      "license": "LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "linux"
      ],
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/next/node_modules/@img/sharp-libvips-linux-ppc64": {
      "version": "1.3.4",
      "resolved": "https://registry.npmjs.org/@img/sharp-libvips-linux-ppc64/-/sharp-libvips-linux-ppc64-1.3.4.tgz",
      "integrity": "sha512-Le6boB8Tai0Nis+gIxIpKx68UDVVIqdR8Tin5Yf1z2LJJQLDJvCDRqRu+jC2qCoD+eIomonmOwB4smBRxfVpYQ==",
      "cpu": [
        "ppc64"
      ],
      "license": "LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "linux"
      ],
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/next/node_modules/@img/sharp-libvips-linux-riscv64": {
      "version": "1.3.4",
      "resolved": "https://registry.npmjs.org/@img/sharp-libvips-linux-riscv64/-/sharp-libvips-linux-riscv64-1.3.4.tgz",
      "integrity": "sha512-aHkkIEHPRdQEegJN20MLmGtxYD9R2wQr3Cwpddnu5+YKMt6Uzax7S9h5gpZTo8wyrGuZSlfQ63OevL5mTyOC7Q==",
      "cpu": [
        "riscv64"
      ],
      "license": "LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "linux"
      ],
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/next/node_modules/@img/sharp-libvips-linux-s390x": {
      "version": "1.3.4",
      "resolved": "https://registry.npmjs.org/@img/sharp-libvips-linux-s390x/-/sharp-libvips-linux-s390x-1.3.4.tgz",
      "integrity": "sha512-ra/mB6MikESDUO7Yg+Mi95bFBb9GsObURuhnOv3OqknjGe9sZrG8tCe9q0xSIGrtLgvgw0gKnFWcK4blSgQOuQ==",
      "cpu": [
        "s390x"
      ],
      "license": "LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "linux"
      ],
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/next/node_modules/@img/sharp-libvips-linux-x64": {
      "version": "1.3.4",
      "resolved": "https://registry.npmjs.org/@img/sharp-libvips-linux-x64/-/sharp-libvips-linux-x64-1.3.4.tgz",
      "integrity": "sha512-GJ//SSXbnwSDes02umB3nDJLFcQzw8a18V8fyhqr6tV515tOEMdImjjxj1AoafMRz56F3PHgftnj1QEKSU1zkw==",
      "cpu": [
        "x64"
      ],
      "license": "LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "linux"
      ],
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/next/node_modules/@img/sharp-libvips-linuxmusl-arm64": {
      "version": "1.3.4",
      "resolved": "https://registry.npmjs.org/@img/sharp-libvips-linuxmusl-arm64/-/sharp-libvips-linuxmusl-arm64-1.3.4.tgz",
      "integrity": "sha512-hvulFwtjUcagsis6BBxHwGFwWoNZjgYmULGVrZcyfNbjA8hKILbRxGg15/7w5HDyXHXUos/j6baAWqnCyQ2DWA==",
      "cpu": [
        "arm64"
      ],
      "license": "LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "linux"
      ],
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/next/node_modules/@img/sharp-libvips-linuxmusl-x64": {
      "version": "1.3.4",
      "resolved": "https://registry.npmjs.org/@img/sharp-libvips-linuxmusl-x64/-/sharp-libvips-linuxmusl-x64-1.3.4.tgz",
      "integrity": "sha512-6zXKeE/p39I1AmA3cJG35eyBGNqNddLnUXjhwBnsGjFPWqf5VKkDBEqaEkPDoTEtkxwi2vv8Tcr2mDyP4So7Fg==",
      "cpu": [
        "x64"
      ],
      "license": "LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "linux"
      ],
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/next/node_modules/@img/sharp-linux-arm": {
      "version": "0.35.5",
      "resolved": "https://registry.npmjs.org/@img/sharp-linux-arm/-/sharp-linux-arm-0.35.5.tgz",
      "integrity": "sha512-LEaXK2WdXVK5ykcw0buWyPMsmLLL2vpHLD6yrNSW+JGEL3BZPA4tpKN6iaMc4AxTTAoaX/sU1rOL51lcIz48ZQ==",
      "cpu": [
        "arm"
      ],
      "license": "Apache-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=20.9.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      },
      "optionalDependencies": {
        "@img/sharp-libvips-linux-arm": "1.3.4"
      }
    },
    "node_modules/next/node_modules/@img/sharp-linux-arm64": {
      "version": "0.35.5",
      "resolved": "https://registry.npmjs.org/@img/sharp-linux-arm64/-/sharp-linux-arm64-0.35.5.tgz",
      "integrity": "sha512-LYVx5JTsOM2CBzmxreh+nl64/3H6Xb09iSLknqH47z2T2DFFxDeFLP5y4dJwe6H7uGQlHPyEEtIqyo3DYsRwdQ==",
      "cpu": [
        "arm64"
      ],
      "license": "Apache-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=20.9.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      },
      "optionalDependencies": {
        "@img/sharp-libvips-linux-arm64": "1.3.4"
      }
    },
    "node_modules/next/node_modules/@img/sharp-linux-ppc64": {
      "version": "0.35.5",
      "resolved": "https://registry.npmjs.org/@img/sharp-linux-ppc64/-/sharp-linux-ppc64-0.35.5.tgz",
      "integrity": "sha512-QVxAAq8evVRI9ia2vqgwrmWucn5Dfv+JdWzj75pD8omHLPSP7f8p20O8jxzjCcuCEQEOtYOZUmX1hkiZ0kdevA==",
      "cpu": [
        "ppc64"
      ],
      "license": "Apache-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=20.9.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      },
      "optionalDependencies": {
        "@img/sharp-libvips-linux-ppc64": "1.3.4"
      }
    },
    "node_modules/next/node_modules/@img/sharp-linux-riscv64": {
      "version": "0.35.5",
      "resolved": "https://registry.npmjs.org/@img/sharp-linux-riscv64/-/sharp-linux-riscv64-0.35.5.tgz",
      "integrity": "sha512-LtdreXguaavKODPIfzJ4kffx7UNt1omwtK0rch4EBbbSTXPnxWmYSayXdLJw0fJzQ97kHt1gL/yh4tvU+nCyRQ==",
      "cpu": [
        "riscv64"
      ],
      "license": "Apache-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=20.9.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      },
      "optionalDependencies": {
        "@img/sharp-libvips-linux-riscv64": "1.3.4"
      }
    },
    "node_modules/next/node_modules/@img/sharp-linux-s390x": {
      "version": "0.35.5",
      "resolved": "https://registry.npmjs.org/@img/sharp-linux-s390x/-/sharp-linux-s390x-0.35.5.tgz",
      "integrity": "sha512-UZasTOFiYzotTsGOCu42BfUzP6Tu6Do/947iRm1RsLKvlllxwGcn4RN27LibGWceix4Y+Pmw3jsnTcCQIgWjqA==",
      "cpu": [
        "s390x"
      ],
      "license": "Apache-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=20.9.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      },
      "optionalDependencies": {
        "@img/sharp-libvips-linux-s390x": "1.3.4"
      }
    },
    "node_modules/next/node_modules/@img/sharp-linux-x64": {
      "version": "0.35.5",
      "resolved": "https://registry.npmjs.org/@img/sharp-linux-x64/-/sharp-linux-x64-0.35.5.tgz",
      "integrity": "sha512-SxFtLTeJInhAA9Q836kux2vZNeOBQEx658qvbboZScr0wIARym3IcGmW7KpVD5sbVg0Ojy+udFQdayYIZyoNog==",
      "cpu": [
        "x64"
      ],
      "license": "Apache-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=20.9.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      },
      "optionalDependencies": {
        "@img/sharp-libvips-linux-x64": "1.3.4"
      }
    },
    "node_modules/next/node_modules/@img/sharp-linuxmusl-arm64": {
      "version": "0.35.5",
      "resolved": "https://registry.npmjs.org/@img/sharp-linuxmusl-arm64/-/sharp-linuxmusl-arm64-0.35.5.tgz",
      "integrity": "sha512-9HbMclmI1zlNkFRs3z9/eBtDjfD0sGlrX1z6b1qwmiFY5ElDLh4BC0LPBdVp7z1DXFiKlIcznf+ZlsuZzLxQqg==",
      "cpu": [
        "arm64"
      ],
      "license": "Apache-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=20.9.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      },
      "optionalDependencies": {
        "@img/sharp-libvips-linuxmusl-arm64": "1.3.4"
      }
    },
    "node_modules/next/node_modules/@img/sharp-linuxmusl-x64": {
      "version": "0.35.5",
      "resolved": "https://registry.npmjs.org/@img/sharp-linuxmusl-x64/-/sharp-linuxmusl-x64-0.35.5.tgz",
      "integrity": "sha512-4KOphqB035HrVdqLZfCgMzzERrQkkzOwRhl4OAkRO1YCldbaFjySXMaK534Mo0V+LndnlJk+sbUyLeU0ULyD1A==",
      "cpu": [
        "x64"
      ],
      "license": "Apache-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=20.9.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      },
      "optionalDependencies": {
        "@img/sharp-libvips-linuxmusl-x64": "1.3.4"
      }
    },
    "node_modules/next/node_modules/@img/sharp-win32-arm64": {
      "version": "0.35.5",
      "resolved": "https://registry.npmjs.org/@img/sharp-win32-arm64/-/sharp-win32-arm64-0.35.5.tgz",
      "integrity": "sha512-X4t7g+7ZA5DKblCBEXGjUqqemj4vczING/5viFwAL8h4N3qYeyjwdCvRLHi4EdOUI+2Z7UFlp1VM+p/AuEtm6Q==",
      "cpu": [
        "arm64"
      ],
      "license": "Apache-2.0 AND LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">=20.9.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/next/node_modules/@img/sharp-win32-ia32": {
      "version": "0.35.5",
      "resolved": "https://registry.npmjs.org/@img/sharp-win32-ia32/-/sharp-win32-ia32-0.35.5.tgz",
      "integrity": "sha512-5Zm82LoBc43nhwNybZlG7Y1KO//Zhsn306fQl29ZOuStHLGTo3BWL83q3cznX0poxSAMuYL1On/BHBxkBeKr6A==",
      "cpu": [
        "ia32"
      ],
      "license": "Apache-2.0 AND LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": "^20.9.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/next/node_modules/@img/sharp-win32-x64": {
      "version": "0.35.5",
      "resolved": "https://registry.npmjs.org/@img/sharp-win32-x64/-/sharp-win32-x64-0.35.5.tgz",
      "integrity": "sha512-x76eH0vEiHlcMQu8Y8IenntaACtddpT6W0wmXtWrnKcnKI7ME5DdgqhAD6SEWOEl1v2zDvkZDhFA9KnURwpfqg==",
      "cpu": [
        "x64"
      ],
      "license": "Apache-2.0 AND LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">=20.9.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/next/node_modules/sharp": {
      "version": "0.35.5",
      "resolved": "https://registry.npmjs.org/sharp/-/sharp-0.35.5.tgz",
      "integrity": "sha512-Ywn4OnzGukp7CDMrp08RQ50YKmuwG47brZgIVPTvBaaAfQlRlygrRqSrxdCiL9M+LlzLBiJ68IR1QqvzHyjC7g==",
      "license": "Apache-2.0",
      "optional": true,
      "dependencies": {
        "@img/colour": "^1.1.0",
        "detect-libc": "^2.1.2",
        "semver": "^7.8.5"
      },
      "engines": {
        "node": ">=20.9.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      },
      "optionalDependencies": {
        "@img/sharp-darwin-arm64": "0.35.5",
        "@img/sharp-darwin-x64": "0.35.5",
        "@img/sharp-freebsd-wasm32": "0.35.5",
        "@img/sharp-libvips-darwin-arm64": "1.3.4",
        "@img/sharp-libvips-darwin-x64": "1.3.4",
        "@img/sharp-libvips-linux-arm": "1.3.4",
        "@img/sharp-libvips-linux-arm64": "1.3.4",
        "@img/sharp-libvips-linux-ppc64": "1.3.4",
        "@img/sharp-libvips-linux-riscv64": "1.3.4",
        "@img/sharp-libvips-linux-s390x": "1.3.4",
        "@img/sharp-libvips-linux-x64": "1.3.4",
        "@img/sharp-libvips-linuxmusl-arm64": "1.3.4",
        "@img/sharp-libvips-linuxmusl-x64": "1.3.4",
        "@img/sharp-linux-arm": "0.35.5",
        "@img/sharp-linux-arm64": "0.35.5",
        "@img/sharp-linux-ppc64": "0.35.5",
        "@img/sharp-linux-riscv64": "0.35.5",
        "@img/sharp-linux-s390x": "0.35.5",
        "@img/sharp-linux-x64": "0.35.5",
        "@img/sharp-linuxmusl-arm64": "0.35.5",
        "@img/sharp-linuxmusl-x64": "0.35.5",
        "@img/sharp-webcontainers-wasm32": "0.35.5",
        "@img/sharp-win32-arm64": "0.35.5",
        "@img/sharp-win32-ia32": "0.35.5",
        "@img/sharp-win32-x64": "0.35.5"
      },
      "peerDependenciesMeta": {
        "@types/node": {
          "optional": true
        }
      }
    },
    "node_modules/node-fetch-native": {
      "version": "1.6.7",
      "resolved": "https://registry.npmjs.org/node-fetch-native/-/node-fetch-native-1.6.7.tgz",
      "integrity": "sha512-g9yhqoedzIUm0nTnTqAQvueMPVOuIY16bqgAJJC8XOOubYFNwz6IER9qs0Gq2Xd0+CecCKFjtdDTMA4u4xG06Q==",
      "devOptional": true,
      "license": "MIT"
    },
    "node_modules/normalize-path": {
      "version": "3.0.0",
      "resolved": "https://registry.npmjs.org/normalize-path/-/normalize-path-3.0.0.tgz",
      "integrity": "sha512-6eZs5Ls3WtCisHWp9S2GUy8dqkpGi4BVSz3GaqiE6ezub0512ESztXUwUB6C6IKbQkY2Pnb/mD4WYojCRwcwLA==",
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/nypm": {
      "version": "0.6.10",
      "resolved": "https://registry.npmjs.org/nypm/-/nypm-0.6.10.tgz",
      "integrity": "sha512-W72Hrj1petq+b3Hk2aAC+9zswetlIFTnDW4s5djseZh2nYqBbyQLOtj472HwcbcWykPBUW1WpWpjOd4nK6gMRw==",
      "devOptional": true,
      "license": "MIT",
      "dependencies": {
        "citty": "^0.2.2",
        "pathe": "^2.0.3",
        "tinyexec": "^1.3.1"
      },
      "bin": {
        "nypm": "dist/cli.mjs"
      },
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/nypm/node_modules/citty": {
      "version": "0.2.2",
      "resolved": "https://registry.npmjs.org/citty/-/citty-0.2.2.tgz",
      "integrity": "sha512-+6vJA3L98yv+IdfKGZHBNiGW5KHn22e/JwID0Strsz8h4S/csAu/OuICwxrg44k5MRiZHWIo8XXuJgQTriRP4w==",
      "devOptional": true,
      "license": "MIT"
    },
    "node_modules/ohash": {
      "version": "2.0.12",
      "resolved": "https://registry.npmjs.org/ohash/-/ohash-2.0.12.tgz",
      "integrity": "sha512-65S/5gk9YSsaRjcyf7Nfa6h/d3E8/1gslpXfI4W7Dxn/oap8IKRuNT5VXkLQ1YFKIEg4apRY4Pj6aiwFzrDdmw==",
      "devOptional": true,
      "license": "MIT"
    },
    "node_modules/p-limit": {
      "version": "2.3.0",
      "resolved": "https://registry.npmjs.org/p-limit/-/p-limit-2.3.0.tgz",
      "integrity": "sha512-//88mFWSJx8lxCzwdAABTJL2MyWB12+eIY7MDL2SqLmAkeKU9qxRvWuSyTjm3FUmpBEMuFfckAIqEaVGUDxb6w==",
      "license": "MIT",
      "dependencies": {
        "p-try": "^2.0.0"
      },
      "engines": {
        "node": ">=6"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/p-locate": {
      "version": "4.1.0",
      "resolved": "https://registry.npmjs.org/p-locate/-/p-locate-4.1.0.tgz",
      "integrity": "sha512-R79ZZ/0wAxKGu3oYMlz8jy/kbhsNrS7SKZ7PxEHBgJ5+F2mtFW2fK2cOtBh1cHYkQsbzFV7I+EoRKe6Yt0oK7A==",
      "license": "MIT",
      "dependencies": {
        "p-limit": "^2.2.0"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/p-try": {
      "version": "2.2.0",
      "resolved": "https://registry.npmjs.org/p-try/-/p-try-2.2.0.tgz",
      "integrity": "sha512-R4nPAVTAU0B9D35/Gk3uJf/7XYbQcyohSKdvAxIRSNghFl4e71hVoGnBNQz9cWaXxO2I10KTC+3jMdvvoKw6dQ==",
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/package-json-from-dist": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/package-json-from-dist/-/package-json-from-dist-1.0.1.tgz",
      "integrity": "sha512-UEZIS3/by4OC8vL3P2dTXRETpebLI2NiI5vIrjaD/5UtrkFX/tNbwjTSRAGC/+7CAo2pIcBaRgWmcBBHcsaCIw==",
      "license": "BlueOak-1.0.0"
    },
    "node_modules/path-exists": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/path-exists/-/path-exists-4.0.0.tgz",
      "integrity": "sha512-ak9Qy5Q7jYb2Wwcey5Fpvg2KoAc/ZIhLSLOSBmRmygPsGwkVVt0fZa0qrtMz+m6tJTAHfZQ8FnmB4MG4LWy7/w==",
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/path-key": {
      "version": "3.1.1",
      "resolved": "https://registry.npmjs.org/path-key/-/path-key-3.1.1.tgz",
      "integrity": "sha512-ojmeN0qd+y0jszEtoY48r0Peq5dwMEkIlCOu6Q5f41lfkswXuKtYrhgoTpLnyIcHm24Uhqx+5Tqm2InSwLhE6Q==",
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/path-scurry": {
      "version": "1.11.1",
      "resolved": "https://registry.npmjs.org/path-scurry/-/path-scurry-1.11.1.tgz",
      "integrity": "sha512-Xa4Nw17FS9ApQFJ9umLiJS4orGjm7ZzwUrwamcGQuHSzDyth9boKDaycYdDcZDuqYATXw4HFXgaqWTctW/v1HA==",
      "license": "BlueOak-1.0.0",
      "dependencies": {
        "lru-cache": "^10.2.0",
        "minipass": "^5.0.0 || ^6.0.2 || ^7.0.0"
      },
      "engines": {
        "node": ">=16 || 14 >=14.18"
      },
      "funding": {
        "url": "https://github.com/sponsors/isaacs"
      }
    },
    "node_modules/pathe": {
      "version": "2.0.3",
      "resolved": "https://registry.npmjs.org/pathe/-/pathe-2.0.3.tgz",
      "integrity": "sha512-WUjGcAqP1gQacoQe+OBJsFA7Ld4DyXuUIjZ5cc75cLHvJ7dtNsTugphxIADwspS+AraAUePCKrSVtPLFj/F88w==",
      "devOptional": true,
      "license": "MIT"
    },
    "node_modules/perfect-debounce": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/perfect-debounce/-/perfect-debounce-1.0.0.tgz",
      "integrity": "sha512-xCy9V055GLEqoFaHoC1SoLIaLmWctgCUaBaWxDZ7/Zx4CTyX7cJQLJOok/orfjZAh9kEYpjJa4d0KcJmCbctZA==",
      "devOptional": true,
      "license": "MIT"
    },
    "node_modules/picocolors": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/picocolors/-/picocolors-1.1.1.tgz",
      "integrity": "sha512-xceH2snhtb5M9liqDsmEw56le376mTZkEX/jEb/RxNFyegNul7eNslCXP9FDj/Lcu0X8KEyMceP2ntpaHrDEVA==",
      "license": "ISC"
    },
    "node_modules/pkg-types": {
      "version": "2.3.3",
      "resolved": "https://registry.npmjs.org/pkg-types/-/pkg-types-2.3.3.tgz",
      "integrity": "sha512-j/lCFdcppV0JxWpCEITdbDltBxPP6cHT+yNJ6Go2OgoSA9518X847X9z0p6LtA4Nc16+eQzCZjRrWanTGvHJ5w==",
      "devOptional": true,
      "license": "MIT",
      "dependencies": {
        "confbox": "^0.3.1",
        "exsolve": "^1.1.1",
        "pathe": "^2.0.3"
      }
    },
    "node_modules/pkg-types/node_modules/confbox": {
      "version": "0.3.1",
      "resolved": "https://registry.npmjs.org/confbox/-/confbox-0.3.1.tgz",
      "integrity": "sha512-cKUSoKa8YxFZZSmraVi7onONx3amu77ngK3kGpsYHDH7drPwCRkQE1RYMPlLRrMtnciRj274XNRxcHxnKmDSnA==",
      "devOptional": true,
      "license": "MIT"
    },
    "node_modules/playwright": {
      "version": "1.56.1",
      "resolved": "https://registry.npmjs.org/playwright/-/playwright-1.56.1.tgz",
      "integrity": "sha512-aFi5B0WovBHTEvpM3DzXTUaeN6eN0qWnTkKx4NQaH4Wvcmc153PdaY2UBdSYKaGYw+UyWXSVyxDUg5DoPEttjw==",
      "devOptional": true,
      "license": "Apache-2.0",
      "dependencies": {
        "playwright-core": "1.56.1"
      },
      "bin": {
        "playwright": "cli.js"
      },
      "engines": {
        "node": ">=18"
      },
      "optionalDependencies": {
        "fsevents": "2.3.2"
      }
    },
    "node_modules/playwright-core": {
      "version": "1.56.1",
      "resolved": "https://registry.npmjs.org/playwright-core/-/playwright-core-1.56.1.tgz",
      "integrity": "sha512-hutraynyn31F+Bifme+Ps9Vq59hKuUCz7H1kDOcBs+2oGguKkWTU50bBWrtz34OUWmIwpBTWDxaRPXrIXkgvmQ==",
      "devOptional": true,
      "license": "Apache-2.0",
      "bin": {
        "playwright-core": "cli.js"
      },
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/playwright/node_modules/fsevents": {
      "version": "2.3.2",
      "resolved": "https://registry.npmjs.org/fsevents/-/fsevents-2.3.2.tgz",
      "integrity": "sha512-xiqMQR4xAeHTuB9uWm+fFRcIOgKBMiOBP+eXiyT7jsgVCq1bkVygt00oASowB7EdtpOHaaPgKt812P9ab+DDKA==",
      "hasInstallScript": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": "^8.16.0 || ^10.6.0 || >=11.0.0"
      }
    },
    "node_modules/pngjs": {
      "version": "5.0.0",
      "resolved": "https://registry.npmjs.org/pngjs/-/pngjs-5.0.0.tgz",
      "integrity": "sha512-40QW5YalBNfQo5yRYmiw7Yz6TKKVr3h6970B2YE+3fQpsWcrbj1PzJgxeJ19DRQjhMbKPIuMY8rFaXc8moolVw==",
      "license": "MIT",
      "engines": {
        "node": ">=10.13.0"
      }
    },
    "node_modules/postcss": {
      "version": "8.5.23",
      "resolved": "https://registry.npmjs.org/postcss/-/postcss-8.5.23.tgz",
      "integrity": "sha512-g50586zr4bZmwFiTlflMu8E0bDTb5I5gertgwAKmsdUlTQIhZtunzUlD1WSzwcVWPoAVpsrA6vlfCD7oXvRwgg==",
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/postcss/"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/postcss"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "nanoid": "^3.3.16",
        "picocolors": "^1.1.1",
        "source-map-js": "^1.2.1"
      },
      "engines": {
        "node": "^10 || ^12 || >=14"
      }
    },
    "node_modules/prisma": {
      "version": "6.19.0",
      "resolved": "https://registry.npmjs.org/prisma/-/prisma-6.19.0.tgz",
      "integrity": "sha512-F3eX7K+tWpkbhl3l4+VkFtrwJlLXbAM+f9jolgoUZbFcm1DgHZ4cq9AgVEgUym2au5Ad/TDLN8lg83D+M10ycw==",
      "devOptional": true,
      "hasInstallScript": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@prisma/config": "6.19.0",
        "@prisma/engines": "6.19.0"
      },
      "bin": {
        "prisma": "build/index.js"
      },
      "engines": {
        "node": ">=18.18"
      },
      "peerDependencies": {
        "typescript": ">=5.1.0"
      },
      "peerDependenciesMeta": {
        "typescript": {
          "optional": true
        }
      }
    },
    "node_modules/process": {
      "version": "0.11.10",
      "resolved": "https://registry.npmjs.org/process/-/process-0.11.10.tgz",
      "integrity": "sha512-cdGef/drWFoydD1JsMzuFf8100nZl+GT+yacc2bEced5f9Rjk4z+WtFUTBu9PhOi9j/jfmBPu0mMEY4wIdAF8A==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.6.0"
      }
    },
    "node_modules/process-nextick-args": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/process-nextick-args/-/process-nextick-args-2.0.1.tgz",
      "integrity": "sha512-3ouUOpQhtgrbOa17J7+uxOTpITYWaGP7/AhoR3+A+/1e9skrzelGi/dXzEYyvbxubEF6Wn2ypscTKiKJFFn1ag==",
      "license": "MIT"
    },
    "node_modules/pure-rand": {
      "version": "6.1.0",
      "resolved": "https://registry.npmjs.org/pure-rand/-/pure-rand-6.1.0.tgz",
      "integrity": "sha512-bVWawvoZoBYpp6yIoQtQXHZjmz35RSVHnUOTefl8Vcjr8snTPY1wnpSPMWekcFwbxI6gtmT7rSYPFvz71ldiOA==",
      "devOptional": true,
      "funding": [
        {
          "type": "individual",
          "url": "https://github.com/sponsors/dubzzz"
        },
        {
          "type": "opencollective",
          "url": "https://opencollective.com/fast-check"
        }
      ],
      "license": "MIT"
    },
    "node_modules/qrcode": {
      "version": "1.5.4",
      "resolved": "https://registry.npmjs.org/qrcode/-/qrcode-1.5.4.tgz",
      "integrity": "sha512-1ca71Zgiu6ORjHqFBDpnSMTR2ReToX4l1Au1VFLyVeBTFavzQnv5JxMFr3ukHVKpSrSA2MCk0lNJSykjUfz7Zg==",
      "license": "MIT",
      "dependencies": {
        "dijkstrajs": "^1.0.1",
        "pngjs": "^5.0.0",
        "yargs": "^15.3.1"
      },
      "bin": {
        "qrcode": "bin/qrcode"
      },
      "engines": {
        "node": ">=10.13.0"
      }
    },
    "node_modules/rc9": {
      "version": "2.1.2",
      "resolved": "https://registry.npmjs.org/rc9/-/rc9-2.1.2.tgz",
      "integrity": "sha512-btXCnMmRIBINM2LDZoEmOogIZU7Qe7zn4BpomSKZ/ykbLObuBdvG+mFq11DL6fjH1DRwHhrlgtYWG96bJiC7Cg==",
      "devOptional": true,
      "license": "MIT",
      "dependencies": {
        "defu": "^6.1.4",
        "destr": "^2.0.3"
      }
    },
    "node_modules/react": {
      "version": "19.3.0",
      "resolved": "https://registry.npmjs.org/react/-/react-19.3.0.tgz",
      "integrity": "sha512-E8LUcbtBWt20bbl2YoHfx4ZDBdxVTfOKtCZn9cDSJ4l6/nuoApcpIBcj47t2wZoVX8g2ZHuMHbiShgCR1T5Sog==",
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/react-dom": {
      "version": "19.3.0",
      "resolved": "https://registry.npmjs.org/react-dom/-/react-dom-19.3.0.tgz",
      "integrity": "sha512-JDk8dgif51OjFoDE70+OT9ICyYr+69HlmihNwp1+Nsfbna3t5sIiCa9ZJktDmQ4/1b/rn26hIAR2uYXDMr5r0Q==",
      "license": "MIT",
      "dependencies": {
        "scheduler": "^0.28.0"
      },
      "peerDependencies": {
        "react": "^19.3.0"
      }
    },
    "node_modules/readable-stream": {
      "version": "4.7.0",
      "resolved": "https://registry.npmjs.org/readable-stream/-/readable-stream-4.7.0.tgz",
      "integrity": "sha512-oIGGmcpTLwPga8Bn6/Z75SVaH1z5dUut2ibSyAMVhmUggWpmDn2dapB0n7f8nwaSiRtepAsfJyfXIO5DCVAODg==",
      "license": "MIT",
      "dependencies": {
        "abort-controller": "^3.0.0",
        "buffer": "^6.0.3",
        "events": "^3.3.0",
        "process": "^0.11.10",
        "string_decoder": "^1.3.0"
      },
      "engines": {
        "node": "^12.22.0 || ^14.17.0 || >=16.0.0"
      }
    },
    "node_modules/readdir-glob": {
      "version": "1.1.3",
      "resolved": "https://registry.npmjs.org/readdir-glob/-/readdir-glob-1.1.3.tgz",
      "integrity": "sha512-v05I2k7xN8zXvPD9N+z/uhXPaj0sUFCe2rcWZIpBsqxfP7xXFQ0tipAd/wjj1YxWyWtUS5IDJpOG82JKt2EAVA==",
      "license": "Apache-2.0",
      "dependencies": {
        "minimatch": "^5.1.0"
      }
    },
    "node_modules/readdir-glob/node_modules/minimatch": {
      "version": "5.1.9",
      "resolved": "https://registry.npmjs.org/minimatch/-/minimatch-5.1.9.tgz",
      "integrity": "sha512-7o1wEA2RyMP7Iu7GNba9vc0RWWGACJOCZBJX2GJWip0ikV+wcOsgVuY9uE8CPiyQhkGFSlhuSkZPavN7u1c2Fw==",
      "license": "ISC",
      "dependencies": {
        "brace-expansion": "^2.0.1"
      },
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/readdirp": {
      "version": "4.1.2",
      "resolved": "https://registry.npmjs.org/readdirp/-/readdirp-4.1.2.tgz",
      "integrity": "sha512-GDhwkLfywWL2s6vEjyhri+eXmfH6j1L7JE27WhqLeYzoh/A3DBaYGEj2H/HFZCn/kMfim73FXxEJTw06WtxQwg==",
      "devOptional": true,
      "license": "MIT",
      "engines": {
        "node": ">= 14.18.0"
      },
      "funding": {
        "type": "individual",
        "url": "https://paulmillr.com/funding/"
      }
    },
    "node_modules/require-directory": {
      "version": "2.1.1",
      "resolved": "https://registry.npmjs.org/require-directory/-/require-directory-2.1.1.tgz",
      "integrity": "sha512-fGxEI7+wsG9xrvdjsrlmL22OMTTiHRwAMroiEeMgq8gzoLC/PQr7RsRDSTLUg/bZAZtF+TVIkHc6/4RIKrui+Q==",
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/require-main-filename": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/require-main-filename/-/require-main-filename-2.0.0.tgz",
      "integrity": "sha512-NKN5kMDylKuldxYLSUfrbo5Tuzh4hd+2E8NPPX02mZtn1VuREQToYe/ZdlJy+J3uCpfaiGF05e7B8W0iXbQHmg==",
      "license": "ISC"
    },
    "node_modules/safe-buffer": {
      "version": "5.2.1",
      "resolved": "https://registry.npmjs.org/safe-buffer/-/safe-buffer-5.2.1.tgz",
      "integrity": "sha512-rp3So07KcdmmKbGvgaNxQSJr7bGVSVk5S9Eq1F+ppbRo70+YeaDxkw5Dd8NPN+GD6bjnYm2VuPuCXmpuYvmCXQ==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/feross"
        },
        {
          "type": "patreon",
          "url": "https://www.patreon.com/feross"
        },
        {
          "type": "consulting",
          "url": "https://feross.org/support"
        }
      ],
      "license": "MIT"
    },
    "node_modules/scheduler": {
      "version": "0.28.0",
      "resolved": "https://registry.npmjs.org/scheduler/-/scheduler-0.28.0.tgz",
      "integrity": "sha512-juorfCmIkIw8tT+p5BXSm6PJjQF/ycEYmKyzURCIt/RaZIhL+PulbQ9Yu2z1HdOJDdqDTlxA1+xKBmHXJsczAw==",
      "license": "MIT"
    },
    "node_modules/semver": {
      "version": "7.8.5",
      "resolved": "https://registry.npmjs.org/semver/-/semver-7.8.5.tgz",
      "integrity": "sha512-Y7/KDsb8LjooZpwaqGyulO6DQlksgCncchHGk+sZIY4SBvUocMBEFH5Ur1fI4dV+Jvl0w6cjvucaIi40puRioA==",
      "license": "ISC",
      "bin": {
        "semver": "bin/semver.js"
      },
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/set-blocking": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/set-blocking/-/set-blocking-2.0.0.tgz",
      "integrity": "sha512-KiKBS8AnWGEyLzofFfmvKwpdPzqiy16LvQfK3yv/fVH7Bj13/wl3JSR1J+rfgRE9q7xUJK4qvgS8raSOeLUehw==",
      "license": "ISC"
    },
    "node_modules/sharp": {
      "version": "0.34.5",
      "resolved": "https://registry.npmjs.org/sharp/-/sharp-0.34.5.tgz",
      "integrity": "sha512-Ou9I5Ft9WNcCbXrU9cMgPBcCK8LiwLqcbywW3t4oDV37n1pzpuNLsYiAV8eODnjbtQlSDwZ2cUEeQz4E54Hltg==",
      "hasInstallScript": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@img/colour": "^1.0.0",
        "detect-libc": "^2.1.2",
        "semver": "^7.7.3"
      },
      "engines": {
        "node": "^18.17.0 || ^20.3.0 || >=21.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      },
      "optionalDependencies": {
        "@img/sharp-darwin-arm64": "0.34.5",
        "@img/sharp-darwin-x64": "0.34.5",
        "@img/sharp-libvips-darwin-arm64": "1.2.4",
        "@img/sharp-libvips-darwin-x64": "1.2.4",
        "@img/sharp-libvips-linux-arm": "1.2.4",
        "@img/sharp-libvips-linux-arm64": "1.2.4",
        "@img/sharp-libvips-linux-ppc64": "1.2.4",
        "@img/sharp-libvips-linux-riscv64": "1.2.4",
        "@img/sharp-libvips-linux-s390x": "1.2.4",
        "@img/sharp-libvips-linux-x64": "1.2.4",
        "@img/sharp-libvips-linuxmusl-arm64": "1.2.4",
        "@img/sharp-libvips-linuxmusl-x64": "1.2.4",
        "@img/sharp-linux-arm": "0.34.5",
        "@img/sharp-linux-arm64": "0.34.5",
        "@img/sharp-linux-ppc64": "0.34.5",
        "@img/sharp-linux-riscv64": "0.34.5",
        "@img/sharp-linux-s390x": "0.34.5",
        "@img/sharp-linux-x64": "0.34.5",
        "@img/sharp-linuxmusl-arm64": "0.34.5",
        "@img/sharp-linuxmusl-x64": "0.34.5",
        "@img/sharp-wasm32": "0.34.5",
        "@img/sharp-win32-arm64": "0.34.5",
        "@img/sharp-win32-ia32": "0.34.5",
        "@img/sharp-win32-x64": "0.34.5"
      }
    },
    "node_modules/shebang-command": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/shebang-command/-/shebang-command-2.0.0.tgz",
      "integrity": "sha512-kHxr2zZpYtdmrN1qDjrrX/Z1rR1kG8Dx+gkpK1G4eXmvXswmcE1hTWBWYUzlraYw1/yZp6YuDY77YtvbN0dmDA==",
      "license": "MIT",
      "dependencies": {
        "shebang-regex": "^3.0.0"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/shebang-regex": {
      "version": "3.0.0",
      "resolved": "https://registry.npmjs.org/shebang-regex/-/shebang-regex-3.0.0.tgz",
      "integrity": "sha512-7++dFhtcx3353uBaq8DDR4NuxBetBzC7ZQOhmTQInHEd6bSrXdiEyzCvG07Z44UYdLShWUyXt5M/yhz8ekcb1A==",
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/signal-exit": {
      "version": "4.1.0",
      "resolved": "https://registry.npmjs.org/signal-exit/-/signal-exit-4.1.0.tgz",
      "integrity": "sha512-bzyZ1e88w9O1iNJbKnOlvYTrWPDl46O1bG0D3XInv+9tkPrxrN8jUUTiFlDkkmKWgn1M6CfIA13SuGqOa9Korw==",
      "license": "ISC",
      "engines": {
        "node": ">=14"
      },
      "funding": {
        "url": "https://github.com/sponsors/isaacs"
      }
    },
    "node_modules/source-map-js": {
      "version": "1.2.2",
      "resolved": "https://registry.npmjs.org/source-map-js/-/source-map-js-1.2.2.tgz",
      "integrity": "sha512-KGj/8Y43x35aZVDtt+J4mK1hoLGHULMYfSkODJNQjNDC3oW1PqPoxMwo0pLUsWM/UEGzON/NxeHywEfNXNP3Vw==",
      "license": "BSD-3-Clause",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/streamx": {
      "version": "2.28.1",
      "resolved": "https://registry.npmjs.org/streamx/-/streamx-2.28.1.tgz",
      "integrity": "sha512-zEzXb0s5Cds7tqMH6rhZ05lcJydCWiQPEwiNngVqzsxCc962vLY4Uw+mW7od8kDH258k2Uz/JrOkdIAAhSh9VA==",
      "license": "MIT",
      "dependencies": {
        "events-universal": "^1.0.0",
        "fast-fifo": "^1.3.2",
        "text-decoder": "^1.1.0"
      }
    },
    "node_modules/string_decoder": {
      "version": "1.3.0",
      "resolved": "https://registry.npmjs.org/string_decoder/-/string_decoder-1.3.0.tgz",
      "integrity": "sha512-hkRX8U1WjJFd8LsDJ2yQ/wWWxaopEsABU1XfkM8A+j0+85JAGppt16cr1Whg6KIbb4okU6Mql6BOj+uup/wKeA==",
      "license": "MIT",
      "dependencies": {
        "safe-buffer": "~5.2.0"
      }
    },
    "node_modules/string-width": {
      "version": "5.1.2",
      "resolved": "https://registry.npmjs.org/string-width/-/string-width-5.1.2.tgz",
      "integrity": "sha512-HnLOCR3vjcY8beoNLtcjZ5/nxn2afmME6lhrDrebokqMap+XbeW8n9TXpPDOqdGK5qcI3oT0GKTW6wC7EMiVqA==",
      "license": "MIT",
      "dependencies": {
        "eastasianwidth": "^0.2.0",
        "emoji-regex": "^9.2.2",
        "strip-ansi": "^7.0.1"
      },
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/string-width-cjs": {
      "name": "string-width",
      "version": "4.2.3",
      "resolved": "https://registry.npmjs.org/string-width/-/string-width-4.2.3.tgz",
      "integrity": "sha512-wKyQRQpjJ0sIp62ErSZdGsjMJWsap5oRNihHhu6G7JVO/9jIB6UyevL+tXuOqrng8j/cxKTWyWUwvSTriiZz/g==",
      "license": "MIT",
      "dependencies": {
        "emoji-regex": "^8.0.0",
        "is-fullwidth-code-point": "^3.0.0",
        "strip-ansi": "^6.0.1"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/string-width-cjs/node_modules/ansi-regex": {
      "version": "5.0.1",
      "resolved": "https://registry.npmjs.org/ansi-regex/-/ansi-regex-5.0.1.tgz",
      "integrity": "sha512-quJQXlTSUGL2LH9SUXo8VwsY4soanhgo6LNSm84E1LBcE8s3O0wpdiRzyR9z/ZZJMlMWv37qOOb9pdJlMUEKFQ==",
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/string-width-cjs/node_modules/emoji-regex": {
      "version": "8.0.0",
      "resolved": "https://registry.npmjs.org/emoji-regex/-/emoji-regex-8.0.0.tgz",
      "integrity": "sha512-MSjYzcWNOA0ewAHpz0MxpYFvwg6yjy1NG3xteoqz644VCo/RPgnr1/GGt+ic3iJTzQ8Eu3TdM14SawnVUmGE6A==",
      "license": "MIT"
    },
    "node_modules/string-width-cjs/node_modules/strip-ansi": {
      "version": "6.0.1",
      "resolved": "https://registry.npmjs.org/strip-ansi/-/strip-ansi-6.0.1.tgz",
      "integrity": "sha512-Y38VPSHcqkFrCpFnQ9vuSXmquuv5oXOKpGeT6aGrr3o3Gc9AlVa6JBfUSOCnbxGGZF+/0ooI7KrPuUSztUdU5A==",
      "license": "MIT",
      "dependencies": {
        "ansi-regex": "^5.0.1"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/strip-ansi": {
      "version": "7.2.0",
      "resolved": "https://registry.npmjs.org/strip-ansi/-/strip-ansi-7.2.0.tgz",
      "integrity": "sha512-yDPMNjp4WyfYBkHnjIRLfca1i6KMyGCtsVgoKe/z1+6vukgaENdgGBZt+ZmKPc4gavvEZ5OgHfHdrazhgNyG7w==",
      "license": "MIT",
      "dependencies": {
        "ansi-regex": "^6.2.2"
      },
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/chalk/strip-ansi?sponsor=1"
      }
    },
    "node_modules/strip-ansi-cjs": {
      "name": "strip-ansi",
      "version": "6.0.1",
      "resolved": "https://registry.npmjs.org/strip-ansi/-/strip-ansi-6.0.1.tgz",
      "integrity": "sha512-Y38VPSHcqkFrCpFnQ9vuSXmquuv5oXOKpGeT6aGrr3o3Gc9AlVa6JBfUSOCnbxGGZF+/0ooI7KrPuUSztUdU5A==",
      "license": "MIT",
      "dependencies": {
        "ansi-regex": "^5.0.1"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/strip-ansi-cjs/node_modules/ansi-regex": {
      "version": "5.0.1",
      "resolved": "https://registry.npmjs.org/ansi-regex/-/ansi-regex-5.0.1.tgz",
      "integrity": "sha512-quJQXlTSUGL2LH9SUXo8VwsY4soanhgo6LNSm84E1LBcE8s3O0wpdiRzyR9z/ZZJMlMWv37qOOb9pdJlMUEKFQ==",
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/styled-jsx": {
      "version": "5.1.6",
      "resolved": "https://registry.npmjs.org/styled-jsx/-/styled-jsx-5.1.6.tgz",
      "integrity": "sha512-qSVyDTeMotdvQYoHWLNGwRFJHC+i+ZvdBRYosOFgC+Wg1vx4frN2/RG/NA7SYqqvKNLf39P2LSRA2pu6n0XYZA==",
      "license": "MIT",
      "dependencies": {
        "client-only": "0.0.1"
      },
      "engines": {
        "node": ">= 12.0.0"
      },
      "peerDependencies": {
        "react": ">= 16.8.0 || 17.x.x || ^18.0.0-0 || ^19.0.0-0"
      },
      "peerDependenciesMeta": {
        "@babel/core": {
          "optional": true
        },
        "babel-plugin-macros": {
          "optional": true
        }
      }
    },
    "node_modules/tar-stream": {
      "version": "3.2.2",
      "resolved": "https://registry.npmjs.org/tar-stream/-/tar-stream-3.2.2.tgz",
      "integrity": "sha512-+8NeqHRjQWH9nYlwo2gamAMImZCVzI4UoEgDpWorBt9OEfppiZn+uSkskzQKPWIZyji/C8fpWO7u69G0DX0tbg==",
      "license": "MIT",
      "dependencies": {
        "b4a": "^1.9.0",
        "bare-fs": "^4.8.2",
        "fast-fifo": "^1.3.2",
        "streamx": "^2.28.1"
      }
    },
    "node_modules/teex": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/teex/-/teex-1.0.1.tgz",
      "integrity": "sha512-eYE6iEI62Ni1H8oIa7KlDU6uQBtqr4Eajni3wX7rpfXD8ysFx8z0+dri+KWEPWpBsxXfxu58x/0jvTVT1ekOSg==",
      "license": "MIT",
      "dependencies": {
        "streamx": "^2.12.5"
      }
    },
    "node_modules/text-decoder": {
      "version": "1.2.7",
      "resolved": "https://registry.npmjs.org/text-decoder/-/text-decoder-1.2.7.tgz",
      "integrity": "sha512-vlLytXkeP4xvEq2otHeJfSQIRyWxo/oZGEbXrtEEF9Hnmrdly59sUbzZ/QgyWuLYHctCHxFF4tRQZNQ9k60ExQ==",
      "license": "Apache-2.0",
      "dependencies": {
        "b4a": "^1.6.4"
      }
    },
    "node_modules/tinyexec": {
      "version": "1.3.1",
      "resolved": "https://registry.npmjs.org/tinyexec/-/tinyexec-1.3.1.tgz",
      "integrity": "sha512-GCvB3aoys96IuDFBMcTB46JOR6mdMtAToqwiW8JlWhsoh1mhHi/xn9ss/Dg7N555GiJyEt2qzoG/NHCwM6h1EA==",
      "devOptional": true,
      "license": "MIT",
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/tslib": {
      "version": "2.8.1",
      "resolved": "https://registry.npmjs.org/tslib/-/tslib-2.8.1.tgz",
      "integrity": "sha512-oJFu94HQb+KVduSUQL7wnpmqnfmLsOA/nAh6b6EH0wCEoK0/mPeXU6c3wKDV83MkOuHPRHtSXKKU99IBazS/2w==",
      "license": "0BSD"
    },
    "node_modules/tsx": {
      "version": "4.23.15",
      "resolved": "https://registry.npmjs.org/tsx/-/tsx-4.23.15.tgz",
      "integrity": "sha512-Yiex1Ovn8z2xPpOWckIiysV1SSyRMY9BkLF++q0yKiDxCqRhosKfMg3janKkiLBwZ5c/YryloKwGZcrEmtwxKw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "esbuild": "~0.28.0"
      },
      "bin": {
        "tsx": "dist/cli.mjs"
      },
      "engines": {
        "node": ">=18.0.0"
      },
      "optionalDependencies": {
        "fsevents": "~2.3.3"
      }
    },
    "node_modules/typescript": {
      "version": "5.9.3",
      "resolved": "https://registry.npmjs.org/typescript/-/typescript-5.9.3.tgz",
      "integrity": "sha512-jl1vZzPDinLr9eUt3J/t7V6FgNEw9QjvBPdysz9KfQDD41fQrC2Y4vKQdiaUpFT4bXlb1RHhLpp8wtm6M5TgSw==",
      "devOptional": true,
      "license": "Apache-2.0",
      "bin": {
        "tsc": "bin/tsc",
        "tsserver": "bin/tsserver"
      },
      "engines": {
        "node": ">=14.17"
      }
    },
    "node_modules/undici-types": {
      "version": "7.24.6",
      "resolved": "https://registry.npmjs.org/undici-types/-/undici-types-7.24.6.tgz",
      "integrity": "sha512-WRNW+sJgj5OBN4/0JpHFqtqzhpbnV0GuB+OozA9gCL7a993SmU+1JBZCzLNxYsbMfIeDL+lTsphD5jN5N+n0zg==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/util-deprecate": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/util-deprecate/-/util-deprecate-1.0.2.tgz",
      "integrity": "sha512-EPD5q1uXyFxJpCrLnCc1nHnq3gOa6DZBocAIiI2TaSCA7VCJ1UJDMagCzIkXNsUYfD1daK//LTEQ8xiIbrHtcw==",
      "license": "MIT"
    },
    "node_modules/which": {
      "version": "2.0.2",
      "resolved": "https://registry.npmjs.org/which/-/which-2.0.2.tgz",
      "integrity": "sha512-BLI3Tl1TW3Pvl70l3yq3Y64i+awpwXqsGBYWkkqMtnbXgrMD+yj7rhW0kuEDxzJaYXGjEW5ogapKNMEKNMjibA==",
      "license": "ISC",
      "dependencies": {
        "isexe": "^2.0.0"
      },
      "bin": {
        "node-which": "bin/node-which"
      },
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/which-module": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/which-module/-/which-module-2.0.1.tgz",
      "integrity": "sha512-iBdZ57RDvnOR9AGBhML2vFZf7h8vmBjhoaZqODJBFWHVtKkDmKuHai3cx5PgVMrX5YDNp27AofYbAwctSS+vhQ==",
      "license": "ISC"
    },
    "node_modules/wrap-ansi": {
      "version": "8.1.0",
      "resolved": "https://registry.npmjs.org/wrap-ansi/-/wrap-ansi-8.1.0.tgz",
      "integrity": "sha512-si7QWI6zUMq56bESFvagtmzMdGOtoxfR+Sez11Mobfc7tm+VkUckk9bW2UeffTGVUbOksxmSw0AA2gs8g71NCQ==",
      "license": "MIT",
      "dependencies": {
        "ansi-styles": "^6.1.0",
        "string-width": "^5.0.1",
        "strip-ansi": "^7.0.1"
      },
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/chalk/wrap-ansi?sponsor=1"
      }
    },
    "node_modules/wrap-ansi-cjs": {
      "name": "wrap-ansi",
      "version": "7.0.0",
      "resolved": "https://registry.npmjs.org/wrap-ansi/-/wrap-ansi-7.0.0.tgz",
      "integrity": "sha512-YVGIj2kamLSTxw6NsZjoBxfSwsn0ycdesmc4p+Q21c5zPuZ1pl+NfxVdxPtdHvmNVOQ6XSYG4AUtyt/Fi7D16Q==",
      "license": "MIT",
      "dependencies": {
        "ansi-styles": "^4.0.0",
        "string-width": "^4.1.0",
        "strip-ansi": "^6.0.0"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/chalk/wrap-ansi?sponsor=1"
      }
    },
    "node_modules/wrap-ansi-cjs/node_modules/ansi-regex": {
      "version": "5.0.1",
      "resolved": "https://registry.npmjs.org/ansi-regex/-/ansi-regex-5.0.1.tgz",
      "integrity": "sha512-quJQXlTSUGL2LH9SUXo8VwsY4soanhgo6LNSm84E1LBcE8s3O0wpdiRzyR9z/ZZJMlMWv37qOOb9pdJlMUEKFQ==",
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/wrap-ansi-cjs/node_modules/ansi-styles": {
      "version": "4.3.0",
      "resolved": "https://registry.npmjs.org/ansi-styles/-/ansi-styles-4.3.0.tgz",
      "integrity": "sha512-zbB9rCJAT1rbjiVDb2hqKFHNYLxgtk8NURxZ3IZwD3F6NtxbXZQCnnSi1Lkx+IDohdPlFp222wVALIheZJQSEg==",
      "license": "MIT",
      "dependencies": {
        "color-convert": "^2.0.1"
      },
      "engines": {
        "node": ">=8"
      },
      "funding": {
        "url": "https://github.com/chalk/ansi-styles?sponsor=1"
      }
    },
    "node_modules/wrap-ansi-cjs/node_modules/emoji-regex": {
      "version": "8.0.0",
      "resolved": "https://registry.npmjs.org/emoji-regex/-/emoji-regex-8.0.0.tgz",
      "integrity": "sha512-MSjYzcWNOA0ewAHpz0MxpYFvwg6yjy1NG3xteoqz644VCo/RPgnr1/GGt+ic3iJTzQ8Eu3TdM14SawnVUmGE6A==",
      "license": "MIT"
    },
    "node_modules/wrap-ansi-cjs/node_modules/string-width": {
      "version": "4.2.3",
      "resolved": "https://registry.npmjs.org/string-width/-/string-width-4.2.3.tgz",
      "integrity": "sha512-wKyQRQpjJ0sIp62ErSZdGsjMJWsap5oRNihHhu6G7JVO/9jIB6UyevL+tXuOqrng8j/cxKTWyWUwvSTriiZz/g==",
      "license": "MIT",
      "dependencies": {
        "emoji-regex": "^8.0.0",
        "is-fullwidth-code-point": "^3.0.0",
        "strip-ansi": "^6.0.1"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/wrap-ansi-cjs/node_modules/strip-ansi": {
      "version": "6.0.1",
      "resolved": "https://registry.npmjs.org/strip-ansi/-/strip-ansi-6.0.1.tgz",
      "integrity": "sha512-Y38VPSHcqkFrCpFnQ9vuSXmquuv5oXOKpGeT6aGrr3o3Gc9AlVa6JBfUSOCnbxGGZF+/0ooI7KrPuUSztUdU5A==",
      "license": "MIT",
      "dependencies": {
        "ansi-regex": "^5.0.1"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/y18n": {
      "version": "4.0.3",
      "resolved": "https://registry.npmjs.org/y18n/-/y18n-4.0.3.tgz",
      "integrity": "sha512-JKhqTOwSrqNA1NY5lSztJ1GrBiUodLMmIZuLiDaMRJ+itFd+ABVE8XBjOvIWL+rSqNDC74LCSFmlb/U4UZ4hJQ==",
      "license": "ISC"
    },
    "node_modules/yargs": {
      "version": "15.4.1",
      "resolved": "https://registry.npmjs.org/yargs/-/yargs-15.4.1.tgz",
      "integrity": "sha512-aePbxDmcYW++PaqBsJ+HYUFwCdv4LVvdnhBy78E57PIor8/OVvhMrADFFEDh8DHDFRv/O9i3lPhsENjO7QX0+A==",
      "license": "MIT",
      "dependencies": {
        "cliui": "^6.0.0",
        "decamelize": "^1.2.0",
        "find-up": "^4.1.0",
        "get-caller-file": "^2.0.1",
        "require-directory": "^2.1.1",
        "require-main-filename": "^2.0.0",
        "set-blocking": "^2.0.0",
        "string-width": "^4.2.0",
        "which-module": "^2.0.0",
        "y18n": "^4.0.0",
        "yargs-parser": "^18.1.2"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/yargs-parser": {
      "version": "18.1.3",
      "resolved": "https://registry.npmjs.org/yargs-parser/-/yargs-parser-18.1.3.tgz",
      "integrity": "sha512-o50j0JeToy/4K6OZcaQmW6lyXXKhq7csREXcDwk2omFPJEwUNOVtJKvmDr9EI1fAJZUyZcRF7kxGBWmRXudrCQ==",
      "license": "ISC",
      "dependencies": {
        "camelcase": "^5.0.0",
        "decamelize": "^1.2.0"
      },
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/yargs/node_modules/ansi-regex": {
      "version": "5.0.1",
      "resolved": "https://registry.npmjs.org/ansi-regex/-/ansi-regex-5.0.1.tgz",
      "integrity": "sha512-quJQXlTSUGL2LH9SUXo8VwsY4soanhgo6LNSm84E1LBcE8s3O0wpdiRzyR9z/ZZJMlMWv37qOOb9pdJlMUEKFQ==",
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/yargs/node_modules/emoji-regex": {
      "version": "8.0.0",
      "resolved": "https://registry.npmjs.org/emoji-regex/-/emoji-regex-8.0.0.tgz",
      "integrity": "sha512-MSjYzcWNOA0ewAHpz0MxpYFvwg6yjy1NG3xteoqz644VCo/RPgnr1/GGt+ic3iJTzQ8Eu3TdM14SawnVUmGE6A==",
      "license": "MIT"
    },
    "node_modules/yargs/node_modules/string-width": {
      "version": "4.2.3",
      "resolved": "https://registry.npmjs.org/string-width/-/string-width-4.2.3.tgz",
      "integrity": "sha512-wKyQRQpjJ0sIp62ErSZdGsjMJWsap5oRNihHhu6G7JVO/9jIB6UyevL+tXuOqrng8j/cxKTWyWUwvSTriiZz/g==",
      "license": "MIT",
      "dependencies": {
        "emoji-regex": "^8.0.0",
        "is-fullwidth-code-point": "^3.0.0",
        "strip-ansi": "^6.0.1"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/yargs/node_modules/strip-ansi": {
      "version": "6.0.1",
      "resolved": "https://registry.npmjs.org/strip-ansi/-/strip-ansi-6.0.1.tgz",
      "integrity": "sha512-Y38VPSHcqkFrCpFnQ9vuSXmquuv5oXOKpGeT6aGrr3o3Gc9AlVa6JBfUSOCnbxGGZF+/0ooI7KrPuUSztUdU5A==",
      "license": "MIT",
      "dependencies": {
        "ansi-regex": "^5.0.1"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/zip-stream": {
      "version": "6.0.1",
      "resolved": "https://registry.npmjs.org/zip-stream/-/zip-stream-6.0.1.tgz",
      "integrity": "sha512-zK7YHHz4ZXpW89AHXUPbQVGKI7uvkd3hzusTdotCg1UxyaVtg0zFJSTfW/Dq5f7OBBVnq6cZIaC8Ti4hb6dtCA==",
      "license": "MIT",
      "dependencies": {
        "archiver-utils": "^5.0.0",
        "compress-commons": "^6.0.2",
        "readable-stream": "^4.0.0"
      },
      "engines": {
        "node": ">= 14"
      }
    },
    "node_modules/zod": {
      "version": "4.6.5",
      "resolved": "https://registry.npmjs.org/zod/-/zod-4.6.5.tgz",
      "integrity": "sha512-v5l/aFXZQeai4awLbOpSoHecE9UiMrnfx75tEXLjNonXVARxQ5mOeipTjROUchszUNCqnE+hqAMujRsRHsut2Q==",
      "license": "MIT",
      "funding": {
        "url": "https://github.com/sponsors/colinhacks"
      }
    }
  }
}
````

## package.json

````json
{
  "name": "memoryalbum",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && next build && node scripts/prepare-standalone.mjs",
    "start": "node --env-file-if-exists=.env scripts/start.mjs",
    "check": "tsc --noEmit",
    "db:migrate": "prisma migrate deploy",
    "db:dev": "prisma migrate dev",
    "db:seed": "node --env-file=.env --import tsx prisma/seed.ts",
    "admin:create": "node --env-file=.env --import tsx scripts/create-admin.ts",
    "test": "node --env-file-if-exists=.env --import tsx --test tests/*.test.ts",
    "test:e2e": "playwright test",
    "maintenance": "node --env-file=.env --import tsx scripts/maintenance.ts"
  },
  "dependencies": {
    "@aws-sdk/client-s3": "^3.900.0",
    "@aws-sdk/s3-request-presigner": "^3.900.0",
    "@prisma/client": "6.19.0",
    "archiver": "^7.0.1",
    "next": "16.4.0",
    "qrcode": "^1.5.4",
    "react": "19.3.0",
    "react-dom": "19.3.0",
    "sharp": "^0.34.4",
    "zod": "^4.1.12"
  },
  "devDependencies": {
    "@playwright/test": "1.56.1",
    "@types/archiver": "^6.0.3",
    "@types/node": "^24.0.0",
    "@types/qrcode": "^1.5.5",
    "@types/react": "^19.2.0",
    "@types/react-dom": "^19.2.0",
    "prisma": "6.19.0",
    "tsx": "^4.20.6",
    "typescript": "^5.9.3"
  },
  "prisma": {
    "seed": "node --env-file=.env --import tsx prisma/seed.ts"
  }
}
````

## playwright.config.ts

````typescript
import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: process.env.APP_URL || "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chrome-mobile", use: { ...devices["Pixel 7"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "safari-mobile", use: { ...devices["iPhone 13"] } },
  ],
});
````

## prisma/migrations/202610070001_initial/migration.sql

````sql
-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PUBLIC', 'SECRET', 'PASSWORD');

-- CreateEnum
CREATE TYPE "Theme" AS ENUM ('AUTO', 'LIGHT', 'DARK');

-- CreateTable
CREATE TABLE "Album" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL DEFAULT 'Um dia para recordar.',
    "eventDate" TIMESTAMP(3) NOT NULL,
    "visibility" "Visibility" NOT NULL DEFAULT 'SECRET',
    "theme" "Theme" NOT NULL DEFAULT 'AUTO',
    "secretHash" TEXT,
    "passwordHash" TEXT,
    "accessVersion" INTEGER NOT NULL DEFAULT 1,
    "coverPhotoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Album_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "coverPhotoId" TEXT,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "originalKey" TEXT NOT NULL,
    "largeKey" TEXT NOT NULL,
    "thumbnailKeys" JSONB NOT NULL,
    "size" INTEGER NOT NULL,
    "mime" TEXT NOT NULL,
    "extension" TEXT NOT NULL,
    "exif" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateBucket" (
    "key" TEXT NOT NULL,
    "hits" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateBucket_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Visit" (
    "id" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DownloadLog" (
    "id" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "photoId" TEXT,
    "categoryId" TEXT,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DownloadLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZipJob" (
    "id" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "categoryId" TEXT,
    "accessVersion" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "total" INTEGER NOT NULL,
    "completed" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ZipJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Album_slug_key" ON "Album"("slug");

-- CreateIndex
CREATE INDEX "Category_albumId_order_idx" ON "Category"("albumId", "order");

-- CreateIndex
CREATE INDEX "Photo_albumId_categoryId_order_idx" ON "Photo"("albumId", "categoryId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "RateBucket_expiresAt_idx" ON "RateBucket"("expiresAt");

-- CreateIndex
CREATE INDEX "Visit_albumId_createdAt_idx" ON "Visit"("albumId", "createdAt");

-- CreateIndex
CREATE INDEX "DownloadLog_albumId_createdAt_idx" ON "DownloadLog"("albumId", "createdAt");

-- CreateIndex
CREATE INDEX "ZipJob_createdAt_idx" ON "ZipJob"("createdAt");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DownloadLog" ADD CONSTRAINT "DownloadLog_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DownloadLog" ADD CONSTRAINT "DownloadLog_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "Photo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZipJob" ADD CONSTRAINT "ZipJob_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE CASCADE ON UPDATE CASCADE;
````

## prisma/migrations/migration_lock.toml

````toml
provider = "postgresql"
````

## prisma/schema.prisma

````prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Visibility {
  PUBLIC
  SECRET
  PASSWORD
}

enum Theme {
  AUTO
  LIGHT
  DARK
}

model Album {
  id            String        @id @default(cuid())
  slug          String        @unique
  title         String
  subtitle      String        @default("Um dia para recordar.")
  eventDate     DateTime
  visibility    Visibility    @default(SECRET)
  theme         Theme         @default(AUTO)
  secretHash    String?
  passwordHash  String?
  accessVersion Int           @default(1)
  coverPhotoId  String?
  categories    Category[]
  photos        Photo[]
  visits        Visit[]
  downloads     DownloadLog[]
  jobs          ZipJob[]
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
}

model Category {
  id           String  @id @default(cuid())
  albumId      String
  album        Album   @relation(fields: [albumId], references: [id], onDelete: Cascade)
  name         String
  order        Int     @default(0)
  coverPhotoId String?
  photos       Photo[]

  @@index([albumId, order])
}

model Photo {
  id            String        @id @default(cuid())
  albumId       String
  album         Album         @relation(fields: [albumId], references: [id], onDelete: Cascade)
  categoryId    String
  category      Category      @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  alt           String
  width         Int
  height        Int
  originalKey   String
  largeKey      String
  thumbnailKeys Json
  size          Int
  mime          String
  extension     String
  exif          Json?
  order         Int           @default(0)
  featured      Boolean       @default(false)
  createdAt     DateTime      @default(now())
  downloads     DownloadLog[]

  @@index([albumId, categoryId, order])
}

model Admin {
  id           String    @id @default(cuid())
  email        String    @unique
  passwordHash String
  sessions     Session[]
}

model Session {
  id        String   @id
  adminId   String
  admin     Admin    @relation(fields: [adminId], references: [id], onDelete: Cascade)
  expiresAt DateTime

  @@index([expiresAt])
}

model RateBucket {
  key       String   @id
  hits      Int      @default(1)
  expiresAt DateTime

  @@index([expiresAt])
}

model Visit {
  id        String   @id @default(cuid())
  albumId   String
  album     Album    @relation(fields: [albumId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@index([albumId, createdAt])
}

model DownloadLog {
  id         String   @id @default(cuid())
  albumId    String
  album      Album    @relation(fields: [albumId], references: [id], onDelete: Cascade)
  photoId    String?
  photo      Photo?   @relation(fields: [photoId], references: [id], onDelete: SetNull)
  categoryId String?
  type       String
  createdAt  DateTime @default(now())

  @@index([albumId, createdAt])
}

model ZipJob {
  id            String   @id @default(cuid())
  albumId       String
  album         Album    @relation(fields: [albumId], references: [id], onDelete: Cascade)
  categoryId    String?
  accessVersion Int
  status        String   @default("PENDING")
  total         Int
  completed     Int      @default(0)
  error         String?
  createdAt     DateTime @default(now())

  @@index([createdAt])
}
````

## prisma/seed.ts

````typescript
import sharp from 'sharp';
import { db } from '../src/lib/db';
import { processImage } from '../src/lib/images';
const categories=[['Cerimónia',12],['Entradas',8],['Graduados',14],['Convidados',9],['Família',11],['Amigos',10],['Momentos espontâneos',13],['Celebração',9],['Destaques',6]] as const;
const ratios=[[4,5],[4,3],[1,1],[2,3],[3,2]];
async function main(){
 const album=await db.album.upsert({where:{slug:'graduacao-2026'},create:{slug:'graduacao-2026',title:'Graduação das Gêmeas 2026',subtitle:'Um dia para recordar.',eventDate:new Date('2026-10-16T12:00:00Z'),visibility:'PUBLIC'},update:{}});
 const multiplier=Math.max(1,Number(process.env.DEMO_MULTIPLIER||1));
 for(const [ci,[name,count]] of categories.entries()){
 let cat=await db.category.findFirst({where:{albumId:album.id,name}});if(!cat)cat=await db.category.create({data:{albumId:album.id,name,order:ci}});
 const existing=await db.photo.count({where:{categoryId:cat.id}});
 for(let i=existing;i<count*multiplier;i++){
 const [rw,rh]=ratios[(ci+i)%ratios.length];const w=rw*360,h=rh*360,hue=(ci*37+i*7)%360;
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="hsl(${hue},35%,65%)"/><stop offset="1" stop-color="hsl(${hue+35},40%,22%)"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><circle cx="${w*.6}" cy="${h*.3}" r="${w*.15}" fill="#f5dfb6" opacity=".45"/><path d="M0 ${h} Q${w*.5} ${h*.2} ${w} ${h} Z" fill="#171514" opacity=".3"/></svg>`;
 const jpg=await sharp(Buffer.from(svg)).jpeg({quality:92}).toBuffer();
 const photo=await db.photo.create({data:{...await processImage(jpg,album.id),albumId:album.id,categoryId:cat.id,alt:`Demonstração — ${name}, fotografia ${i+1}`,order:i,featured:name==='Destaques'}});
 if(i===0){await db.category.update({where:{id:cat.id},data:{coverPhotoId:photo.id}});if(ci===0&&!album.coverPhotoId)await db.album.update({where:{id:album.id},data:{coverPhotoId:photo.id}});}
 }
 }
 console.log('Álbum de demonstração pronto: /a/graduacao-2026');
}
main().finally(()=>db.$disconnect());
````

## scripts/create-admin.ts

````typescript
import { db } from "../src/lib/db";
import { passwordHash } from "../src/lib/security";
async function main() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase(),
    password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 12)
    throw new Error(
      "Defina ADMIN_EMAIL e ADMIN_PASSWORD (mínimo 12 caracteres).",
    );
  await db.admin.upsert({
    where: { email },
    create: { email, passwordHash: await passwordHash(password) },
    update: { passwordHash: await passwordHash(password) },
  });
  // Trocar a palavra-passe revoga todas as sessões existentes.
  const admin = await db.admin.findUniqueOrThrow({ where: { email } });
  await db.session.deleteMany({ where: { adminId: admin.id } });
  console.log("Administrador criado/atualizado.");
}
main().finally(() => db.$disconnect());
````

## scripts/maintenance.ts

````typescript
import { db } from "../src/lib/db";
async function main() {
  const now = new Date();
  const older = new Date(Date.now() - 86400000);
  await db.session.deleteMany({ where: { expiresAt: { lt: now } } });
  await db.rateBucket.deleteMany({ where: { expiresAt: { lt: now } } });
  await db.zipJob.updateMany({
    where: {
      status: "RUNNING",
      createdAt: { lt: new Date(Date.now() - 3600000) },
    },
    data: {
      status: "ERROR",
      error: "Preparação interrompida. Prepare um novo ZIP.",
    },
  });
  await db.zipJob.deleteMany({ where: { createdAt: { lt: older } } });
  console.log("Manutenção concluída.");
}
main().finally(() => db.$disconnect());
````

## scripts/prepare-standalone.mjs

````javascript
import { cp, mkdir } from "node:fs/promises";
await mkdir(".next/standalone/.next", { recursive: true });
await cp(".next/static", ".next/standalone/.next/static", { recursive: true });
````

## scripts/start.mjs

````javascript
import path from "node:path";
import { spawn } from "node:child_process";
const child = spawn(process.execPath, [".next/standalone/server.js"], {
  stdio: "inherit",
  env: {
    ...process.env,
    LOCAL_STORAGE_PATH: path.resolve(
      process.env.LOCAL_STORAGE_PATH || "data/media",
    ),
    HOSTNAME: process.env.ALBUM_BIND_HOST || "0.0.0.0",
    PORT: process.env.PORT || "3000",
  },
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code || 0));
````

## src/app/a/[slug]/page.tsx

````tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadAlbum, photoDTO } from "@/lib/album";
import { AlbumClient } from "@/components/AlbumClient";
import { Unlock } from "@/components/Unlock";
export const dynamic = "force-dynamic";
type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ k?: string }>;
};
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = await loadAlbum(slug);
  if (!result) return { title: "Álbum indisponível" };
  const a = result.album;
  if (a.visibility !== "PUBLIC")
    return {
      title: "Álbum privado — Memory Album",
      robots: { index: false, follow: false },
      description: "Um álbum privado para convidados e família.",
    };
  const photo = a.photos.find((p) => p.id === a.coverPhotoId) || a.photos[0];
  const image = photo ? `/api/photos/${photo.id}/media?size=large` : undefined;
  return {
    title: a.title,
    description: `${a.subtitle} ${a.title} · ${a.eventDate.toLocaleDateString("pt-PT", { timeZone: "Africa/Maputo" })}.`,
    alternates: { canonical: `/a/${a.slug}` },
    openGraph: {
      title: a.title,
      description: a.subtitle,
      type: "website",
      url: `/a/${a.slug}`,
      locale: "pt_PT",
      ...(image
        ? {
            images: [
              {
                url: image,
                width: photo!.width,
                height: photo!.height,
                alt: photo!.alt,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: a.title,
      description: a.subtitle,
      ...(image ? { images: [image] } : {}),
    },
  };
}
export default async function AlbumPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { k } = await searchParams;
  const result = await loadAlbum(slug);
  if (!result) notFound();
  const a = result.album;
  if (result.locked)
    return <Unlock slug={slug} secretKey={k} visibility={a.visibility} />;
  return (
    <AlbumClient
      key={a.id}
      album={{
        id: a.id,
        slug: a.slug,
        title: a.title,
        subtitle: a.subtitle,
        eventDate: a.eventDate.toISOString(),
        theme: a.theme,
        coverPhotoId: a.coverPhotoId,
        categories: a.categories.map((c) => ({
          id: c.id,
          name: c.name,
          order: c.order,
          coverPhotoId: c.coverPhotoId,
        })),
        photos: a.photos.map(photoDTO),
      }}
    />
  );
}
````

## src/app/admin/page.tsx

````tsx
import { isAdmin } from "@/lib/security";
import { AdminPanel } from "@/components/AdminPanel";
import { Login } from "@/components/Login";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Administração — Memory Album",
  robots: { index: false, follow: false },
};
export default async function Admin() {
  return (await isAdmin()) ? <AdminPanel /> : <Login />;
}
````

## src/app/api/admin/qr/route.ts

````typescript
import QRCode from "qrcode";
import { requireAdmin } from "@/lib/security";
import { fail, HttpError, attachment } from "@/lib/errors";
export async function GET(req: Request) {
  try {
    await requireAdmin();
    const url = new URL(req.url).searchParams.get("url");
    if (
      !url ||
      new URL(url).origin !== new URL(process.env.APP_URL || req.url).origin
    )
      throw new HttpError(400, "Link inválido.");
    const png = await QRCode.toBuffer(url, {
      width: 768,
      margin: 3,
      errorCorrectionLevel: "M",
    });
    return new Response(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": attachment("album-qr.png"),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    return fail(e);
  }
}
````

## src/app/api/admin/route.ts

````typescript
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { requireAdmin, sameOrigin, hash, passwordHash } from "@/lib/security";
import { fail, HttpError } from "@/lib/errors";
import { remove } from "@/lib/storage";
const text = z.string().trim().min(1).max(200);
const albumSchema = z.object({
  id: z.string().optional(),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(80),
  title: text,
  subtitle: z.string().max(300),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  visibility: z.enum(["PUBLIC", "SECRET", "PASSWORD"]),
  theme: z.enum(["AUTO", "LIGHT", "DARK"]),
  password: z.string().min(12).max(256).optional(),
  coverPhotoId: z.string().nullable().optional(),
});
export async function GET() {
  try {
    await requireAdmin();
    const albums = await db.album.findMany({
      include: {
        categories: { orderBy: { order: "asc" } },
        photos: { orderBy: { order: "asc" } },
        _count: { select: { visits: true, downloads: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return Response.json(
      albums.map(({ secretHash, passwordHash, ...a }) => ({
        ...a,
        photos: a.photos.map(
          ({ originalKey, largeKey, thumbnailKeys, exif, ...p }) => p,
        ),
      })),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return fail(e);
  }
}
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    await requireAdmin();
    const body = await req.json();
    if (body.action === "album") {
      const d = albumSchema.parse(body.data);
      const previous = d.id
        ? await db.album.findUnique({ where: { id: d.id } })
        : null;
      if (d.id && !previous) throw new HttpError(404, "Álbum indisponível.");
      if (
        d.coverPhotoId &&
        !(await db.photo.findFirst({
          where: { id: d.coverPhotoId, albumId: d.id },
        }))
      )
        throw new HttpError(400, "Capa inválida.");
      if (d.visibility === "PASSWORD" && !d.password && !previous?.passwordHash)
        throw new HttpError(
          400,
          "Defina uma palavra-passe de pelo menos 12 caracteres.",
        );
      const eventDate = new Date(`${d.eventDate}T12:00:00Z`);
      if (
        !Number.isFinite(eventDate.getTime()) ||
        eventDate.toISOString().slice(0, 10) !== d.eventDate
      )
        throw new HttpError(400, "Data inválida.");
      const { id, password, ...fields } = d;
      let secret: string | undefined;
      if (
        d.visibility === "SECRET" &&
        (!previous?.secretHash || previous.visibility !== "SECRET")
      )
        secret = randomBytes(32).toString("base64url");
      const changed =
        !!previous &&
        (previous.visibility !== d.visibility || !!password || !!secret);
      const data = {
        ...fields,
        eventDate,
        ...(password ? { passwordHash: await passwordHash(password) } : {}),
        ...(secret ? { secretHash: hash(secret) } : {}),
        ...(changed ? { accessVersion: { increment: 1 } } : {}),
      };
      const album = id
        ? await db.album.update({ where: { id }, data })
        : await db.album.create({
            data: {
              ...fields,
              eventDate,
              passwordHash: password ? await passwordHash(password) : undefined,
              secretHash: secret ? hash(secret) : undefined,
            },
          });
      return Response.json({ id: album.id, secret });
    }
    if (body.action === "rotate-secret") {
      const { id } = z.object({ id: z.string() }).parse(body.data);
      const secret = randomBytes(32).toString("base64url");
      const album = await db.album.update({
        where: { id },
        data: {
          visibility: "SECRET",
          secretHash: hash(secret),
          accessVersion: { increment: 1 },
        },
      });
      return Response.json({ id: album.id, secret });
    }
    if (body.action === "category") {
      const d = z
        .object({
          id: z.string().optional(),
          albumId: z.string(),
          name: text,
          order: z.number().int().min(0).max(10000),
          coverPhotoId: z.string().nullable().optional(),
        })
        .parse(body.data);
      if (
        d.id &&
        !(await db.category.findFirst({
          where: { id: d.id, albumId: d.albumId },
        }))
      )
        throw new HttpError(404, "Categoria indisponível.");
      if (
        d.coverPhotoId &&
        !(await db.photo.findFirst({
          where: { id: d.coverPhotoId, categoryId: d.id, albumId: d.albumId },
        }))
      )
        throw new HttpError(400, "Capa inválida.");
      const { id, ...data } = d;
      return Response.json(
        id
          ? await db.category.update({ where: { id }, data })
          : await db.category.create({ data }),
      );
    }
    if (body.action === "delete-category") {
      const { id } = z.object({ id: z.string() }).parse(body.data);
      if (await db.photo.count({ where: { categoryId: id } }))
        throw new HttpError(
          409,
          "Mova ou apague as fotografias antes de remover a categoria.",
        );
      await db.category.delete({ where: { id } });
      return Response.json({ ok: true });
    }
    if (body.action === "photo") {
      const { id, ...data } = z
        .object({
          id: z.string(),
          categoryId: z.string(),
          alt: text,
          order: z.number().int().min(0).max(100000),
          featured: z.boolean(),
        })
        .parse(body.data);
      const photo = await db.photo.findUniqueOrThrow({ where: { id } });
      if (
        !(await db.category.findFirst({
          where: { id: data.categoryId, albumId: photo.albumId },
        }))
      )
        throw new HttpError(400, "Categoria inválida.");
      await db.$transaction(async (tx) => {
        await tx.photo.update({ where: { id }, data });
        if (photo.categoryId !== data.categoryId)
          await tx.category.updateMany({
            where: { coverPhotoId: id },
            data: { coverPhotoId: null },
          });
      });
      return Response.json({ ok: true });
    }
    if (body.action === "delete-photo") {
      const { id } = z.object({ id: z.string() }).parse(body.data);
      const photo = await db.photo.findUniqueOrThrow({ where: { id } });
      // Remover do armazenamento antes do registo permite repetir em caso de falha.
      await Promise.all(
        [
          photo.originalKey,
          photo.largeKey,
          ...Object.values(photo.thumbnailKeys as Record<string, string>),
        ].map(remove),
      );
      await db.$transaction([
        db.album.updateMany({
          where: { coverPhotoId: id },
          data: { coverPhotoId: null },
        }),
        db.category.updateMany({
          where: { coverPhotoId: id },
          data: { coverPhotoId: null },
        }),
        db.photo.delete({ where: { id } }),
      ]);
      return Response.json({ ok: true });
    }
    throw new HttpError(400, "Operação inválida.");
  } catch (e) {
    return fail(e);
  }
}
````

## src/app/api/admin/upload/route.ts

````typescript
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { requireAdmin, rateLimit, sameOrigin } from "@/lib/security";
import { processImage } from "@/lib/images";
import { remove } from "@/lib/storage";
import { fail, HttpError } from "@/lib/errors";
export const runtime = "nodejs";
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    await requireAdmin();
    await rateLimit(req, "upload", 60);
    const length = Number(req.headers.get("content-length"));
    const max = Number(process.env.MAX_UPLOAD_MB || 25) * 1024 * 1024;
    if (!length || length > max + 65536)
      throw new HttpError(
        413,
        "Pedido demasiado grande ou sem tamanho conhecido.",
      );
    const form = await req.formData();
    const file = form.get("file");
    const categoryId = String(form.get("categoryId") || "");
    if (!(file instanceof File))
      throw new HttpError(400, "Escolha uma fotografia.");
    const category = await db.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) throw new HttpError(400, "Escolha uma categoria válida.");
    const image = await processImage(
      Buffer.from(await file.arrayBuffer()),
      category.albumId,
    );
    try {
      const photo = await db.photo.create({
        data: {
          id: randomUUID(),
          ...image,
          albumId: category.albumId,
          categoryId,
          alt: String(
            form.get("alt") || `Fotografia de ${category.name}`,
          ).slice(0, 200),
          order: await db.photo.count({ where: { categoryId } }),
        },
      });
      await db.category.updateMany({
        where: { id: categoryId, coverPhotoId: null },
        data: { coverPhotoId: photo.id },
      });
      await db.album.updateMany({
        where: { id: category.albumId, coverPhotoId: null },
        data: { coverPhotoId: photo.id },
      });
      return Response.json({ id: photo.id });
    } catch (e) {
      await Promise.allSettled(
        [
          image.originalKey,
          image.largeKey,
          ...Object.values(image.thumbnailKeys),
        ].map(remove),
      );
      throw e;
    }
  } catch (e) {
    return fail(e);
  }
}
````

## src/app/api/albums/[slug]/access/route.ts

````typescript
import { z } from "zod";
import { db } from "@/lib/db";
import {
  hash,
  passwordMatches,
  rateLimit,
  sameOrigin,
  setGrant,
} from "@/lib/security";
import { fail, HttpError } from "@/lib/errors";
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    sameOrigin(req);
    const { slug } = await params;
    await rateLimit(req, `unlock:${slug}`, 5, 300);
    const { key, password } = z
      .object({
        key: z.string().max(256).optional(),
        password: z.string().max(256).optional(),
      })
      .parse(await req.json());
    const album = await db.album.findUnique({ where: { slug } });
    if (!album) throw new HttpError(404, "Álbum indisponível.");
    const ok =
      album.visibility === "PUBLIC" ||
      (album.visibility === "SECRET" &&
        key &&
        hash(key) === album.secretHash) ||
      (album.visibility === "PASSWORD" &&
        password &&
        album.passwordHash &&
        (await passwordMatches(password, album.passwordHash)));
    if (!ok)
      throw new HttpError(
        403,
        "Acesso não autorizado. Verifique o link ou a palavra-passe.",
      );
    await setGrant(album);
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
````

## src/app/api/albums/[slug]/visit/route.ts

````typescript
import { db } from "@/lib/db";
import { requireAlbum, rateLimit, sameOrigin } from "@/lib/security";
import { fail, HttpError } from "@/lib/errors";
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    sameOrigin(req);
    const { slug } = await params;
    await rateLimit(req, `visit:${slug}`, 20);
    const album = await db.album.findUnique({ where: { slug } });
    if (!album) throw new HttpError(404, "Álbum indisponível.");
    await requireAlbum(album.id);
    await db.visit.create({ data: { albumId: album.id } });
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
````

## src/app/api/albums/[slug]/zip/route.ts

````typescript
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAlbum, rateLimit, sameOrigin } from "@/lib/security";
import { fail, HttpError } from "@/lib/errors";
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    sameOrigin(req);
    await rateLimit(req, "zip-create", 4, 300);
    const { slug } = await params;
    const a = await db.album.findUnique({ where: { slug } });
    if (!a) throw new HttpError(404, "Álbum indisponível.");
    await requireAlbum(a.id);
    const { categoryId } = z
      .object({ categoryId: z.string().optional() })
      .parse(await req.json());
    if (
      categoryId &&
      !(await db.category.findFirst({
        where: { id: categoryId, albumId: a.id },
      }))
    )
      throw new HttpError(404, "Categoria indisponível.");
    const total = await db.photo.count({
      where: { albumId: a.id, ...(categoryId ? { categoryId } : {}) },
    });
    if (!total)
      throw new HttpError(400, "Não há fotografias para descarregar.");
    if (total > Number(process.env.ZIP_MAX_PHOTOS || 10000))
      throw new HttpError(
        413,
        "Escolha uma categoria para reduzir o tamanho do ZIP.",
      );
    const job = await db.zipJob.create({
      data: {
        albumId: a.id,
        categoryId,
        accessVersion: a.accessVersion,
        total,
      },
    });
    return Response.json({ id: job.id, total });
  } catch (e) {
    return fail(e);
  }
}
````

## src/app/api/auth/route.ts

````typescript
import { z } from "zod";
import { login, logout, rateLimit, sameOrigin } from "@/lib/security";
import { fail } from "@/lib/errors";
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    await rateLimit(req, "login", 5, 300);
    const data = z
      .object({ email: z.email(), password: z.string().min(1).max(256) })
      .parse(await req.json());
    await login(data.email, data.password);
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
export async function DELETE(req: Request) {
  try {
    sameOrigin(req);
    await logout();
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
````

## src/app/api/photos/[id]/download/route.ts

````typescript
import { db } from "@/lib/db";
import { requireAlbum, rateLimit } from "@/lib/security";
import { read, webStream, signedOriginal } from "@/lib/storage";
import { attachment, fail, HttpError, safeName } from "@/lib/errors";
export const runtime = "nodejs";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await rateLimit(req, "photo-download", 60);
    const p = await db.photo.findUnique({ where: { id } });
    if (!p) throw new HttpError(404, "Fotografia indisponível.");
    const album = await requireAlbum(p.albumId);
    const disposition = attachment(
      `${safeName(album.slug)}-${p.id}.${p.extension}`,
    );
    const url = await signedOriginal(p.originalKey, disposition);
    await db.downloadLog.create({
      data: { albumId: p.albumId, photoId: p.id, type: "PHOTO" },
    });
    if (url) return Response.redirect(url, 302);
    const stream = await read(p.originalKey);
    req.signal.addEventListener("abort", () => stream.destroy(), {
      once: true,
    });
    return new Response(webStream(stream), {
      headers: {
        "Content-Type": p.mime,
        "Content-Disposition": disposition,
        "Content-Length": String(p.size),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    return fail(e);
  }
}
````

## src/app/api/photos/[id]/media/route.ts

````typescript
import { db } from "@/lib/db";
import { requireAlbum } from "@/lib/security";
import { read, webStream } from "@/lib/storage";
import { fail, HttpError } from "@/lib/errors";
export const runtime = "nodejs";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const p = await db.photo.findUnique({ where: { id } });
    if (!p) throw new HttpError(404, "Fotografia indisponível.");
    const album = await requireAlbum(p.albumId);
    const size = new URL(req.url).searchParams.get("size") || "640";
    const thumbs = p.thumbnailKeys as Record<string, string>;
    const key = size === "large" ? p.largeKey : thumbs[size];
    if (!key) throw new HttpError(400, "Tamanho inválido.");
    const stream = await read(key);
    req.signal.addEventListener("abort", () => stream.destroy(), {
      once: true,
    });
    return new Response(webStream(stream), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, no-cache, max-age=0, must-revalidate",
        Vary: "Cookie",
      },
    });
  } catch (e) {
    return fail(e);
  }
}
````

## src/app/api/zip/[id]/route.ts

````typescript
import { db } from "@/lib/db";
import { requireAlbum, rateLimit } from "@/lib/security";
import { streamZip } from "@/lib/zip";
import { attachment, fail, HttpError, safeName } from "@/lib/errors";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const job = await db.zipJob.findUnique({ where: { id } });
    if (!job) throw new HttpError(404, "Download indisponível.");
    const album = await requireAlbum(job.albumId);
    if (new URL(req.url).searchParams.has("status"))
      return Response.json(
        {
          status: job.status,
          total: job.total,
          completed: job.completed,
          error: job.error,
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    await rateLimit(req, "zip-stream", 4, 300);
    if (
      job.accessVersion !== album.accessVersion ||
      Date.now() - job.createdAt.getTime() > 3600000
    )
      throw new HttpError(410, "Download expirado. Prepare um novo ZIP.");
    const claimed = await db.zipJob.updateMany({
      where: { id, status: "PENDING" },
      data: { status: "RUNNING" },
    });
    if (!claimed.count)
      throw new HttpError(
        409,
        "Este download já foi iniciado. Prepare um novo ZIP.",
      );
    const category = job.categoryId
      ? await db.category.findUnique({ where: { id: job.categoryId } })
      : null;
    const name = category
      ? `${album.slug}-${safeName(category.name)}.zip`
      : `${album.slug}.zip`;
    return new Response(streamZip(job, req.signal), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": attachment(name),
        "Cache-Control": "private, no-store",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (e) {
    return fail(e);
  }
}
````

## src/app/error.tsx

````tsx
"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="shell">
      <h1>Não foi possível abrir esta página.</h1>
      <p>Tente novamente dentro de alguns instantes.</p>
      <button onClick={reset} className="btn">
        Tentar novamente
      </button>
    </main>
  );
}
````

## src/app/globals.css

````css
:root {
  --bg: #f6f2ec;
  --fg: #1c1a17;
  --mut: #7a7368;
  --mut-aa: #70685d;
  --line: #ddd5c8;
  --acc: #9a6b2f;
  --acc-ink: #8b602a;
  --ov: rgba(246, 242, 236, 0.96);
  --shadow: 0 10px 40px #0002;
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]),
  [data-theme]:not([data-theme="light"]) {
    --bg: #121110;
    --fg: #f1ece4;
    --mut: #9b9488;
    --mut-aa: #9b9488;
    --line: #2b2825;
    --acc: #d3a665;
    --acc-ink: #d3a665;
    --ov: rgba(18, 17, 16, 0.96);
    color-scheme: dark;
  }
}
[data-theme="light"] {
  --bg: #f6f2ec;
  --fg: #1c1a17;
  --mut: #7a7368;
  --mut-aa: #70685d;
  --line: #ddd5c8;
  --acc: #9a6b2f;
  --acc-ink: #8b602a;
  --ov: rgba(246, 242, 236, 0.96);
  color-scheme: light;
}
[data-theme="dark"] {
  --bg: #121110;
  --fg: #f1ece4;
  --mut: #9b9488;
  --mut-aa: #9b9488;
  --line: #2b2825;
  --acc: #d3a665;
  --acc-ink: #d3a665;
  --ov: rgba(18, 17, 16, 0.96);
  color-scheme: dark;
}
* {
  box-sizing: border-box;
}
html {
  scroll-behavior: smooth;
}
body {
  margin: 0;
  padding-top: env(safe-area-inset-top);
  background: var(--bg);
  color: var(--fg);
  font-family: Georgia, "Times New Roman", serif;
  line-height: 1.5;
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
  padding-bottom: env(safe-area-inset-bottom);
}
a {
  color: inherit;
}
button,
input,
select {
  border-radius: 0;
  font: inherit;
  color: inherit;
}
button {
  cursor: pointer;
}
button:disabled {
  cursor: wait;
  opacity: 0.55;
}
button,
a,
input,
select {
  -webkit-tap-highlight-color: transparent;
}
:focus-visible {
  outline: 3px solid var(--acc);
  outline-offset: 4px;
}
h1 {
  font-weight: 400;
  font-size: clamp(40px, 8vw, 80px);
  line-height: 1.1;
}
h2 {
  font-weight: 400;
  font-size: clamp(28px, 6vw, 44px);
  margin: 0 0 6px;
}
h3 {
  font-weight: 400;
  font-size: 26px;
}
.shell {
  max-width: 1200px;
  margin: auto;
  padding: 64px 20px 40px;
}
.eyebrow {
  font:
    600 11px/1.4 system-ui,
    sans-serif;
  letter-spacing: 0.22em;
  text-transform: uppercase;
}
.muted {
  color: var(--mut-aa);
  font:
    14px system-ui,
    sans-serif;
}
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid currentColor;
  background: transparent;
  padding: 14px 22px;
  font:
    600 11px/1.4 system-ui,
    sans-serif;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  text-decoration: none;
  min-height: 44px;
  transition:
    background 0.3s,
    color 0.3s;
}
.btn:hover {
  background: var(--fg);
  color: var(--bg);
}
.link {
  border: 0;
  background: none;
  color: var(--acc-ink);
  font:
    600 12px system-ui,
    sans-serif;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  min-height: 44px;
}
.circle {
  border: 1px solid var(--line);
  background: transparent;
  width: 46px;
  height: 46px;
  flex-shrink: 0;
  border-radius: 50%;
  font:
    26px system-ui,
    sans-serif;
}
.skip {
  position: fixed;
  top: 10px;
  left: 10px;
  background: var(--bg);
  color: var(--fg);
  z-index: 100;
  padding: 12px;
  transform: translateY(-150%);
}
.skip:focus {
  transform: none;
}
footer {
  text-align: center;
  color: var(--mut-aa);
  font:
    12px system-ui,
    sans-serif;
  padding: 40px 20px;
  letter-spacing: 0.1em;
}
input,
select {
  display: block;
  width: 100%;
  background: var(--bg);
  border: 1px solid var(--line);
  padding: 12px;
  margin: 8px 0 20px;
  min-height: 44px;
  font:
    14px system-ui,
    sans-serif;
}
label {
  font:
    12px system-ui,
    sans-serif;
  display: block;
}
form {
  max-width: 620px;
}
.gate {
  max-width: 650px;
  padding-top: 15svh;
}
.gate h1 {
  font-size: 54px;
}
progress {
  accent-color: var(--acc-ink);
}
@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }
  *,
  *:before,
  *:after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
[hidden] {
  display: none !important;
}
````

## src/app/layout.tsx

````tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || "http://localhost:3000"),
  title: "Memory Album — Memórias para recordar",
  description:
    "Álbuns digitais de fotografias para partilhar momentos especiais.",
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light dark",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-MZ">
      <body>{children}</body>
    </html>
  );
}
````

## src/app/not-found.tsx

````tsx
import Link from "next/link";
export default function NotFound() {
  return (
    <main className="shell">
      <h1>Álbum indisponível.</h1>
      <p>Verifique o link que recebeu.</p>
      <Link href="/" className="btn">
        Página inicial
      </Link>
    </main>
  );
}
````

## src/app/page.tsx

````tsx
import Link from "next/link";
export default function Home() {
  return (
    <main className="shell">
      <p className="eyebrow">Memory Album</p>
      <h1>Memórias para recordar.</h1>
      <p>Gio e Edy · 16 de Outubro de 2026</p>
      <Link className="btn" href="/a/graduacao-2026">
        Ver álbum de demonstração
      </Link>
    </main>
  );
}
````

## src/app/robots.ts

````typescript
import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] },
  };
}
````

## src/components/Admin.module.css

````css
.admin h1 {
  font-size: clamp(36px, 7vw, 64px);
  margin: 0;
}
.bar {
  display: flex;
  gap: 20px;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
}
.message {
  min-height: 28px;
  font:
    14px system-ui,
    sans-serif;
  color: var(--acc-ink);
}
.panel {
  border-top: 1px solid var(--line);
  padding: 36px 0;
  margin-top: 32px;
}
.panel h2 {
  font-size: 32px;
  margin-bottom: 20px;
}
.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin: 16px 0;
}
.categoryRow {
  border-bottom: 1px solid var(--line);
  padding: 20px 0;
}
.drop {
  border: 1px dashed var(--acc);
  padding: 32px 20px;
  text-align: center;
}
.drop input {
  max-width: 450px;
  margin: 16px auto;
}
.photos {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 24px;
}
.photo {
  border: 1px solid var(--line);
  padding: 16px;
}
.photo img {
  display: block;
  object-fit: contain;
  width: 100%;
  height: 200px;
  background: var(--line);
  margin-bottom: 16px;
}
.checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
}
.checkbox input {
  width: auto;
  min-height: 20px;
  margin: 0;
}
.admin progress {
  display: block;
  width: 100%;
  max-width: 450px;
  margin-top: 8px;
}
@media (min-width: 760px) {
  .photos {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
````

## src/components/AdminPanel.tsx

````tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./Admin.module.css";
type Photo = {
  id: string;
  categoryId: string;
  alt: string;
  width: number;
  height: number;
  order: number;
  featured: boolean;
};
type Category = {
  id: string;
  name: string;
  order: number;
  coverPhotoId: string | null;
};
type Album = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  eventDate: string;
  visibility: "PUBLIC" | "SECRET" | "PASSWORD";
  theme: "AUTO" | "LIGHT" | "DARK";
  coverPhotoId: string | null;
  categories: Category[];
  photos: Photo[];
  _count: { visits: number; downloads: number };
};
export function AdminPanel() {
  const router = useRouter();
  const [albums, setAlbums] = useState<Album[]>([]),
    [active, setActive] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [uploadProgress, setUploadProgress] = useState({
      done: 0,
      total: 0,
      percent: 0,
    }),
    [links, setLinks] = useState<Record<string, string>>({});
  const album = albums.find((a) => a.id === active);
  async function load() {
    const r = await fetch("/api/admin");
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    setAlbums(d);
    setActive((v) => v || d[0]?.id || "");
  }
  useEffect(() => {
    void load().catch((e) => setMessage(e.message));
  }, []);
  async function mutate(action: string, data: unknown) {
    setBusy(true);
    try {
      const r = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, data }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      if (d.secret) {
        const a = albums.find((a) => a.id === d.id);
        const slug = a?.slug || (data as { slug: string }).slug;
        setLinks((v) => ({
          ...v,
          [d.id]: `${location.origin}/a/${slug}?k=${d.secret}`,
        }));
      }
      await load();
      if (action === "album") setActive(d.id);
      setMessage("Alterações guardadas.");
      return d;
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Não foi possível guardar.");
    } finally {
      setBusy(false);
    }
  }
  async function upload(files: FileList | File[], categoryId: string) {
    if (!categoryId) {
      setMessage("Crie ou escolha uma categoria.");
      return;
    }
    setBusy(true);
    const list = Array.from(files);
    let failed = 0;
    for (const [i, file] of list.entries()) {
      setUploadProgress({ done: i, total: list.length, percent: 0 });
      const form = new FormData();
      form.append("file", file);
      form.append("categoryId", categoryId);
      try {
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", "/api/admin/upload");
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable)
              setUploadProgress({
                done: i,
                total: list.length,
                percent: Math.round((e.loaded / e.total) * 100),
              });
          };
          xhr.onload = () => {
            let d;
            try {
              d = JSON.parse(xhr.responseText);
            } catch {
              reject(new Error("Resposta inválida ao carregar a fotografia."));
              return;
            }
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else reject(new Error(`${file.name}: ${d.error}`));
          };
          xhr.onerror = () => reject(new Error("Ligação interrompida."));
          xhr.send(form);
        });
      } catch (e) {
        failed++;
        setMessage(e instanceof Error ? e.message : "Falha no upload.");
      }
    }
    setUploadProgress({ done: list.length, total: list.length, percent: 100 });
    await load();
    setBusy(false);
    setMessage(
      failed
        ? `${list.length - failed} fotografias carregadas; ${failed} falharam. Pode tentar novamente.`
        : "Fotografias carregadas.",
    );
  }
  return (
    <main className={`shell ${styles.admin}`}>
      <div className={styles.bar}>
        <div>
          <p className="eyebrow">Memory Album</p>
          <h1>Administração</h1>
        </div>
        <button
          className="btn"
          onClick={async () => {
            await fetch("/api/auth", { method: "DELETE" });
            router.refresh();
          }}
        >
          Terminar sessão
        </button>
      </div>
      <p role="status" className={styles.message}>
        {message}
      </p>
      <label>
        Álbum
        <select value={active} onChange={(e) => setActive(e.target.value)}>
          <option value="">Criar novo álbum</option>
          {albums.map((a) => (
            <option key={a.id} value={a.id}>
              {a.title}
            </option>
          ))}
        </select>
      </label>
      <button className="link" onClick={() => setActive("")}>
        + Novo álbum
      </button>
      <section className={styles.panel}>
        <h2>{album ? "Editar álbum" : "Criar álbum"}</h2>
        <AlbumForm
          key={album?.id || "new"}
          album={album}
          busy={busy}
          onSave={(data) => mutate("album", data)}
        />
      </section>
      {album && (
        <>
          <section className={styles.panel}>
            <h2>Partilha e estatísticas</h2>
            <p>
              {album.photos.length} fotografias · {album._count.visits} visitas
              · {album._count.downloads} downloads
            </p>
            {album.visibility === "SECRET" && !links[album.id] ? (
              <p>
                O segredo não é guardado em texto simples. Gere um novo link
                para o copiar; o anterior deixará de funcionar.
              </p>
            ) : (
              <>
                <label>
                  Link do álbum
                  <input
                    readOnly
                    value={
                      links[album.id] ||
                      `${typeof window === "undefined" ? "" : location.origin}/a/${album.slug}`
                    }
                  />
                </label>
                <div className={styles.actions}>
                  <button
                    className="btn"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(
                          links[album.id] ||
                            `${location.origin}/a/${album.slug}`,
                        );
                        setMessage("Link copiado.");
                      } catch {
                        setMessage("Copie o link apresentado no campo.");
                      }
                    }}
                  >
                    Copiar link
                  </button>
                  <a
                    className="btn"
                    href={`/api/admin/qr?url=${encodeURIComponent(links[album.id] || `${typeof window === "undefined" ? "" : location.origin}/a/${album.slug}`)}`}
                    download
                  >
                    Baixar QR code
                  </a>
                  <a
                    className="btn"
                    href={links[album.id] || `/a/${album.slug}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Abrir álbum
                  </a>
                </div>
              </>
            )}
            {album.visibility === "SECRET" && (
              <button
                className="btn"
                disabled={busy}
                onClick={() => {
                  if (confirm("Gerar um novo link e invalidar o anterior?"))
                    void mutate("rotate-secret", { id: album.id });
                }}
              >
                Gerar novo link secreto
              </button>
            )}
          </section>
          <section className={styles.panel}>
            <h2>Categorias</h2>
            {album.categories.map((c) => (
              <CategoryForm
                key={`${c.id}-${c.order}-${c.name}`}
                category={c}
                album={album}
                busy={busy}
                onSave={(data) => mutate("category", data)}
                onDelete={() => {
                  if (confirm("Remover esta categoria vazia?"))
                    void mutate("delete-category", { id: c.id });
                }}
              />
            ))}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = e.currentTarget;
                const data = new FormData(f);
                void mutate("category", {
                  albumId: album.id,
                  name: data.get("name"),
                  order: album.categories.length,
                }).then(() => f.reset());
              }}
            >
              <label>
                Nova categoria
                <input name="name" required maxLength={200} />
              </label>
              <button className="btn" disabled={busy}>
                Criar categoria
              </button>
            </form>
          </section>
          <section className={styles.panel}>
            <h2>Carregar fotografias</h2>
            <UploadBox
              categories={album.categories}
              busy={busy}
              onUpload={upload}
            />
            {uploadProgress.total > 0 && (
              <p role="status">
                {uploadProgress.done} / {uploadProgress.total} ficheiros ·
                ficheiro atual {uploadProgress.percent}%
                <progress max={100} value={uploadProgress.percent} />
              </p>
            )}
          </section>
          <section className={styles.panel}>
            <h2>Fotografias</h2>
            <p className="muted">
              Edite a legenda descritiva, categoria, ordem e destaque. Use a
              ordem numérica para organizar a galeria.
            </p>
            <div className={styles.photos}>
              {album.photos.map((p) => (
                <PhotoForm
                  key={`${p.id}-${p.order}-${p.categoryId}-${p.featured}`}
                  photo={p}
                  categories={album.categories}
                  busy={busy}
                  onSave={(data) => mutate("photo", data)}
                  onDelete={() => {
                    if (
                      confirm(
                        "Apagar definitivamente esta fotografia e os seus ficheiros?",
                      )
                    )
                      void mutate("delete-photo", { id: p.id });
                  }}
                />
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
function AlbumForm({
  album,
  busy,
  onSave,
}: {
  album?: Album;
  busy: boolean;
  onSave: (d: unknown) => Promise<unknown>;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const password = String(f.get("password") || "");
        void onSave({
          ...(album ? { id: album.id } : {}),
          title: f.get("title"),
          slug: f.get("slug"),
          subtitle: f.get("subtitle"),
          eventDate: f.get("eventDate"),
          visibility: f.get("visibility"),
          theme: f.get("theme"),
          ...(password ? { password } : {}),
          coverPhotoId: f.get("coverPhotoId") || null,
        });
      }}
    >
      <label>
        Título
        <input
          name="title"
          defaultValue={album?.title || "Graduação das Gêmeas 2026"}
          required
          maxLength={200}
        />
      </label>
      <label>
        Endereço do álbum
        <input
          name="slug"
          defaultValue={album?.slug || "graduacao-2026"}
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          required
          maxLength={80}
        />
      </label>
      <label>
        Subtítulo
        <input
          name="subtitle"
          defaultValue={album?.subtitle || "Um dia para recordar."}
          maxLength={300}
        />
      </label>
      <label>
        Data do evento
        <input
          name="eventDate"
          type="date"
          defaultValue={album?.eventDate.slice(0, 10) || "2026-10-16"}
          required
        />
      </label>
      <label>
        Visibilidade
        <select name="visibility" defaultValue={album?.visibility || "SECRET"}>
          <option value="PUBLIC">Público</option>
          <option value="SECRET">Link secreto</option>
          <option value="PASSWORD">Protegido por palavra-passe</option>
        </select>
      </label>
      <label>
        Palavra-passe do álbum (mínimo 12 caracteres; vazio mantém a atual)
        <input
          name="password"
          type="password"
          minLength={12}
          maxLength={256}
          autoComplete="new-password"
        />
      </label>
      <label>
        Tema inicial
        <select name="theme" defaultValue={album?.theme || "AUTO"}>
          <option value="AUTO">Automático</option>
          <option value="LIGHT">Claro</option>
          <option value="DARK">Escuro</option>
        </select>
      </label>
      <label>
        Fotografia de capa
        <select name="coverPhotoId" defaultValue={album?.coverPhotoId || ""}>
          <option value="">Primeira fotografia</option>
          {album?.photos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.alt}
            </option>
          ))}
        </select>
      </label>
      <button disabled={busy} className="btn">
        Guardar álbum
      </button>
    </form>
  );
}
function CategoryForm({
  category,
  album,
  busy,
  onSave,
  onDelete,
}: {
  category: Category;
  album: Album;
  busy: boolean;
  onSave: (d: unknown) => Promise<unknown>;
  onDelete: () => void;
}) {
  return (
    <form
      className={styles.categoryRow}
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        void onSave({
          id: category.id,
          albumId: album.id,
          name: f.get("name"),
          order: Number(f.get("order")),
          coverPhotoId: f.get("coverPhotoId") || null,
        });
      }}
    >
      <label>
        Nome
        <input
          name="name"
          defaultValue={category.name}
          required
          maxLength={200}
        />
      </label>
      <label>
        Ordem
        <input
          name="order"
          type="number"
          min={0}
          max={10000}
          defaultValue={category.order}
          required
        />
      </label>
      <label>
        Capa
        <select name="coverPhotoId" defaultValue={category.coverPhotoId || ""}>
          <option value="">Primeira fotografia</option>
          {album.photos
            .filter((p) => p.categoryId === category.id)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.alt}
              </option>
            ))}
        </select>
      </label>
      <div className={styles.actions}>
        <button className="btn" disabled={busy}>
          Guardar
        </button>
        <button
          className="link"
          type="button"
          disabled={busy}
          onClick={onDelete}
        >
          Remover
        </button>
      </div>
    </form>
  );
}
function UploadBox({
  categories,
  busy,
  onUpload,
}: {
  categories: Category[];
  busy: boolean;
  onUpload: (f: FileList | File[], c: string) => Promise<void>;
}) {
  const [category, setCategory] = useState(categories[0]?.id || "");
  const fileInput = useRef<HTMLInputElement>(null);
  return (
    <div>
      <label>
        Categoria de destino
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Escolher categoria</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <div
        className={styles.drop}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (!busy) void onUpload(e.dataTransfer.files, category);
        }}
      >
        <p>Arraste as fotografias para aqui</p>
        <button
          type="button"
          className="btn"
          disabled={busy || !category}
          onClick={() => fileInput.current?.click()}
        >
          Escolher fotografias
        </button>
        <input
          hidden
          ref={fileInput}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/avif"
          disabled={busy || !category}
          onChange={(e) => {
            if (e.target.files) void onUpload(e.target.files, category);
            e.target.value = "";
          }}
        />
        <p className="muted">
          JPEG, PNG, WebP ou AVIF · tamanho definido no servidor · uma
          fotografia processada de cada vez.
        </p>
      </div>
    </div>
  );
}
function PhotoForm({
  photo,
  categories,
  busy,
  onSave,
  onDelete,
}: {
  photo: Photo;
  categories: Category[];
  busy: boolean;
  onSave: (d: unknown) => Promise<unknown>;
  onDelete: () => void;
}) {
  return (
    <form
      className={styles.photo}
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        void onSave({
          id: photo.id,
          alt: f.get("alt"),
          categoryId: f.get("categoryId"),
          order: Number(f.get("order")),
          featured: f.get("featured") === "on",
        });
      }}
    >
      <img
        src={`/api/photos/${photo.id}/media?size=320`}
        alt={photo.alt}
        width={photo.width}
        height={photo.height}
        loading="lazy"
      />
      <label>
        Legenda / texto alternativo
        <input name="alt" defaultValue={photo.alt} maxLength={200} required />
      </label>
      <label>
        Categoria
        <select name="categoryId" defaultValue={photo.categoryId}>
          {categories.map((c) => (
            <option value={c.id} key={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Ordem
        <input
          name="order"
          type="number"
          min={0}
          max={100000}
          defaultValue={photo.order}
          required
        />
      </label>
      <label className={styles.checkbox}>
        <input
          name="featured"
          type="checkbox"
          defaultChecked={photo.featured}
        />{" "}
        Destaque
      </label>
      <div className={styles.actions}>
        <button className="btn" disabled={busy}>
          Guardar
        </button>
        <button
          className="link"
          type="button"
          disabled={busy}
          onClick={onDelete}
        >
          Apagar foto
        </button>
      </div>
    </form>
  );
}
````

## src/components/Album.module.css

````css
.album {
  background: var(--bg);
  color: var(--fg);
  min-height: 100svh;
}
.hero {
  position: relative;
  min-height: 92svh;
  display: flex;
  align-items: flex-end;
  color: #fff;
  background: #24201b;
  overflow: hidden;
}
.hero:after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.8),
    rgba(0, 0, 0, 0.06) 75%
  );
}
.cover {
  position: absolute;
  width: 100%;
  height: 100%;
  inset: 0;
  object-fit: cover;
}
.heroCopy {
  position: relative;
  z-index: 1;
  max-width: 1000px;
  padding: 60px max(24px, env(safe-area-inset-left)) 64px;
}
.heroCopy h1 {
  font-size: clamp(44px, 10vw, 104px);
  font-weight: 400;
  line-height: 0.98;
  letter-spacing: -0.025em;
  margin: 20px 0;
}
.subtitle {
  font-size: 22px;
  font-style: italic;
  margin: 0 0 32px;
}
.toolbar,
.bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 32px;
}
.theme {
  font:
    12px system-ui,
    sans-serif;
  display: flex;
  align-items: center;
  gap: 8px;
}
.theme select {
  width: auto;
  margin: 0;
  padding: 8px;
}
.categories {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
  margin-top: 32px;
}
.category {
  position: relative;
  aspect-ratio: 4/5;
  overflow: hidden;
  border: 0;
  padding: 0;
  background: var(--line);
  text-align: left;
}
.category img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.6s;
}
.category:hover img {
  transform: scale(1.04);
}
.category span {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 52px 14px 18px;
  color: white;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.85), transparent);
  font:
    22px/1.2 Georgia,
    serif;
}
.category small {
  display: block;
  font:
    11px system-ui,
    sans-serif;
  letter-spacing: 0.12em;
  margin-top: 9px;
  text-transform: uppercase;
}
.download {
  text-align: center;
  margin-top: 40px;
}
.masonry {
  columns: 2;
  column-gap: 10px;
  margin-top: 32px;
}
.masonry button {
  position: relative;
  display: block;
  width: 100%;
  margin: 0 0 10px;
  padding: 0;
  border: 0;
  background: var(--line);
  overflow: hidden;
  break-inside: avoid;
}
.masonry img {
  width: 100%;
  height: auto;
  display: block;
  opacity: 0.05;
  transition:
    opacity 0.5s,
    transform 0.5s;
}
.masonry img.loaded {
  opacity: 1;
}
.masonry button:hover img {
  transform: scale(1.03);
}
.empty {
  text-align: center;
  padding: 60px 0;
  color: var(--mut-aa);
}
.progress {
  margin: 32px auto;
  max-width: 500px;
  font:
    13px system-ui,
    sans-serif;
}
.progress progress {
  display: block;
  width: 100%;
  margin-top: 10px;
  accent-color: var(--acc-ink);
}
.lightbox {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: var(--ov);
  display: flex;
  flex-direction: column;
  padding: env(safe-area-inset-top) env(safe-area-inset-right)
    env(safe-area-inset-bottom) env(safe-area-inset-left);
  backdrop-filter: blur(12px);
}
.lightboxTop {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  font:
    13px system-ui,
    sans-serif;
}
.stage {
  display: flex;
  flex: 1;
  min-height: 0;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  touch-action: pan-y;
}
.stage img {
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  box-shadow: 0 10px 40px #0003;
}
.lightboxBottom {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  padding: 12px 12px 20px;
}
.lightboxBottom .btn {
  padding: 12px;
}
.caption {
  text-align: center;
  font:
    11px system-ui,
    sans-serif;
  margin: 8px 16px;
  color: var(--mut-aa);
}
.toast {
  position: fixed;
  left: 50%;
  bottom: calc(24px + env(safe-area-inset-bottom));
  transform: translate(-50%, 20px);
  background: var(--fg);
  color: var(--bg);
  font:
    13px system-ui,
    sans-serif;
  padding: 12px 18px;
  opacity: 0;
  pointer-events: none;
  transition: 0.3s;
  z-index: 70;
  max-width: 90vw;
  overflow-wrap: anywhere;
  text-align: center;
}
.toastOn {
  opacity: 1;
  transform: translate(-50%, 0);
}
@media (min-width: 760px) {
  .categories {
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
  }
  .masonry {
    columns: 3;
    column-gap: 14px;
  }
  .masonry button {
    position: relative;
    margin-bottom: 14px;
  }
  .heroCopy {
    padding-left: max(48px, calc((100vw - 1200px) / 2));
  }
}
@media (min-width: 1100px) {
  .masonry {
    columns: 4;
  }
}
@media (prefers-reduced-motion: reduce) {
  .category img,
  .masonry img,
  .toast {
    transition: none;
  }
  .category:hover img,
  .masonry button:hover img {
    transform: none;
  }
}

.featured {
  position: absolute;
  top: 8px;
  right: 8px;
  background: #121110;
  color: #f1ece4;
  padding: 6px 8px;
  font:
    10px system-ui,
    sans-serif;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
````

## src/components/AlbumClient.tsx

````tsx
"use client";
import { useEffect, useRef, useState } from "react";
import type { AlbumView, PhotoView } from "@/lib/types";
import styles from "./Album.module.css";
export function AlbumClient({ album }: { album: AlbumView }) {
  const [category, setCategory] = useState<string | null>(null),
    [selected, setSelected] = useState<string | null>(null),
    [toast, setToast] = useState(""),
    [theme, setTheme] = useState(album.theme),
    [zip, setZip] = useState<{
      id: string;
      total: number;
      completed: number;
      status: string;
    } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    main = useRef<HTMLElement>(null),
    dialog = useRef<HTMLDivElement>(null),
    opener = useRef<HTMLElement | null>(null),
    touch = useRef<{ x: number; y: number } | null>(null);
  const photosForCategory = (id: string) =>
    album.photos.filter((p) => p.categoryId === id);
  const list =
    category && category !== "all" ? photosForCategory(category) : album.photos;
  const index = list.findIndex((p) => p.id === selected),
    photo = list[index];
  const cover =
    album.photos.find((p) => p.id === album.coverPhotoId) || album.photos[0];
  function notify(message: string) {
    setToast(message);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), 2800);
  }
  useEffect(() => {
    void fetch(`/api/albums/${album.slug}/visit`, { method: "POST" });
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [album.id, album.slug]);
  useEffect(() => {
    if (
      !zip ||
      zip.status === "DONE" ||
      zip.status === "ERROR" ||
      zip.status === "CANCELLED"
    )
      return;
    const interval = setInterval(async () => {
      try {
        const r = await fetch(`/api/zip/${zip.id}?status=1`);
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setZip({ id: zip.id, ...d });
        if (d.status === "DONE")
          notify("ZIP preparado. Verifique os downloads do navegador.");
        if (d.error) notify(d.error);
      } catch (e) {
        notify(
          e instanceof Error
            ? e.message
            : "Não foi possível acompanhar o download.",
        );
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [zip?.id, zip?.status]);
  function step(direction: number) {
    if (list.length)
      setSelected(list[(index + direction + list.length) % list.length].id);
  }
  const stepRef = useRef(step);
  stepRef.current = step;
  useEffect(() => {
    if (!photo) return;
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        stepRef.current(event.key === "ArrowLeft" ? -1 : 1);
      }
      if (event.key === "Tab") {
        const elements =
          dialog.current?.querySelectorAll<HTMLElement>("button,a[href]");
        if (!elements?.length) return;
        const first = elements[0],
          last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = before;
      document.removeEventListener("keydown", onKey);
      opener.current?.focus();
    };
  }, [!!photo]);
  useEffect(() => {
    if (!photo) return;
    for (const offset of [-1, 1]) {
      const next = list[(index + offset + list.length) % list.length];
      const image = new Image();
      image.src = next.large;
    }
  }, [selected, category]);
  useEffect(() => {
    const id = new URL(location.href).searchParams.get("photo");
    if (id && album.photos.some((p) => p.id === id)) {
      setCategory("all");
      setSelected(id);
    }
  }, [album.id]);
  async function share(p: PhotoView) {
    const url = new URL(location.href);
    url.searchParams.set("photo", p.id);
    try {
      if (navigator.share) {
        await navigator.share({
          title: album.title,
          text: p.alt,
          url: url.href,
        });
        return;
      }
      await navigator.clipboard.writeText(url.href);
      notify("Link copiado.");
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      notify(`Link: ${url.href}`);
    }
  }
  async function downloadZip() {
    try {
      notify("ZIP em preparação…");
      const r = await fetch(`/api/albums/${album.slug}/zip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          category && category !== "all" ? { categoryId: category } : {},
        ),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setZip({
        id: data.id,
        total: data.total,
        completed: 0,
        status: "PENDING",
      });
      const a = document.createElement("a");
      a.href = `/api/zip/${data.id}`;
      a.download = "";
      document.body.append(a);
      a.click();
      a.remove();
    } catch (e) {
      notify(
        e instanceof Error ? e.message : "Não foi possível preparar o ZIP.",
      );
    }
  }
  function openCategory(id: string) {
    setCategory(id);
    setTimeout(
      () =>
        main.current?.scrollIntoView({
          behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "instant"
            : "smooth",
        }),
      0,
    );
  }
  function thumb(p: PhotoView, extra?: string) {
    return (
      <img
        src={p.src}
        srcSet={p.srcSet}
        sizes="(min-width:1100px) 280px, (min-width:760px) 33vw, 50vw"
        width={p.width}
        height={p.height}
        alt={p.alt}
        loading="lazy"
        className={extra || ""}
        onLoad={(e) => e.currentTarget.classList.add(styles.loaded)}
        onError={(e) => e.currentTarget.classList.add(styles.loaded)}
      />
    );
  }
  const activeZip =
    !!zip && !["DONE", "ERROR", "CANCELLED"].includes(zip.status);
  return (
    <div
      data-theme={theme === "AUTO" ? undefined : theme.toLowerCase()}
      className={styles.album}
    >
      <a href="#categorias" className="skip">
        Saltar para as fotografias
      </a>
      <section className={styles.hero} aria-label="Capa do álbum">
        {cover && (
          <img
            src={cover.large}
            width={cover.width}
            height={cover.height}
            alt={cover.alt}
            fetchPriority="high"
            className={styles.cover}
          />
        )}
        <div className={styles.heroCopy}>
          <p className="eyebrow">
            Álbum digital ·{" "}
            {new Date(album.eventDate).toLocaleDateString("pt-PT", {
              day: "numeric",
              month: "long",
              year: "numeric",
              timeZone: "Africa/Maputo",
            })}
          </p>
          <h1>{album.title}</h1>
          <p className={styles.subtitle}>{album.subtitle}</p>
          <a href="#categorias" className="btn">
            Ver álbum
          </a>
        </div>
      </section>
      <main id="categorias" ref={main} className="shell">
        <div className={styles.toolbar}>
          <span className="eyebrow">
            Memórias de {new Date(album.eventDate).getFullYear()}
          </span>
          <label className={styles.theme}>
            Tema
            <select
              value={theme}
              onChange={(e) => {
                const v = e.target.value as typeof theme;
                setTheme(v);
              }}
            >
              <option value="AUTO">Automático</option>
              <option value="LIGHT">Claro</option>
              <option value="DARK">Escuro</option>
            </select>
          </label>
        </div>
        {category === null ? (
          <>
            <h2>Categorias</h2>
            <p className="muted">
              {album.photos.length} fotografias em {album.categories.length}{" "}
              categorias
            </p>
            <div className={styles.categories}>
              {[
                { id: "all", name: "Todas as fotos", coverPhotoId: cover?.id },
                ...album.categories,
              ].map((c) => {
                const photos =
                  c.id === "all" ? album.photos : photosForCategory(c.id);
                const image =
                  album.photos.find(
                    (p) =>
                      p.id === c.coverPhotoId &&
                      photos.some((x) => x.id === p.id),
                  ) || photos[0];
                return (
                  <button
                    key={c.id}
                    className={styles.category}
                    onClick={() => openCategory(c.id)}
                    aria-label={`${c.name}, ${photos.length} fotografias`}
                  >
                    {image && thumb(image)}
                    <span>
                      {c.name}
                      <small>{photos.length} fotografias</small>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className={styles.download}>
              <button
                className="btn"
                disabled={activeZip || !album.photos.length}
                onClick={downloadZip}
              >
                Baixar álbum completo (ZIP)
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={styles.bar}>
              <button
                className="link"
                onClick={() => {
                  setCategory(null);
                  main.current?.scrollIntoView();
                }}
              >
                ← Categorias
              </button>
              <button
                className="btn"
                disabled={activeZip || !list.length}
                onClick={downloadZip}
              >
                Baixar todas
              </button>
            </div>
            <h2>
              {category === "all"
                ? "Todas as fotos"
                : album.categories.find((c) => c.id === category)?.name}
            </h2>
            <p className="muted">{list.length} fotografias</p>
            {list.length ? (
              <div className={styles.masonry}>
                {list.map((p, i) => (
                  <button
                    key={p.id}
                    onClick={(e) => {
                      opener.current = e.currentTarget;
                      setSelected(p.id);
                    }}
                    style={{ aspectRatio: `${p.width}/${p.height}` }}
                    aria-label={`Ampliar ${p.featured ? "destaque: " : ""}${p.alt}, fotografia ${i + 1}`}
                  >
                    {thumb(p)}
                    {p.featured && (
                      <span className={styles.featured} aria-hidden="true">
                        ★ Destaque
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <p className={styles.empty}>
                Ainda não há fotografias nesta categoria.
              </p>
            )}
          </>
        )}
        {zip && (
          <div className={styles.progress} role="status">
            <label htmlFor="zip-progress">
              {zip.status === "DONE"
                ? "ZIP preparado"
                : zip.status === "ERROR" || zip.status === "CANCELLED"
                  ? "Download interrompido"
                  : "A preparar o ZIP"}{" "}
              — {zip.completed} / {zip.total} fotografias
            </label>
            <progress id="zip-progress" value={zip.completed} max={zip.total} />
          </div>
        )}
      </main>
      <footer>memoryalbum.com/a/{album.slug}</footer>
      {photo && (
        <div
          ref={dialog}
          className={styles.lightbox}
          role="dialog"
          aria-modal="true"
          aria-label="Visualizador de fotografia"
        >
          <div className={styles.lightboxTop}>
            <button
              className="circle"
              aria-label="Fotografia anterior"
              onClick={() => step(-1)}
            >
              ←
            </button>
            <span aria-live="polite">
              {index + 1} / {list.length}
            </span>
            <button
              className="circle"
              aria-label="Fechar visualizador"
              onClick={() => setSelected(null)}
            >
              ×
            </button>
          </div>
          <div
            className={styles.stage}
            onTouchStart={(e) => {
              touch.current = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY,
              };
            }}
            onTouchEnd={(e) => {
              if (!touch.current) return;
              const dx = e.changedTouches[0].clientX - touch.current.x,
                dy = e.changedTouches[0].clientY - touch.current.y;
              if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy))
                step(dx < 0 ? 1 : -1);
              touch.current = null;
            }}
          >
            <img
              src={photo.large}
              alt={photo.alt}
              width={photo.width}
              height={photo.height}
            />
          </div>
          <p className={styles.caption}>{photo.alt}</p>
          <div className={styles.lightboxBottom}>
            <a
              className="btn"
              href={`/api/photos/${photo.id}/download`}
              download
              onClick={() => notify("Download iniciado.")}
            >
              Baixar foto
            </a>
            <button className="btn" onClick={() => share(photo)}>
              Partilhar
            </button>
            <button
              className="circle"
              aria-label="Fotografia seguinte"
              onClick={() => step(1)}
            >
              →
            </button>
          </div>
        </div>
      )}
      <div
        role="status"
        aria-live="polite"
        className={`${styles.toast} ${toast ? styles.toastOn : ""}`}
      >
        {toast}
      </div>
    </div>
  );
}
````

## src/components/Login.tsx

````tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function Login() {
  const router = useRouter();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <main className="shell gate">
      <p className="eyebrow">Memory Album · administração</p>
      <h1>Bem-vindo de volta.</h1>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          setBusy(true);
          setError("");
          try {
            const r = await fetch("/api/auth", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: form.get("email"),
                password: form.get("password"),
              }),
            });
            const d = await r.json();
            if (!r.ok) throw new Error(d.error);
            router.refresh();
          } catch (e) {
            setError(
              e instanceof Error
                ? e.message
                : "Não foi possível iniciar sessão.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          E-mail
          <input name="email" type="email" required autoComplete="username" />
        </label>
        <label>
          Palavra-passe
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            maxLength={256}
          />
        </label>
        <button className="btn" disabled={busy}>
          {busy ? "A verificar…" : "Iniciar sessão"}
        </button>
        <p role="alert">{error}</p>
      </form>
    </main>
  );
}
````

## src/components/Unlock.tsx

````tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
export function Unlock({
  slug,
  secretKey,
  visibility,
}: {
  slug: string;
  secretKey?: string;
  visibility: string;
}) {
  const router = useRouter();
  const [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function unlock(key?: string) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/albums/${slug}/access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(key ? { key } : { password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      router.refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível abrir o álbum.",
      );
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (secretKey) void unlock(secretKey);
  }, [secretKey]);
  return (
    <main className="shell gate">
      <p className="eyebrow">Memory Album · acesso reservado</p>
      <h1>Um momento só nosso.</h1>
      {visibility === "PASSWORD" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void unlock();
          }}
        >
          <label>
            Palavra-passe do álbum
            <input
              autoComplete="current-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              maxLength={256}
            />
          </label>
          <button className="btn" disabled={busy}>
            {busy ? "A abrir…" : "Abrir álbum"}
          </button>
        </form>
      ) : (
        <p>
          {busy
            ? "A verificar o seu link…"
            : "Abra o link completo que recebeu da família."}
        </p>
      )}
      <p role="alert">{error}</p>
    </main>
  );
}
````

## src/lib/album.ts

````typescript
import { db } from "./db";
import { canView } from "./security";
export async function loadAlbum(slug: string, key?: string) {
  const album = await db.album.findUnique({
    where: { slug },
    include: {
      categories: { orderBy: { order: "asc" } },
      photos: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] },
    },
  });
  if (!album) return null;
  if (!(await canView(album, key))) return { locked: true as const, album };
  return { locked: false as const, album };
}
export function photoDTO(p: {
  id: string;
  categoryId: string;
  alt: string;
  width: number;
  height: number;
  featured: boolean;
}) {
  return {
    id: p.id,
    categoryId: p.categoryId,
    alt: p.alt,
    width: p.width,
    height: p.height,
    featured: p.featured,
    src: `/api/photos/${p.id}/media?size=640`,
    large: `/api/photos/${p.id}/media?size=large`,
    srcSet: [
      ...new Map(
        [320, 640, 960].map((w) => [Math.min(w, p.width), w]),
      ).entries(),
    ]
      .map(([actual, w]) => `/api/photos/${p.id}/media?size=${w} ${actual}w`)
      .join(", "),
  };
}
````

## src/lib/db.ts

````typescript
import { PrismaClient } from "@prisma/client";
const globalDb = globalThis as unknown as { prisma?: PrismaClient };
export const db = globalDb.prisma ?? new PrismaClient();
globalDb.prisma = db;
````

## src/lib/errors.ts

````typescript
import { ZodError } from "zod";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function fail(error: unknown) {
  if (error instanceof HttpError)
    return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof ZodError)
    return Response.json(
      { error: "Dados inválidos. Verifique os campos." },
      { status: 400 },
    );
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "P2002"
  )
    return Response.json(
      { error: "Já existe um álbum com este endereço." },
      { status: 409 },
    );
  console.error(error);
  return Response.json(
    { error: "Não foi possível concluir a operação." },
    { status: 500 },
  );
}
export function safeName(value: string) {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 100) || "fotografias"
  );
}
export function attachment(name: string) {
  return `attachment; filename="${safeName(name.split(".").slice(0, -1).join("."))}.${name.split(".").at(-1)}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}
````

## src/lib/images.ts

````typescript
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { put, remove } from "./storage";
import { HttpError } from "./errors";
const formats: Record<string, { mime: string; ext: string }> = {
  jpeg: { mime: "image/jpeg", ext: "jpg" },
  png: { mime: "image/png", ext: "png" },
  webp: { mime: "image/webp", ext: "webp" },
  avif: { mime: "image/avif", ext: "avif" },
};
export async function processImage(buffer: Buffer, albumId: string) {
  const max = Number(process.env.MAX_UPLOAD_MB || 25) * 1024 * 1024;
  if (!buffer.length || buffer.length > max)
    throw new HttpError(413, "Fotografia demasiado grande.");
  let meta: sharp.Metadata;
  try {
    meta = await sharp(buffer, {
      limitInputPixels: 60000000,
      animated: false,
    }).metadata();
  } catch {
    throw new HttpError(400, "Ficheiro de imagem inválido.");
  }
  const format = formats[meta.format || ""];
  if (!format || !meta.width || !meta.height || (meta.pages || 1) > 1)
    throw new HttpError(
      400,
      "Use uma fotografia JPEG, PNG, WebP ou AVIF sem animação.",
    );
  const rotated = await sharp(buffer, { limitInputPixels: 60000000 })
    .rotate()
    .resize({
      width: 2048,
      height: 2048,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 86 })
    .toBuffer({ resolveWithObject: true });
  const prefix = `${albumId}/${randomUUID()}`;
  const keys: string[] = [];
  const originalKey = `${prefix}/original.${format.ext}`,
    largeKey = `${prefix}/large.webp`;
  try {
    await put(originalKey, buffer, format.mime);
    keys.push(originalKey);
    await put(largeKey, rotated.data, "image/webp");
    keys.push(largeKey);
    const thumbnailKeys: Record<string, string> = {};
    for (const width of [320, 640, 960]) {
      const key = `${prefix}/${width}.webp`;
      const b = await sharp(buffer, { limitInputPixels: 60000000 })
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 78 })
        .toBuffer();
      await put(key, b, "image/webp");
      keys.push(key);
      thumbnailKeys[String(width)] = key;
    }
    const sideways = [5, 6, 7, 8].includes(meta.orientation || 1);
    return {
      originalKey,
      largeKey,
      thumbnailKeys,
      width: sideways ? meta.height : meta.width,
      height: sideways ? meta.width : meta.height,
      size: buffer.length,
      mime: format.mime,
      extension: format.ext,
    };
  } catch (e) {
    await Promise.allSettled(keys.map(remove));
    throw e;
  }
}
````

## src/lib/security.ts

````typescript
import {
  createHash,
  createHmac,
  randomBytes,
  scrypt as derive,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import type { Album } from "@prisma/client";
import { db } from "./db";
import { HttpError } from "./errors";
const scrypt = promisify(derive);
export const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export async function passwordHash(value: string) {
  const salt = randomBytes(16).toString("hex");
  const key = (await scrypt(value, salt, 64)) as Buffer;
  return `${salt}:${key.toString("hex")}`;
}
export async function passwordMatches(value: string, stored: string) {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const actual = (await scrypt(value, salt, 64)) as Buffer;
  const expected = Buffer.from(key, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32 || s.includes("SUBSTITUIR"))
    throw new Error(
      "Configure SESSION_SECRET com pelo menos 32 caracteres aleatórios.",
    );
  return s;
}
function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}
export function grantToken(album: Album) {
  const payload = Buffer.from(
    JSON.stringify({
      id: album.id,
      v: album.accessVersion,
      exp: Date.now() + 7 * 86400000,
    }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}
function validGrant(token: string | undefined, album: Album) {
  try {
    if (!token) return false;
    const [p, s] = token.split(".");
    const expected = Buffer.from(sign(p));
    const given = Buffer.from(s || "");
    if (expected.length !== given.length || !timingSafeEqual(expected, given))
      return false;
    const x = JSON.parse(Buffer.from(p, "base64url").toString());
    return (
      x.id === album.id && x.v === album.accessVersion && x.exp > Date.now()
    );
  } catch {
    return false;
  }
}
export async function isAdmin() {
  const jar = await cookies();
  const token = jar.get("ma_session")?.value;
  if (!token) return false;
  const session = await db.session.findUnique({ where: { id: hash(token) } });
  return !!session && session.expiresAt > new Date();
}
export async function requireAdmin() {
  if (!(await isAdmin()))
    throw new HttpError(401, "Inicie sessão para continuar.");
}
export async function canView(album: Album, key?: string | null) {
  if (album.visibility === "PUBLIC" || (await isAdmin())) return true;
  if (album.visibility === "SECRET" && key && hash(key) === album.secretHash)
    return true;
  return validGrant(
    (await cookies()).get(`ma_album_${album.id}`)?.value,
    album,
  );
}
export async function requireAlbum(id: string) {
  const a = await db.album.findUnique({ where: { id } });
  if (!a || !(await canView(a)))
    throw new HttpError(404, "Álbum indisponível.");
  return a;
}
export async function setGrant(album: Album) {
  (await cookies()).set(`ma_album_${album.id}`, grantToken(album), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 86400,
    path: "/",
  });
}
export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin || origin !== new URL(process.env.APP_URL || req.url).origin)
    throw new HttpError(403, "Pedido não autorizado.");
}
export async function rateLimit(
  req: Request,
  scope: string,
  limit: number,
  seconds = 60,
) {
  const ip =
    process.env.TRUST_PROXY === "1"
      ? req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown"
      : "local";
  const window = Math.floor(Date.now() / (seconds * 1000));
  const key = hash(`${scope}:${ip}:${window}`);
  const row = await db.rateBucket.upsert({
    where: { key },
    create: { key, expiresAt: new Date((window + 1) * seconds * 1000) },
    update: { hits: { increment: 1 } },
  });
  if (row.hits > limit)
    throw new HttpError(
      429,
      "Demasiados pedidos. Tente novamente dentro de alguns minutos.",
    );
}
export async function login(email: string, password: string) {
  const user = await db.admin.findUnique({
    where: { email: email.toLowerCase() },
  });
  // Execute sempre uma derivação, mesmo quando a conta não existe.
  const dummy = "00000000000000000000000000000000:" + "00".repeat(64);
  if (!(await passwordMatches(password, user?.passwordHash ?? dummy)) || !user)
    throw new HttpError(401, "E-mail ou palavra-passe incorretos.");
  const token = randomBytes(32).toString("base64url");
  await db.session.create({
    data: {
      id: hash(token),
      adminId: user.id,
      expiresAt: new Date(Date.now() + 8 * 3600000),
    },
  });
  (await cookies()).set("ma_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 8 * 3600,
    path: "/",
  });
}
export async function logout() {
  const jar = await cookies();
  const token = jar.get("ma_session")?.value;
  if (token) await db.session.deleteMany({ where: { id: hash(token) } });
  jar.delete("ma_session");
}
````

## src/lib/storage.ts

````typescript
import { createReadStream } from "node:fs";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
const driver = process.env.STORAGE_DRIVER || "local";
const base = path.resolve(
  /* turbopackIgnore: true */ process.env.LOCAL_STORAGE_PATH || "data/media",
);
const client = new S3Client({
  region: process.env.S3_REGION || "auto",
  endpoint: process.env.S3_ENDPOINT || undefined,
  forcePathStyle: true,
  credentials: process.env.S3_ACCESS_KEY_ID
    ? {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
      }
    : undefined,
});
function local(key: string) {
  const p = path.resolve(/* turbopackIgnore: true */ base, key);
  if (!p.startsWith(base + path.sep)) throw new Error("Chave inválida");
  return p;
}
export async function put(key: string, body: Buffer, type: string) {
  if (driver === "s3") {
    await client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: body,
        ContentType: type,
      }),
    );
  } else {
    const p = local(key);
    await mkdir(path.dirname(p), { recursive: true });
    await writeFile(p, body);
  }
}
export async function remove(key: string) {
  if (driver === "s3")
    await client.send(
      new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }),
    );
  else
    await unlink(local(key)).catch((e) => {
      if (e.code !== "ENOENT") throw e;
    });
}
export async function read(key: string): Promise<Readable> {
  if (driver === "s3") {
    const result = await client.send(
      new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }),
    );
    return result.Body as Readable;
  }
  return createReadStream(local(key));
}
export async function signedOriginal(key: string, disposition: string) {
  if (driver !== "s3") return null;
  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      ResponseContentDisposition: disposition,
    }),
    { expiresIn: 60 },
  );
}
export const webStream = (stream: Readable) =>
  Readable.toWeb(stream) as ReadableStream<Uint8Array>;
````

## src/lib/types.ts

````typescript
export type PhotoView = {
  id: string;
  categoryId: string;
  alt: string;
  width: number;
  height: number;
  featured: boolean;
  src: string;
  large: string;
  srcSet: string;
};
export type AlbumView = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  eventDate: string;
  theme: "AUTO" | "LIGHT" | "DARK";
  coverPhotoId: string | null;
  categories: {
    id: string;
    name: string;
    order: number;
    coverPhotoId: string | null;
  }[];
  photos: PhotoView[];
};
````

## src/lib/zip.ts

````typescript
import archiver from "archiver";
import { once } from "node:events";
import { PassThrough } from "node:stream";
import { db } from "./db";
import { read, webStream } from "./storage";
import { safeName } from "./errors";
export function streamZip(
  job: { id: string; albumId: string; categoryId: string | null },
  signal: AbortSignal,
) {
  const output = new PassThrough({ highWaterMark: 64 * 1024 });
  const archive = archiver("zip", {
    store: true,
    forceZip64: true,
    highWaterMark: 64 * 1024,
  });
  let aborted = false;
  let active: import("node:stream").Readable | undefined;
  const stop = () => {
    aborted = true;
    active?.destroy();
    archive.abort();
    output.destroy();
  };
  signal.addEventListener("abort", stop, { once: true });
  archive.on("error", (e) => output.destroy(e));
  output.on("error", () => {});
  output.on("close", () => {
    if (!output.writableFinished) stop();
  });
  archive.pipe(output);
  // Produção sequencial: um original em leitura, sem carregar o álbum na memória.
  void (async () => {
    try {
      const categories = await db.category.findMany({
        where: { albumId: job.albumId },
        select: { id: true, name: true },
      });
      const names = new Map(
        categories.map((c) => [c.id, `${safeName(c.name)}-${c.id.slice(-6)}`]),
      );
      let cursor: string | undefined,
        completed = 0;
      while (!aborted) {
        const batch = await db.photo.findMany({
          where: {
            albumId: job.albumId,
            ...(job.categoryId ? { categoryId: job.categoryId } : {}),
          },
          orderBy: { id: "asc" },
          take: 50,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });
        if (!batch.length) break;
        for (const photo of batch) {
          if (aborted) break;
          active = await read(photo.originalKey);
          const done = once(archive, "entry");
          active.once("error", (e) => archive.emit("error", e));
          archive.append(active, {
            name: `${names.get(photo.categoryId)}/${photo.id}.${photo.extension}`,
          });
          await done;
          completed++;
          await db.zipJob.update({
            where: { id: job.id },
            data: { completed },
          });
        }
        cursor = batch.at(-1)!.id;
      }
      if (aborted) throw new Error("Download interrompido");
      await archive.finalize();
      await db.zipJob.update({
        where: { id: job.id },
        data: { status: "DONE" },
      });
      await db.downloadLog.create({
        data: { albumId: job.albumId, categoryId: job.categoryId, type: "ZIP" },
      });
    } catch (e) {
      archive.abort();
      output.destroy(e instanceof Error ? e : new Error("Erro ZIP"));
      await db.zipJob
        .update({
          where: { id: job.id },
          data: {
            status: aborted ? "CANCELLED" : "ERROR",
            error: aborted
              ? "Download interrompido."
              : "Não foi possível gerar o ZIP.",
          },
        })
        .catch(() => {});
    } finally {
      signal.removeEventListener("abort", stop);
    }
  })();
  return webStream(output);
}
````

## tests/e2e/album.spec.ts

````typescript
import { test, expect } from "@playwright/test";
test("capa, categorias, galeria, navegação circular e foco", async ({
  page,
}) => {
  await page.goto("/a/graduacao-2026");
  await expect(
    page.getByRole("heading", { name: "Graduação das Gêmeas 2026" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Ver álbum", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Categorias", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Todas as fotos,/ }).click();
  const thumbnails = page.locator('button[aria-label^="Ampliar"]');
  const total = await thumbnails.count();
  expect(total).toBeGreaterThanOrEqual(92);
  await thumbnails.first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(`1 / ${total}`, { exact: true })).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect(
    dialog.getByText(`${total} / ${total}`, { exact: true }),
  ).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(dialog.getByText(`1 / ${total}`, { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(thumbnails.first()).toBeFocused();
});
test("tema e acesso reservado", async ({ page }) => {
  await page.goto("/a/graduacao-2026");
  await page
    .getByRole("combobox", { name: "Tema", exact: true })
    .selectOption("DARK");
  await expect(page.locator('[data-theme="dark"]')).toBeVisible();
  await page.goto("/a/nao-existe");
  await expect(
    page.getByRole("heading", { name: "Álbum indisponível." }),
  ).toBeVisible();
  await page.goto("/admin");
  await expect(
    page.getByRole("button", { name: "Iniciar sessão" }),
  ).toBeVisible();
});

test("download original, partilha por link e gesto horizontal", async ({
  page,
}) => {
  await page.goto("/a/graduacao-2026");
  await page.getByRole("button", { name: /Todas as fotos,/ }).click();
  await page.locator('button[aria-label^="Ampliar"]').first().click();
  const dialog = page.getByRole("dialog");
  const downloaded = page.waitForEvent("download");
  await dialog.getByRole("link", { name: "Baixar foto" }).click();
  const file = await downloaded;
  expect(file.suggestedFilename()).toMatch(/graduacao-2026.*\.jpg$/);
  expect(await file.failure()).toBeNull();
  await page.evaluate(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          (window as unknown as { copied: string }).copied = text;
        },
      },
    });
  });
  await dialog.getByRole("button", { name: "Partilhar", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Link copiado." }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => (window as unknown as { copied: string }).copied),
  ).toContain("photo=");
  const stage = dialog
    .locator("div")
    .filter({ has: page.locator("img") })
    .last();
  await stage.evaluate((element) => {
    const start=new Event("touchstart",{bubbles:true});
    Object.defineProperty(start,"touches",{value:[{clientX:200,clientY:200}]});
    element.dispatchEvent(start);
    const end=new Event("touchend",{bubbles:true});
    Object.defineProperty(end,"changedTouches",{value:[{clientX:100,clientY:202}]});
    element.dispatchEvent(end);
  });
  await expect(dialog.getByText("2 / 92", { exact: true })).toBeVisible();
});
````

## tests/security.test.ts

````typescript
import { test } from "node:test";
import assert from "node:assert/strict";
import { hash, passwordHash, passwordMatches } from "../src/lib/security";
import { attachment, safeName } from "../src/lib/errors";
import { processImage } from "../src/lib/images";
test("palavras-passe com salt e comparação segura", async () => {
  const a = await passwordHash("uma-palavra-passe-longa");
  const b = await passwordHash("uma-palavra-passe-longa");
  assert.notEqual(a, b);
  assert.equal(await passwordMatches("uma-palavra-passe-longa", a), true);
  assert.equal(await passwordMatches("outra-palavra-passe", a), false);
});
test("nomes ZIP não permitem caminhos ou cabeçalhos injetados", () => {
  assert.equal(safeName("../../Família\r\n"), "Familia");
  assert.ok(!attachment("foto\r\nInjected.jpg").includes("\r"));
  assert.equal(hash("segredo").length, 64);
});
test("uploads falsos e vazios são rejeitados", async () => {
  await assert.rejects(() =>
    processImage(Buffer.from("<svg>malicioso</svg>"), "test"),
  );
  await assert.rejects(() => processImage(Buffer.alloc(0), "test"));
});
````

## tsconfig.json

````json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts"
  ],
  "exclude": ["node_modules"]
}
````
