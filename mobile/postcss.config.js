// Config vazia de propósito: sem ela, o Vite sobe a árvore de pastas e acha o
// postcss.config.js do projeto Next.js na raiz do repositório (que puxa o
// Tailwind do site). O app de campo usa CSS puro.
export default { plugins: [] };
