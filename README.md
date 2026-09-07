# SocialMetaCollector

Painel centralizado de analytics para redes sociais — coleta, agrega e exibe métricas de YouTube, Instagram, Facebook, TikTok e X/Twitter em uma interface única.

---

## Motivação

Gerenciar múltiplas redes sociais significa alternar entre apps, planilhas e painéis distintos para entender o desempenho do seu conteúdo. O **SocialMetaCollector** resolve isso: um único painel, atualizado automaticamente, com dados de todas as plataformas — seguidores, visualizações, engajamento e tendências ao longo do tempo.

---

## Funcionalidades

- Dashboard com métricas agregadas e gráficos por plataforma
- Páginas individuais: YouTube, Instagram, Facebook
- Gerenciador de conexões OAuth2 por plataforma
- Página de relatórios com gráficos de linha, barra e pizza (com abas)
- Buscador universal de metadados via URL com histórico
- Autenticação de usuários (registro + login com JWT)
- Sincronização assíncrona via fila de jobs (BullMQ + Redis)
- Cache de respostas do dashboard com Redis (TTL configurável)
- Webhooks para eventos Meta (Facebook / Instagram)
- Modo escuro / claro com paleta personalizada
- Criptografia AES-256-GCM para tokens OAuth armazenados

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React + Vite)                   │
│   Dashboard │ Reports │ Fetch │ Connections │ Login              │
│   Space Grotesk + Inter  │  Recharts  │  TanStack Query          │
└───────────────────────────────┬─────────────────────────────────┘
                                │ HTTP / REST
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend (Express + TypeScript)                 │
│                                                                  │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────┐  │
│  │  /auth   │  │  /dashboard  │  │  /metadata   │  │/webhooks│ │
│  │ JWT/bcrypt│  │ + Redis cache│  │  BullMQ queue│  │  Meta  │  │
│  └──────────┘  └──────┬───────┘  └──────┬───────┘  └────────┘  │
│                        │                 │                        │
│  ┌─────────────────────▼─────────────────▼──────────────────┐   │
│  │                   Services / Providers                    │   │
│  │   YouTubeProvider  │  MetaProvider (Facebook + Instagram) │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │   Security Layer                                         │    │
│  │   AES-256-GCM (tokens)  │  bcrypt (senhas)  │  JWT auth  │    │
│  └──────────────────────────────────────────────────────────┘    │
└───────┬────────────────────────┬────────────────────────────────┘
        │                        │
        ▼                        ▼
┌──────────────────┐    ┌────────────────────────┐
│    PostgreSQL    │    │        Redis           │
│  (Drizzle ORM)  │    │  cache + BullMQ queue  │
│  tokens (cript.)│    │  (graceful fallback)   │
│  usuários       │    └────────────────────────┘
│  metadados      │
└──────────────────┘
        │
        ▼
┌─────────────────────────────────────┐
│         APIs Externas               │
│   YouTube Data API v3               │
│   Meta Graph API (Facebook/Instagram│
└─────────────────────────────────────┘
```

---

## Fluxo OAuth 2.0 (Server-Side)

O fluxo é inteiramente gerenciado pelo backend — o frontend apenas redireciona o navegador para `/api/auth/{plataforma}/connect`.

```
Usuário               Frontend              Backend                    Plataforma (Google/Meta)
   │                     │                     │                              │
   │─ Clica "Conectar" ─▶│                     │                              │
   │                     │── window.location ──▶│                              │
   │                     │  /api/auth/*/connect │                              │
   │                     │                     │── 302 redirect ─────────────▶│
   │◀─────────────────────────────────────────── Tela de autorização          │
   │                                                                          │
   │─ Autoriza na plataforma ────────────────────────────────────────────────▶│
   │                                           │◀─ GET /api/auth/*/callback   │
   │                                           │   ?code=...&state=...        │
   │                                           │                              │
   │                                           │── POST troca code por token ▶│
   │                                           │◀─ { access_token,            │
   │                                           │     refresh_token,           │
   │                                           │     expires_in }             │
   │                                           │                              │
   │                                           │  encryptToken(access_token)  │
   │                                           │  salva criptografado no DB   │
   │                                           │                              │
   │◀────────── 302 redirect para /connections?oauth_status=success           │
```

### URIs de Redirecionamento (Callback)

Cada plataforma precisa registrar a respectiva URI nas configurações do app OAuth:

| Plataforma | URI de Callback |
|------------|-----------------|
| YouTube    | `https://{seu-dominio}/api/auth/youtube/callback` |
| Instagram  | `https://{seu-dominio}/api/auth/instagram/callback` |
| Facebook   | `https://{seu-dominio}/api/auth/facebook/callback` |

Use o endpoint `GET /api/auth/config` para obter as URIs exatas com o domínio atual.

### Configuração no Google Cloud Console (YouTube)

1. Acesse [console.cloud.google.com](https://console.cloud.google.com)
2. Crie um projeto (ou selecione um existente)
3. Ative a **YouTube Data API v3** em "APIs e serviços" > "Biblioteca"
4. Configure a **Tela de consentimento OAuth** em "APIs e serviços" > "Tela de consentimento"
   - Tipo: Externo
   - Adicione seu e-mail como **usuário de teste** se o app estiver em modo "Teste"
5. Crie credenciais em "APIs e serviços" > "Credenciais" > "Criar credenciais" > "ID do cliente OAuth"
   - Tipo: **Aplicativo da Web**
   - Adicione a URI de redirecionamento autorizada: copie do endpoint `/api/auth/config`
6. Copie o **Client ID** e **Client Secret** e salve como variáveis de ambiente

### Configuração no Meta Developer Portal (Instagram/Facebook)

1. Acesse [developers.facebook.com](https://developers.facebook.com)
2. Crie um app do tipo "Consumidor" ou "Negócios"
3. Adicione os produtos **Login do Instagram** e **Login do Facebook**
4. Em cada produto, adicione a URI de redirecionamento correspondente
5. Copie o **App ID** (Client ID) e a **Chave Secreta** (Client Secret)

---

## Segurança

| Camada | Medida |
|--------|--------|
| Senhas | bcrypt com 12 rounds de salt |
| Tokens OAuth | AES-256-GCM (chave de 256 bits de `TOKEN_SECRET`) |
| Autenticação | JWT HS256 com expiração configurável (`JWT_EXPIRES_IN`) |
| SQL | Drizzle ORM — queries 100% parametrizadas (sem concatenação manual) |
| Validação de entrada | Zod em todos os endpoints com mensagens de erro claras |
| Secrets | Nunca versionados — carregados apenas via variáveis de ambiente |
| Webhooks | Validação de assinatura HMAC-SHA256 com `META_APP_SECRET` |
| Privilégios de banco | Configure o usuário do banco com permissões mínimas (apenas `SELECT`, `INSERT`, `UPDATE`, `DELETE` nas tabelas da aplicação) |

---

## Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `DATABASE_URL` | Sim | URL de conexão PostgreSQL |
| `JWT_SECRET` | Sim | Segredo de assinatura JWT (mín. 32 chars) |
| `TOKEN_SECRET` | Sim | Chave AES-256-GCM em hex (64 chars = 32 bytes) |
| `APP_BASE_URL` | Sim em produção | Origem pública da aplicação usada nos callbacks OAuth (ex: `https://app.example.com`) |
| `YOUTUBE_CLIENT_ID` | Sim* | Client ID do Google OAuth 2.0 (YouTube) |
| `YOUTUBE_CLIENT_SECRET` | Sim* | Client Secret do Google OAuth 2.0 (YouTube) |
| `INSTAGRAM_CLIENT_ID` | Sim* | App ID do Meta (Instagram OAuth) |
| `INSTAGRAM_CLIENT_SECRET` | Sim* | App Secret do Meta (Instagram OAuth) |
| `FACEBOOK_CLIENT_ID` | Sim* | App ID do Meta (Facebook OAuth) |
| `FACEBOOK_CLIENT_SECRET` | Sim* | App Secret do Meta (Facebook OAuth) |
| `REDIS_URL` | Não | URL Redis para cache e fila (ex: `redis://localhost:6379`) |
| `JWT_EXPIRES_IN` | Não | Expiração do JWT (padrão: `1h`) |
| `CACHE_TTL_SECONDS` | Não | TTL do cache Redis em segundos (padrão: `60`) |
| `META_APP_SECRET` | Não | App Secret do Meta para validar assinatura de webhooks |
| `META_WEBHOOK_VERIFY_TOKEN` | Não | Token de verificação do webhook Meta |

\* Obrigatória para ativar o OAuth da plataforma correspondente. As plataformas sem credenciais ficam desabilitadas mas não afetam as demais.

**Nota:** sem `REDIS_URL`, o cache e as filas ficam desabilitados — a sincronização ocorre de forma síncrona e o cache é pulado. O sistema opera normalmente.

---

## Stack Técnica

**Backend**
- Node.js + TypeScript + Express
- Drizzle ORM + PostgreSQL
- BullMQ + Redis (fila assíncrona, optional)
- jsonwebtoken + bcrypt
- Zod (validação de entrada)
- axios (chamadas às APIs externas)

**Frontend**
- React 18 + Vite + TypeScript
- Tailwind CSS v4
- Recharts (gráficos interativos)
- Wouter (roteamento SPA)
- TanStack Query (cache de estado remoto)

**Segurança**
- AES-256-GCM (tokens OAuth2)
- JWT HS256 (autenticação de usuários)
- bcrypt (hashing de senhas)

---

## Instalação Local

```bash
# 1. Clone o repositório
git clone <repo-url>
cd social-meta-collector

# 2. Instale dependências
pnpm install

# 3. Configure variáveis de ambiente no shell ou em um arquivo .env não versionado
#    Defina DATABASE_URL, JWT_SECRET, TOKEN_SECRET e APP_BASE_URL

# 4. Crie as tabelas no banco
pnpm --filter @workspace/db run push

# 5. Inicie os serviços
pnpm --filter @workspace/api-server run dev       # Backend :8080
pnpm --filter @workspace/social-meta-collector run dev  # Frontend :5173
```

---

## Endpoints Principais

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| `POST` | `/api/auth/register` | Cadastro de usuário | Não |
| `POST` | `/api/auth/login` | Login e emissão de JWT | Não |
| `GET` | `/api/auth/me` | Dados do usuário autenticado | JWT |
| `GET` | `/api/auth/status` | Status de conexão por plataforma | Não |
| `GET` | `/api/auth/config` | URIs de callback OAuth e status de configuração | Não |
| `GET` | `/api/auth/youtube/connect` | Inicia fluxo OAuth YouTube (redirect) | Não |
| `GET` | `/api/auth/youtube/callback` | Callback OAuth YouTube (recebe code) | Não |
| `GET` | `/api/auth/instagram/connect` | Inicia fluxo OAuth Instagram (redirect) | Não |
| `GET` | `/api/auth/instagram/callback` | Callback OAuth Instagram (recebe code) | Não |
| `GET` | `/api/auth/facebook/connect` | Inicia fluxo OAuth Facebook (redirect) | Não |
| `GET` | `/api/auth/facebook/callback` | Callback OAuth Facebook (recebe code) | Não |
| `POST` | `/api/auth/{platform}/disconnect` | Desconectar plataforma | Não |
| `GET` | `/api/dashboard/summary` | Resumo agregado (com cache Redis) | Opcional |
| `GET` | `/api/dashboard/recent-metadata` | Últimos metadados coletados | Opcional |
| `GET` | `/api/dashboard/engagement-trends` | Tendências de engajamento | Opcional |
| `POST` | `/api/metadata/sync` | Sincroniza plataformas via fila | Opcional |
| `GET` | `/api/webhooks/meta` | Verificação de webhook Meta | Não |
| `POST` | `/api/webhooks/meta` | Recebe eventos Meta | Assinatura HMAC |
| `GET` | `/api/fetch-metadata` | Busca metadados por URL | Não |

---

## Testing

The repo has a three-tier Vitest stack (~40/40/20 unit/integration/e2e) plus a
Playwright black-box suite at the repo root.

```bash
# Vitest tiers (per project)
pnpm --filter @workspace/api-server run test:unit         # ~7 specs, no IO
pnpm --filter @workspace/api-server run test:integration  # ~12 specs, mocked db
pnpm --filter @workspace/api-server run test:e2e          # ~3 multi-route flows

# Schema regression on the shared db package
pnpm --filter @workspace/db test

# Browser-driven E2E (requires `playwright install` once)
pnpm --filter @workspace/playwright-e2e exec playwright install --with-deps chromium
pnpm --filter @workspace/playwright-e2e test

# Convenience aliases at the repo root
pnpm test            # all vitest tiers
pnpm test:unit
pnpm test:integration
pnpm test:e2e
pnpm test:browser    # playwright
```

The two invariants the suite is designed to protect:

1. **OAuth tokens are never persisted in plaintext** — the AES-256-GCM helpers
   are asserted to roundtrip, fail closed on tampered ciphertext, and refuse a
   wrong-length key.
2. **Redis is optional, never load-bearing** — `cacheGet`/`cacheSet`/`cacheDel`
   swallow every error path, and the dashboard route returns a full payload
   when `REDIS_URL` is unset.

See [`TESTING.md`](./TESTING.md) for the full file inventory, conventions,
mocking patterns, and instructions for adding a new test.

---

## Paleta de Design

| Papel | Cor | Hex |
|-------|-----|-----|
| Fundo navbar / sidebar | Azul petróleo | `#1E2A38` |
| Acento primário | Roxo profundo | `#6C63FF` |
| Fundo escuro | Cinza escuro | `#2C2C2C` |
| Texto secundário | Cinza claro | `#E0E0E0` |
| Sucesso | Verde | `#4CAF50` |
| Alerta | Vermelho | `#F44336` |
| Acento rosa | Rosa suave | `#FF6F91` |
| YouTube | Vermelho | `#FF0000` |
| Instagram | Rosa | `#FF6F91` |
| Facebook | Azul | `#1877F2` |

**Tipografia:** Space Grotesk (títulos/bold) + Inter (corpo/regular)
