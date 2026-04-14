export interface Video {
  id: string;
  title: string;
  description: string;
  category: string;
  duration: string;
  embedUrl: string;
  thumbnail?: string;
}

export const videos: Video[] = [
  {
    id: "intro-oauth",
    title: "Introdução ao OAuth 2.0",
    description: "Entenda os conceitos fundamentais do OAuth 2.0 e como ele funciona por trás das integrações com redes sociais.",
    category: "OAuth 2.0",
    duration: "12 min",
    embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
  },
  {
    id: "facebook-graph-api",
    title: "Facebook Graph API na Prática",
    description: "Tutorial passo-a-passo de como configurar e usar a Graph API do Facebook para coletar métricas de páginas.",
    category: "APIs Sociais",
    duration: "18 min",
    embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
  },
  {
    id: "youtube-data-api",
    title: "YouTube Data API: Primeiros Passos",
    description: "Como configurar credenciais, autenticar e buscar dados de canais e vídeos usando a YouTube Data API v3.",
    category: "APIs Sociais",
    duration: "15 min",
    embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
  },
  {
    id: "seguranca-web",
    title: "Segurança em Aplicações Web com OAuth",
    description: "Boas práticas de segurança ao implementar OAuth: PKCE, state parameter, armazenamento de tokens.",
    category: "Segurança",
    duration: "20 min",
    embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
  },
  {
    id: "instagram-api",
    title: "Instagram Basic Display API",
    description: "Como usar a Instagram Basic Display API para acessar perfis, mídia e álbuns de usuários.",
    category: "APIs Sociais",
    duration: "14 min",
    embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
  },
  {
    id: "webhooks-realtime",
    title: "Webhooks: Dados em Tempo Real",
    description: "Configure webhooks para receber notificações em tempo real de mudanças nas plataformas sociais.",
    category: "Boas Práticas",
    duration: "16 min",
    embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
  },
];
