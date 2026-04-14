export interface CodeSnippet {
  language: "javascript" | "python" | "curl";
  label: string;
  code: string;
}

export interface GuideStep {
  id: number;
  title: string;
  description: string;
  snippets: CodeSnippet[];
}

export const guideSteps: GuideStep[] = [
  {
    id: 1,
    title: "Conectar uma API Social",
    description: "O primeiro passo é registrar sua aplicação no painel de desenvolvedor da plataforma desejada e obter as credenciais (Client ID e Client Secret). Depois, configure a URL de redirecionamento (callback) para receber o código de autorização.",
    snippets: [
      {
        language: "javascript",
        label: "JavaScript",
        code: `// Configuração inicial do cliente OAuth
const config = {
  clientId: process.env.FACEBOOK_APP_ID,
  clientSecret: process.env.FACEBOOK_APP_SECRET,
  redirectUri: 'https://seuapp.com/callback',
  scope: ['pages_read_engagement', 'pages_show_list'],
};

// Gerar URL de autorização
function getAuthorizationUrl() {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scope.join(','),
    response_type: 'code',
    state: crypto.randomUUID(), // Proteção CSRF
  });

  return \`https://www.facebook.com/v18.0/dialog/oauth?\${params}\`;
}

// Redirecionar o usuário
const authUrl = getAuthorizationUrl();
console.log('Acesse:', authUrl);`,
      },
      {
        language: "python",
        label: "Python",
        code: `import os
import uuid
from urllib.parse import urlencode

# Configuração inicial do cliente OAuth
config = {
    "client_id": os.environ["FACEBOOK_APP_ID"],
    "client_secret": os.environ["FACEBOOK_APP_SECRET"],
    "redirect_uri": "https://seuapp.com/callback",
    "scope": ["pages_read_engagement", "pages_show_list"],
}

# Gerar URL de autorização
def get_authorization_url():
    params = urlencode({
        "client_id": config["client_id"],
        "redirect_uri": config["redirect_uri"],
        "scope": ",".join(config["scope"]),
        "response_type": "code",
        "state": str(uuid.uuid4()),  # Proteção CSRF
    })
    return f"https://www.facebook.com/v18.0/dialog/oauth?{params}"

auth_url = get_authorization_url()
print(f"Acesse: {auth_url}")`,
      },
      {
        language: "curl",
        label: "cURL",
        code: `# A URL de autorização é acessada pelo navegador do usuário.
# Após autorizar, o usuário é redirecionado para o callback:
# https://seuapp.com/callback?code=AUTHORIZATION_CODE&state=STATE

# Exemplo de redirect recebido:
# GET /callback?code=AQDj8f...&state=abc-123

echo "Abra no navegador:"
echo "https://www.facebook.com/v18.0/dialog/oauth?\\
client_id=SEU_APP_ID&\\
redirect_uri=https://seuapp.com/callback&\\
scope=pages_read_engagement,pages_show_list&\\
response_type=code&\\
state=$(uuidgen)"`,
      },
    ],
  },
  {
    id: 2,
    title: "Autenticar via OAuth 2.0",
    description: "Após o usuário autorizar o acesso, a plataforma redireciona para sua callback URL com um código de autorização. Troque esse código por um access token fazendo uma requisição server-side.",
    snippets: [
      {
        language: "javascript",
        label: "JavaScript",
        code: `// Trocar o authorization code por um access token
async function exchangeCodeForToken(code) {
  const response = await fetch(
    'https://graph.facebook.com/v18.0/oauth/access_token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        redirect_uri: 'https://seuapp.com/callback',
        code: code,
      }),
    }
  );

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message);
  }

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
    tokenType: data.token_type,
  };
}

// Uso no callback handler
app.get('/callback', async (req, res) => {
  const { code, state } = req.query;

  // Validar state para prevenir CSRF
  if (state !== req.session.oauthState) {
    return res.status(403).send('Estado inválido');
  }

  const tokens = await exchangeCodeForToken(code);
  // Armazenar tokens de forma segura
  await saveTokens(req.user.id, tokens);

  res.redirect('/dashboard');
});`,
      },
      {
        language: "python",
        label: "Python",
        code: `import requests
from flask import Flask, request, redirect, session

app = Flask(__name__)

def exchange_code_for_token(code):
    """Trocar o authorization code por um access token."""
    response = requests.post(
        "https://graph.facebook.com/v18.0/oauth/access_token",
        json={
            "client_id": os.environ["FACEBOOK_APP_ID"],
            "client_secret": os.environ["FACEBOOK_APP_SECRET"],
            "redirect_uri": "https://seuapp.com/callback",
            "code": code,
        },
    )

    data = response.json()
    if "error" in data:
        raise Exception(data["error"]["message"])

    return {
        "access_token": data["access_token"],
        "expires_in": data["expires_in"],
        "token_type": data["token_type"],
    }

@app.route("/callback")
def oauth_callback():
    code = request.args.get("code")
    state = request.args.get("state")

    # Validar state para prevenir CSRF
    if state != session.get("oauth_state"):
        return "Estado inválido", 403

    tokens = exchange_code_for_token(code)
    save_tokens(current_user.id, tokens)

    return redirect("/dashboard")`,
      },
      {
        language: "curl",
        label: "cURL",
        code: `# Trocar o authorization code por um access token
curl -X POST "https://graph.facebook.com/v18.0/oauth/access_token" \\
  -H "Content-Type: application/json" \\
  -d '{
    "client_id": "SEU_APP_ID",
    "client_secret": "SEU_APP_SECRET",
    "redirect_uri": "https://seuapp.com/callback",
    "code": "AUTHORIZATION_CODE_RECEBIDO"
  }'

# Resposta esperada:
# {
#   "access_token": "EAAGm0PX4ZCps...",
#   "token_type": "bearer",
#   "expires_in": 5183944
# }

# Verificar se o token é válido
curl "https://graph.facebook.com/debug_token?\\
input_token=SEU_ACCESS_TOKEN&\\
access_token=SEU_APP_ID|SEU_APP_SECRET"`,
      },
    ],
  },
  {
    id: 3,
    title: "Buscar Metadados",
    description: "Com o access token em mãos, você pode acessar os dados da plataforma. Cada API tem seus próprios endpoints e formatos. Sempre especifique os campos desejados para otimizar a resposta.",
    snippets: [
      {
        language: "javascript",
        label: "JavaScript",
        code: `// Buscar métricas de uma página do Facebook
async function getPageInsights(pageId, accessToken) {
  const fields = [
    'name',
    'fan_count',
    'followers_count',
    'posts{message,created_time,likes.summary(true),comments.summary(true)}',
  ].join(',');

  const response = await fetch(
    \`https://graph.facebook.com/v18.0/\${pageId}?fields=\${fields}&access_token=\${accessToken}\`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(\`API Error: \${error.error.message}\`);
  }

  const data = await response.json();

  return {
    name: data.name,
    fans: data.fan_count,
    followers: data.followers_count,
    recentPosts: data.posts?.data?.map(post => ({
      message: post.message,
      date: post.created_time,
      likes: post.likes?.summary?.total_count || 0,
      comments: post.comments?.summary?.total_count || 0,
    })),
  };
}

// Uso
const insights = await getPageInsights('minha-pagina', accessToken);
console.log(\`Seguidores: \${insights.followers}\`);`,
      },
      {
        language: "python",
        label: "Python",
        code: `import requests

def get_page_insights(page_id, access_token):
    """Buscar métricas de uma página do Facebook."""
    fields = ",".join([
        "name",
        "fan_count",
        "followers_count",
        "posts{message,created_time,"
        "likes.summary(true),comments.summary(true)}",
    ])

    response = requests.get(
        f"https://graph.facebook.com/v18.0/{page_id}",
        params={
            "fields": fields,
            "access_token": access_token,
        },
    )
    response.raise_for_status()
    data = response.json()

    return {
        "name": data["name"],
        "fans": data["fan_count"],
        "followers": data["followers_count"],
        "recent_posts": [
            {
                "message": p.get("message", ""),
                "date": p["created_time"],
                "likes": p.get("likes", {})
                    .get("summary", {}).get("total_count", 0),
                "comments": p.get("comments", {})
                    .get("summary", {}).get("total_count", 0),
            }
            for p in data.get("posts", {}).get("data", [])
        ],
    }

insights = get_page_insights("minha-pagina", access_token)
print(f"Seguidores: {insights['followers']}")`,
      },
      {
        language: "curl",
        label: "cURL",
        code: `# Buscar métricas de uma página do Facebook
curl -G "https://graph.facebook.com/v18.0/PAGE_ID" \\
  --data-urlencode "fields=name,fan_count,followers_count,posts{message,created_time,likes.summary(true),comments.summary(true)}" \\
  --data-urlencode "access_token=SEU_ACCESS_TOKEN"

# Buscar estatísticas de um canal do YouTube
curl -G "https://www.googleapis.com/youtube/v3/channels" \\
  --data-urlencode "part=statistics,snippet" \\
  --data-urlencode "id=CHANNEL_ID" \\
  --data-urlencode "key=SUA_API_KEY"

# Buscar mídia do Instagram
curl -G "https://graph.instagram.com/me/media" \\
  --data-urlencode "fields=id,caption,media_type,timestamp,like_count" \\
  --data-urlencode "access_token=SEU_ACCESS_TOKEN"`,
      },
    ],
  },
  {
    id: 4,
    title: "Interpretar Métricas",
    description: "Após coletar os dados, é importante processá-los e calcular métricas significativas. Combine dados de diferentes plataformas para obter uma visão unificada do desempenho.",
    snippets: [
      {
        language: "javascript",
        label: "JavaScript",
        code: `// Calcular métricas de engajamento consolidadas
function calculateEngagementMetrics(posts) {
  if (!posts.length) return null;

  const totalLikes = posts.reduce((sum, p) => sum + p.likes, 0);
  const totalComments = posts.reduce((sum, p) => sum + p.comments, 0);
  const totalShares = posts.reduce((sum, p) => sum + (p.shares || 0), 0);

  const totalEngagement = totalLikes + totalComments + totalShares;
  const avgEngagement = totalEngagement / posts.length;

  // Taxa de engajamento (engagement por seguidor)
  const engagementRate = (totalEngagement / posts.length / followers) * 100;

  return {
    totalPosts: posts.length,
    totalEngagement,
    avgEngagementPerPost: Math.round(avgEngagement),
    engagementRate: engagementRate.toFixed(2) + '%',
    bestPost: posts.reduce((best, post) => {
      const score = post.likes + post.comments * 2;
      const bestScore = best.likes + best.comments * 2;
      return score > bestScore ? post : best;
    }),
    postingFrequency: calculateFrequency(posts),
  };
}

// Calcular frequência de postagem
function calculateFrequency(posts) {
  const dates = posts.map(p => new Date(p.date));
  const daysDiff = (Math.max(...dates) - Math.min(...dates))
    / (1000 * 60 * 60 * 24);
  return (posts.length / Math.max(daysDiff, 1)).toFixed(1) + ' posts/dia';
}

const metrics = calculateEngagementMetrics(allPosts);
console.log(\`Taxa de engajamento: \${metrics.engagementRate}\`);`,
      },
      {
        language: "python",
        label: "Python",
        code: `from datetime import datetime
from statistics import mean

def calculate_engagement_metrics(posts, followers):
    """Calcular métricas de engajamento consolidadas."""
    if not posts:
        return None

    total_likes = sum(p["likes"] for p in posts)
    total_comments = sum(p["comments"] for p in posts)
    total_shares = sum(p.get("shares", 0) for p in posts)

    total_engagement = total_likes + total_comments + total_shares
    avg_engagement = total_engagement / len(posts)

    # Taxa de engajamento (engagement por seguidor)
    engagement_rate = (avg_engagement / followers) * 100

    # Melhor post (comentários valem 2x)
    best_post = max(
        posts,
        key=lambda p: p["likes"] + p["comments"] * 2
    )

    # Frequência de postagem
    dates = [datetime.fromisoformat(p["date"]) for p in posts]
    days_diff = (max(dates) - min(dates)).days or 1
    frequency = len(posts) / days_diff

    return {
        "total_posts": len(posts),
        "total_engagement": total_engagement,
        "avg_per_post": round(avg_engagement),
        "engagement_rate": f"{engagement_rate:.2f}%",
        "best_post": best_post,
        "frequency": f"{frequency:.1f} posts/dia",
    }

metrics = calculate_engagement_metrics(all_posts, 10000)
print(f"Taxa de engajamento: {metrics['engagement_rate']}")`,
      },
      {
        language: "curl",
        label: "cURL",
        code: `# As métricas são calculadas no servidor, mas você pode
# buscar insights pré-calculados das plataformas:

# Facebook Page Insights (métricas pré-calculadas)
curl -G "https://graph.facebook.com/v18.0/PAGE_ID/insights" \\
  --data-urlencode "metric=page_engaged_users,page_impressions,page_fan_adds" \\
  --data-urlencode "period=day" \\
  --data-urlencode "since=2024-01-01" \\
  --data-urlencode "until=2024-01-31" \\
  --data-urlencode "access_token=SEU_ACCESS_TOKEN"

# YouTube Analytics
curl -G "https://youtubeanalytics.googleapis.com/v2/reports" \\
  -H "Authorization: Bearer SEU_ACCESS_TOKEN" \\
  --data-urlencode "ids=channel==MINE" \\
  --data-urlencode "startDate=2024-01-01" \\
  --data-urlencode "endDate=2024-01-31" \\
  --data-urlencode "metrics=views,likes,comments,subscribersGained" \\
  --data-urlencode "dimensions=day"

# O processamento das métricas é feito na sua aplicação
# após receber os dados brutos das APIs.`,
      },
    ],
  },
];
