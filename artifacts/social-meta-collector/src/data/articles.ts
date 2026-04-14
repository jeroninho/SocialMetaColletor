export interface Article {
  id: string;
  title: string;
  description: string;
  category: "oauth" | "security" | "best-practices";
  readTime: string;
  content: string;
}

export const categoryLabels: Record<string, string> = {
  oauth: "OAuth 2.0",
  security: "Segurança",
  "best-practices": "Boas Práticas",
};

export const articles: Article[] = [
  {
    id: "oauth2-fundamentos",
    title: "Fundamentos do OAuth 2.0 para APIs Sociais",
    description: "Entenda como funciona o protocolo OAuth 2.0 e como ele é usado para autenticação segura com plataformas como Facebook, Instagram e YouTube.",
    category: "oauth",
    readTime: "8 min",
    content: `## O que é OAuth 2.0?

OAuth 2.0 é o protocolo padrão da indústria para **autorização**. Ele permite que aplicações de terceiros obtenham acesso limitado a um serviço HTTP, seja em nome de um proprietário de recurso ou permitindo que a aplicação obtenha acesso por conta própria.

## Por que OAuth 2.0 é importante?

Antes do OAuth, os usuários precisavam compartilhar suas credenciais (login e senha) diretamente com aplicações de terceiros. Isso representava um risco enorme de segurança. Com OAuth 2.0:

- O usuário **nunca compartilha** sua senha com o aplicativo
- O aplicativo recebe um **token de acesso** com permissões limitadas
- O token pode ser **revogado** a qualquer momento
- Diferentes **escopos** controlam o que o aplicativo pode acessar

## Fluxo de Autorização (Authorization Code)

O fluxo mais comum para aplicações web:

\`\`\`
1. Usuário clica em "Conectar com Facebook"
2. Redirecionamento para a página de login do Facebook
3. Usuário autoriza as permissões solicitadas
4. Facebook redireciona de volta com um "authorization code"
5. Seu servidor troca o code por um access_token
6. Access token é usado para acessar a API
\`\`\`

### Exemplo de URL de autorização:

\`\`\`javascript
const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
authUrl.searchParams.set('client_id', CLIENT_ID);
authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/youtube.readonly');
authUrl.searchParams.set('access_type', 'offline');
\`\`\`

### Trocando o code pelo token:

\`\`\`python
import requests

response = requests.post('https://oauth2.googleapis.com/token', data={
    'client_id': CLIENT_ID,
    'client_secret': CLIENT_SECRET,
    'code': authorization_code,
    'grant_type': 'authorization_code',
    'redirect_uri': REDIRECT_URI,
})

token_data = response.json()
access_token = token_data['access_token']
refresh_token = token_data.get('refresh_token')
\`\`\`

## Tipos de Tokens

| Token | Descrição | Validade |
|-------|-----------|----------|
| Access Token | Usado para acessar recursos protegidos | Curta (1h geralmente) |
| Refresh Token | Usado para obter novos access tokens | Longa (meses/anos) |
| ID Token | Contém informações sobre o usuário (OpenID Connect) | Curta |

## Escopos Comuns por Plataforma

### YouTube Data API
- \`youtube.readonly\` — Visualizar conta e vídeos
- \`youtube.force-ssl\` — Gerenciar conta

### Facebook Graph API
- \`pages_read_engagement\` — Ler métricas de engajamento
- \`pages_show_list\` — Listar páginas gerenciadas
- \`instagram_basic\` — Acesso básico ao Instagram

## Dicas de Implementação

1. **Sempre use HTTPS** — Tokens devem ser transmitidos apenas por conexões seguras
2. **Armazene tokens de forma segura** — Nunca no frontend ou em logs
3. **Implemente refresh automático** — Renove tokens antes de expirarem
4. **Solicite escopos mínimos** — Peça apenas as permissões necessárias
`,
  },
  {
    id: "seguranca-tokens",
    title: "Segurança de Tokens: Armazenamento e Boas Práticas",
    description: "Aprenda a proteger access tokens e refresh tokens contra vazamentos, ataques XSS e CSRF em sua aplicação.",
    category: "security",
    readTime: "10 min",
    content: `## A importância da segurança de tokens

Tokens de acesso são como chaves para os dados dos seus usuários. Um token vazado pode permitir que atacantes:

- Acessem dados privados do usuário
- Publiquem conteúdo em nome do usuário
- Modifiquem configurações de conta
- Causem danos à reputação da sua plataforma

## Onde NÃO armazenar tokens

### ❌ localStorage / sessionStorage

\`\`\`javascript
// NUNCA faça isso!
localStorage.setItem('access_token', token);
\`\`\`

**Problema**: Vulnerável a ataques **XSS** (Cross-Site Scripting). Qualquer script malicioso injetado na página pode ler o localStorage.

### ❌ URL / Query Parameters

\`\`\`
// NUNCA faça isso!
https://api.exemplo.com/data?token=abc123
\`\`\`

**Problema**: URLs ficam em logs de servidor, histórico do navegador e podem ser compartilhadas acidentalmente.

### ❌ Código-fonte / Repositório

\`\`\`python
# NUNCA faça isso!
ACCESS_TOKEN = "sk_live_abc123def456"
\`\`\`

**Problema**: Qualquer pessoa com acesso ao repositório obtém o token.

## Onde armazenar tokens com segurança

### ✅ Cookies HttpOnly (recomendado para web)

\`\`\`javascript
// Servidor (Express.js)
res.cookie('access_token', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 3600000,
  path: '/',
});
\`\`\`

**Vantagens**:
- Não acessível via JavaScript (protege contra XSS)
- Enviado automaticamente em requisições
- \`sameSite\` protege contra CSRF

### ✅ Variáveis de ambiente (para secrets do servidor)

\`\`\`bash
# .env (nunca commite este arquivo!)
FACEBOOK_APP_SECRET=abc123
GOOGLE_CLIENT_SECRET=xyz789
\`\`\`

### ✅ Banco de dados criptografado

\`\`\`python
from cryptography.fernet import Fernet

cipher = Fernet(ENCRYPTION_KEY)
encrypted_token = cipher.encrypt(token.encode())

# Armazenar encrypted_token no banco de dados
\`\`\`

## Proteção contra ataques comuns

### CSRF (Cross-Site Request Forgery)

Use o parâmetro \`state\` no fluxo OAuth:

\`\`\`javascript
const state = crypto.randomUUID();
session.oauthState = state;

const authUrl = \`https://accounts.google.com/o/oauth2/v2/auth?state=\${state}&...\`;

// No callback, valide o state
if (req.query.state !== session.oauthState) {
  throw new Error('CSRF detectado!');
}
\`\`\`

### Token Rotation

Implemente rotação de refresh tokens:

\`\`\`javascript
async function refreshAccessToken(refreshToken) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });

  const data = await response.json();
  // Salvar o novo refresh_token se fornecido
  if (data.refresh_token) {
    await saveRefreshToken(userId, data.refresh_token);
  }
  return data.access_token;
}
\`\`\`

## Checklist de Segurança

- [ ] Tokens armazenados em cookies HttpOnly
- [ ] HTTPS em todas as comunicações
- [ ] Validação do parâmetro \`state\` no OAuth
- [ ] Refresh tokens com rotação ativa
- [ ] Secrets em variáveis de ambiente
- [ ] Logs não contêm tokens
- [ ] Tokens expirados são removidos
- [ ] Rate limiting implementado
`,
  },
  {
    id: "boas-praticas-apis-sociais",
    title: "Boas Práticas para Integração com APIs Sociais",
    description: "Guia completo de boas práticas para trabalhar com APIs do YouTube, Instagram e Facebook, incluindo rate limiting, cache e tratamento de erros.",
    category: "best-practices",
    readTime: "12 min",
    content: `## Introdução

Integrar com APIs de redes sociais exige cuidado com limites de requisição, tratamento de erros e otimização de performance. Este guia reúne as melhores práticas aprendidas na prática.

## 1. Respeite os Rate Limits

Cada plataforma tem seus próprios limites:

| Plataforma | Limite | Janela |
|-----------|--------|--------|
| YouTube Data API | 10.000 unidades/dia | 24h |
| Facebook Graph API | 200 chamadas/hora/usuário | 1h |
| Instagram Basic API | 200 chamadas/hora | 1h |

### Implementando retry com backoff exponencial:

\`\`\`javascript
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url, options);

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const delay = retryAfter
        ? parseInt(retryAfter) * 1000
        : Math.pow(2, attempt) * 1000;

      console.log(\`Rate limited. Aguardando \${delay}ms...\`);
      await new Promise(resolve => setTimeout(resolve, delay));
      continue;
    }

    if (!response.ok) {
      throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
    }

    return response.json();
  }

  throw new Error('Máximo de tentativas atingido');
}
\`\`\`

## 2. Implemente Cache Inteligente

APIs sociais não precisam ser consultadas em tempo real para a maioria dos casos:

\`\`\`python
import redis
import json
from datetime import timedelta

cache = redis.Redis()

def get_youtube_stats(channel_id):
    cache_key = f"youtube:stats:{channel_id}"

    # Tenta buscar do cache
    cached = cache.get(cache_key)
    if cached:
        return json.loads(cached)

    # Busca da API
    stats = youtube_api.channels().list(
        id=channel_id,
        part='statistics'
    ).execute()

    # Salva no cache por 15 minutos
    cache.setex(
        cache_key,
        timedelta(minutes=15),
        json.dumps(stats)
    )

    return stats
\`\`\`

### Estratégias de cache por tipo de dado:

| Tipo de Dado | TTL Recomendado | Justificativa |
|-------------|----------------|---------------|
| Perfil/Canal | 1 hora | Muda raramente |
| Métricas gerais | 15 minutos | Atualização moderada |
| Posts recentes | 5 minutos | Atualização frequente |
| Comentários | 2 minutos | Tempo real importante |

## 3. Tratamento de Erros Robusto

\`\`\`javascript
class SocialAPIError extends Error {
  constructor(platform, statusCode, message, retryable = false) {
    super(\`[\${platform}] \${message}\`);
    this.platform = platform;
    this.statusCode = statusCode;
    this.retryable = retryable;
  }
}

async function handleAPIResponse(platform, response) {
  if (response.ok) return response.json();

  const body = await response.text();

  switch (response.status) {
    case 401:
      throw new SocialAPIError(
        platform, 401,
        'Token expirado ou inválido. Reautenticação necessária.',
        false
      );
    case 403:
      throw new SocialAPIError(
        platform, 403,
        'Permissões insuficientes. Verifique os escopos.',
        false
      );
    case 429:
      throw new SocialAPIError(
        platform, 429,
        'Rate limit excedido.',
        true
      );
    default:
      throw new SocialAPIError(
        platform,
        response.status,
        \`Erro inesperado: \${body}\`,
        response.status >= 500
      );
  }
}
\`\`\`

## 4. Paginação Eficiente

A maioria das APIs sociais usa paginação baseada em cursor:

\`\`\`python
def fetch_all_posts(page_id, access_token):
    posts = []
    url = f"https://graph.facebook.com/v18.0/{page_id}/posts"
    params = {
        'access_token': access_token,
        'fields': 'id,message,created_time,insights',
        'limit': 100
    }

    while url:
        response = requests.get(url, params=params)
        data = response.json()

        posts.extend(data.get('data', []))

        # Próxima página via cursor
        paging = data.get('paging', {})
        url = paging.get('next')
        params = {}  # URL completa já inclui params

    return posts
\`\`\`

## 5. Webhooks vs Polling

Sempre que possível, prefira **webhooks** a polling:

| Aspecto | Polling | Webhooks |
|---------|---------|----------|
| Latência | Alta (depende do intervalo) | Baixa (tempo real) |
| Consumo de API | Alto | Baixo |
| Complexidade | Baixa | Média |
| Confiabilidade | Alta | Requer retry logic |

## 6. Monitoramento e Alertas

\`\`\`javascript
const metrics = {
  apiCalls: new Map(),
  errors: new Map(),

  trackCall(platform) {
    const key = \`\${platform}:\${new Date().toISOString().slice(0,13)}\`;
    this.apiCalls.set(key, (this.apiCalls.get(key) || 0) + 1);
  },

  trackError(platform, statusCode) {
    const key = \`\${platform}:\${statusCode}\`;
    this.errors.set(key, (this.errors.get(key) || 0) + 1);
  },

  getUsageReport() {
    return {
      totalCalls: [...this.apiCalls.values()].reduce((a, b) => a + b, 0),
      errorRate: this.errors.size / Math.max(this.apiCalls.size, 1),
      topErrors: [...this.errors.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
    };
  },
};
\`\`\`

## Resumo

1. **Rate limits**: Implemente retry com backoff exponencial
2. **Cache**: Use TTL apropriado por tipo de dado
3. **Erros**: Classifique e trate de forma granular
4. **Paginação**: Use cursores quando disponível
5. **Webhooks**: Prefira a polling quando possível
6. **Monitoramento**: Acompanhe uso e erros proativamente
`,
  },
];
