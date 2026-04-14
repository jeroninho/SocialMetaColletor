export interface GlossaryTerm {
  term: string;
  definition: string;
  relatedLink?: { label: string; href: string };
}

export const glossaryTerms: GlossaryTerm[] = [
  {
    term: "API",
    definition: "Application Programming Interface — conjunto de regras e protocolos que permite que diferentes softwares se comuniquem entre si. No contexto de redes sociais, APIs permitem que aplicações acessem dados como métricas, posts e perfis de forma programática.",
    relatedLink: { label: "Boas Práticas de APIs", href: "/articles/boas-praticas-apis-sociais" },
  },
  {
    term: "Access Token",
    definition: "Credencial temporária emitida após a autenticação OAuth que permite a uma aplicação acessar recursos protegidos em nome do usuário. Tokens de acesso geralmente expiram após um período curto (1 hora).",
    relatedLink: { label: "Segurança de Tokens", href: "/articles/seguranca-tokens" },
  },
  {
    term: "Authorization Code",
    definition: "Código temporário enviado pelo servidor de autorização para a aplicação durante o fluxo OAuth 2.0. É trocado por um access token e refresh token no servidor backend.",
    relatedLink: { label: "Fundamentos do OAuth 2.0", href: "/articles/oauth2-fundamentos" },
  },
  {
    term: "Callback URL",
    definition: "URL para onde o usuário é redirecionado após autorizar (ou negar) acesso no provedor OAuth. Também chamada de Redirect URI. Deve ser registrada previamente no painel do provedor.",
  },
  {
    term: "CSRF",
    definition: "Cross-Site Request Forgery — ataque onde um site malicioso faz requisições autenticadas em nome do usuário. No OAuth, o parâmetro 'state' é usado para prevenir esse tipo de ataque.",
    relatedLink: { label: "Segurança de Tokens", href: "/articles/seguranca-tokens" },
  },
  {
    term: "Endpoint",
    definition: "URL específica de uma API que corresponde a um recurso ou operação. Por exemplo, 'GET /v18.0/me/posts' é um endpoint da Graph API do Facebook que retorna os posts do usuário.",
  },
  {
    term: "Graph API",
    definition: "API principal do Facebook/Meta que permite leitura e escrita de dados na plataforma. Usa uma estrutura de grafo onde objetos (usuários, posts, páginas) são nós conectados por arestas.",
  },
  {
    term: "HttpOnly Cookie",
    definition: "Cookie com a flag HttpOnly ativada, o que impede que seja acessado via JavaScript no navegador. É a forma recomendada de armazenar tokens de autenticação em aplicações web.",
    relatedLink: { label: "Segurança de Tokens", href: "/articles/seguranca-tokens" },
  },
  {
    term: "OAuth 2.0",
    definition: "Protocolo padrão da indústria para autorização. Permite que aplicações de terceiros acessem recursos de um usuário sem que ele precise compartilhar suas credenciais diretamente.",
    relatedLink: { label: "Fundamentos do OAuth 2.0", href: "/articles/oauth2-fundamentos" },
  },
  {
    term: "PKCE",
    definition: "Proof Key for Code Exchange — extensão do OAuth 2.0 que adiciona uma camada extra de segurança ao fluxo de autorização, especialmente importante para aplicações públicas (SPAs, apps mobile).",
  },
  {
    term: "Rate Limit",
    definition: "Limite de requisições que uma API permite em um determinado período de tempo. Ultrapassar o rate limit resulta em respostas com status 429 (Too Many Requests). Cada plataforma tem seus próprios limites.",
    relatedLink: { label: "Boas Práticas de APIs", href: "/articles/boas-praticas-apis-sociais" },
  },
  {
    term: "Refresh Token",
    definition: "Token de longa duração usado para obter novos access tokens sem que o usuário precise reautorizar. Deve ser armazenado de forma segura no servidor.",
    relatedLink: { label: "Segurança de Tokens", href: "/articles/seguranca-tokens" },
  },
  {
    term: "REST",
    definition: "Representational State Transfer — estilo arquitetural para APIs que usa métodos HTTP (GET, POST, PUT, DELETE) para operações sobre recursos identificados por URLs.",
  },
  {
    term: "Scope",
    definition: "Permissão específica solicitada durante o fluxo OAuth. Escopos definem exatamente quais dados e ações a aplicação pode acessar. Exemplo: 'youtube.readonly' permite apenas leitura de dados do YouTube.",
    relatedLink: { label: "Fundamentos do OAuth 2.0", href: "/articles/oauth2-fundamentos" },
  },
  {
    term: "Token Rotation",
    definition: "Prática de segurança onde refresh tokens são invalidados e substituídos por novos a cada uso. Reduz o risco de tokens roubados serem usados por atacantes.",
  },
  {
    term: "Webhook",
    definition: "Mecanismo de notificação em tempo real onde uma API envia dados para sua aplicação quando um evento ocorre, em vez de você precisar consultar periodicamente (polling).",
    relatedLink: { label: "Boas Práticas de APIs", href: "/articles/boas-praticas-apis-sociais" },
  },
  {
    term: "XSS",
    definition: "Cross-Site Scripting — vulnerabilidade de segurança onde código malicioso é injetado em uma página web. Pode ser usado para roubar tokens armazenados de forma insegura no navegador.",
    relatedLink: { label: "Segurança de Tokens", href: "/articles/seguranca-tokens" },
  },
  {
    term: "JSON Web Token (JWT)",
    definition: "Formato compacto e auto-contido para transmitir informações entre partes como um objeto JSON assinado digitalmente. Comumente usado como formato de access tokens e ID tokens em implementações OAuth/OpenID Connect.",
  },
];
