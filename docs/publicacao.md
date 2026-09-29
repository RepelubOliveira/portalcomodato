# Publicação

O portal é uma aplicação compilada: o navegador recebe HTML, CSS e alguns
arquivos JavaScript gerados pelo `npm run build`. Isso descarta hospedagens
que só aceitam páginas escritas à mão.

## Como está configurado

Um workflow do GitHub Actions (`.github/workflows/publicar.yml`) roda a cada
push na `main`: verifica os tipos, roda os testes e só então constrói e
publica. Um build que quebra os testes não vai ao ar.

O roteamento é por hash (`/#/solicitacoes`), então não é preciso configurar
fallback no servidor: qualquer hospedagem estática serve.

## O que precisa ser feito uma vez

1. No repositório, **Settings → Pages → Source: GitHub Actions**.
2. Em **Settings → Secrets and variables → Actions → Variables**, criar:

   | Nome | Valor |
   |---|---|
   | `VITE_SUPABASE_URL` | `https://gkxmzxshmzrjdsytehkv.supabase.co` |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | a chave `sb_publishable_...` |

   São variáveis, não segredos: os dois valores vão para o bundle do navegador
   de qualquer forma, e quem protege os dados é a RLS. A chave `service_role`
   não entra aqui em hipótese alguma.

3. Depois do primeiro build, copiar o endereço publicado e cadastrá-lo no
   Supabase em **Authentication → URL Configuration → Site URL**, senão o
   link de definição de senha do convite aponta para o lugar errado.

## Alternativas

**Cloudflare Pages ou Netlify**, conectados ao mesmo repositório, funcionam do
mesmo jeito e continuam gratuitos com o repositório privado, o que o GitHub
Pages não faz. A configuração é a mesma: comando `npm run build`, pasta
`dist`, e as duas variáveis de ambiente.

**Htmly** exigiria enviar o conteúdo de cada arquivo do build à mão. Os
pedaços do JavaScript passam de 200 KB cada, o que inviabiliza o envio por
ferramenta. Se o endereço do Htmly for necessário, o caminho é subir a pasta
`dist` pela interface web do próprio Htmly após rodar `npm run build`.
