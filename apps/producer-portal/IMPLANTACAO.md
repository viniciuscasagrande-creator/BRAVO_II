# Entrega separada — Vercel — 10/11/2026

Dois modos suportados de implantação na Vercel:

## Modo A — Repositórios separados (Root Directory `.`)
| Pacote | Root Directory na Vercel | Framework | Build |
|---|---|---|---|
| `FRONTEND_PRODUTOR` (`BRAVO_II_FRONTEND_PRODUTOR_VERCEL.zip`) | `.` | Next.js | `npm run build` |
| `BACKEND_BRAVO_II` (`BRAVO_II_BACKEND_VERCEL.zip`) | `.` | NestJS | `pnpm run build` |

## Modo B — Monorepo unificado `BRAVO_II` (Root Directory por pasta)
| Projeto Vercel | Root Directory na Vercel | Framework | Build (`vercel.json`) |
|---|---|---|---|
| **Portal do Produtor** | `apps/producer-portal` | Next.js | `cd ../.. && pnpm --filter @bravo-ii/contracts build && pnpm --filter @bravo-ii/producer-portal build` |
| **API BRAVO_II** | `apps/api` | Serverless / NestJS | `cd ../.. && pnpm run build:vercel:api` |
| **Backoffice BRAVO_II** | `apps/backoffice` | Next.js | `cd ../.. && pnpm run build:vercel:web` |

## Ordem de configuração (Preview / Homologação)
1. Integrar o backend com o Core atual e conferir o banco de homologação existente (`floral-sunset-85900211`).
2. Configurar as variáveis do Backend na Vercel (`DATABASE_URL`, `APP_ORIGIN`, `PRODUCER_PORTAL_ORIGIN`, `BRAVO_PROXY_KEY`, `COOKIE_SECURE=true`, `BRAVO_ENV=HOMOLOGACAO`).
3. Importar o projeto do Portal do Produtor na Vercel e obter sua URL Preview exata.
4. Backend: `PRODUCER_PORTAL_ORIGIN` recebe a URL HTTPS exata do frontend do produtor. Preservar `APP_ORIGIN` do backoffice.
5. Frontend do Produtor: `BRAVO_API_URL` recebe a URL HTTPS do backend e `PORTAL_PUBLIC_ORIGIN` recebe sua própria URL HTTPS. Usar a mesma `BRAVO_PROXY_KEY` nos servidores.
6. Reimplantar os projetos após ajustar as variáveis; validar login e consultas. Se a API usar Deployment Protection, configurar `BRAVO_API_VERCEL_BYPASS_TOKEN` no servidor do frontend.
