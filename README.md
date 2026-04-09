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

## Fluxo OAuth2

```
Usuário               Backend                 Plataforma (ex: YouTube)
   │                     │                              │
   │─ Clica "Conectar" ─▶│                              │
   │                     │── Authorization URL ────────▶│
   │◀──────────────────── redirect para plataforma       │
   │                                                     │
   │─ Autoriza ──────────────────────────────────────── │
   │◀─ Authorization Code ───────────────────────────── │
   │                     │                              │
   │─ POST /auth/*/connect ▶                            │
   │   { code }          │─ troca code por tokens ─────▶│
   │                     │◀─ { access_token,            │
   │                     │     refresh_token,           │
   │                     │     expires_in }             │
   │                     │                              │
   │                     │  encryptToken(access_token)  │
   │                     │  ── AES-256-GCM (TOKEN_SECRET)│
   │                     │  salva criptografado no banco │
   │◀─ { success: true } │                              │
```

Quando o token expira, o refresh token é usado para obter um novo access token, que também é re-criptografado antes de persistir.

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
| `REDIS_URL` | Não | URL Redis para cache e fila (ex: `redis://localhost:6379`) |
| `JWT_EXPIRES_IN` | Não | Expiração do JWT (padrão: `1h`) |
| `CACHE_TTL_SECONDS` | Não | TTL do cache Redis em segundos (padrão: `60`) |
| `YOUTUBE_API_KEY` | Não | Chave da YouTube Data API v3 |
| `META_APP_SECRET` | Não | App Secret do Meta para validar assinatura de webhooks |
| `META_WEBHOOK_VERIFY_TOKEN` | Não | Token de verificação do webhook Meta |
| `INSTAGRAM_ACCESS_TOKEN` | Não | Token de acesso Instagram (Graph API) |

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

# 3. Configure variáveis de ambiente
#    Defina DATABASE_URL, JWT_SECRET, TOKEN_SECRET no painel de Secrets

# 4. Crie as tabelas no banco
pnpm --filter @workspace/db run push

# 5. Inicie os serviços
pnpm --filter @workspace/api-server run dev       # Backend :8080
pnpm --filter @workspace/social-meta-collector run dev  # Frontend
```

---

## Endpoints Principais

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| `POST` | `/api/auth/register` | Cadastro de usuário | Não |
| `POST` | `/api/auth/login` | Login e emissão de JWT | Não |
| `GET` | `/api/auth/me` | Dados do usuário autenticado | JWT |
| `GET` | `/api/auth/status` | Status de conexão por plataforma | Não |
| `POST` | `/api/auth/youtube/connect` | Conectar conta YouTube | Não |
| `POST` | `/api/auth/instagram/connect` | Conectar conta Instagram | Não |
| `POST` | `/api/auth/facebook/connect` | Conectar conta Facebook | Não |
| `GET` | `/api/dashboard/summary` | Resumo agregado (com cache Redis) | Opcional |
| `GET` | `/api/dashboard/recent-metadata` | Últimos metadados coletados | Opcional |
| `GET` | `/api/dashboard/engagement-trends` | Tendências de engajamento | Opcional |
| `POST` | `/api/metadata/sync` | Sincroniza plataformas via fila | Opcional |
| `GET` | `/api/webhooks/meta` | Verificação de webhook Meta | Não |
| `POST` | `/api/webhooks/meta` | Recebe eventos Meta | Assinatura HMAC |
| `GET` | `/api/fetch-metadata` | Busca metadados por URL | Não |

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
