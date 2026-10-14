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
