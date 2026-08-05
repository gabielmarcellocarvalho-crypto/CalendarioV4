# Calendário SDR · V4 Company

Sistema de agendamento para o SDR/freelancer marcar reuniões **sem precisar de acesso à conta Google da V4**. Ele preenche um formulário e o sistema:

1. Cria o evento no **Google Agenda** da conta Workspace da V4 (conectada uma única vez pelo gestor);
2. Gera o link do **Google Meet** automaticamente;
3. **Convida por e-mail** o lead, o SDR e quem mais precisar;
4. (Opcional) tenta ativar a **gravação automática** da call via Meet REST API.

Como o evento pertence à conta Workspace da V4, o Meet nasce com os recursos da licença V4 — incluindo gravação — mesmo que o SDR use uma conta Gmail comum.

## Rodando

```bash
npm install
copy .env.example .env.local   # e preencha (veja abaixo)
npm run dev                    # http://localhost:3000
```

## Configurando o Google Cloud Console (~5 min)

1. Acesse [console.cloud.google.com](https://console.cloud.google.com) com a conta da V4 e crie um projeto (ex.: `calendario-sdr`).
2. Em **APIs e serviços → Biblioteca**, ative:
   - **Google Calendar API** (obrigatória)
   - **Google Meet REST API** (só se for usar gravação automática)
3. Em **APIs e serviços → Tela de permissão OAuth**:
   - Tipo **Interno** (recomendado, já que a conta é do Workspace da V4). Se usar **Externo**, adicione a conta da V4 como usuário de teste.
4. Em **Credenciais → Criar credenciais → ID do cliente OAuth**:
   - Tipo: **Aplicativo da Web**
   - URIs de redirecionamento autorizados: `http://localhost:3000/api/auth/callback`
     *(ao publicar, adicione também `https://SEU-DOMINIO/api/auth/callback`)*
5. Copie **Client ID** e **Client Secret** para o `.env.local`:

```env
GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxx
APP_BASE_URL=http://localhost:3000
APP_ACCESS_CODE=v4sdr2026          # código que o SDR digita para entrar
SDR_EMAIL=freela@gmail.com         # convidado automático em toda reunião (opcional)
MEET_SHOW_RECORDINGS=false         # true para buscar o link da gravação após a call
TIMEZONE=America/Sao_Paulo
```

6. Reinicie o servidor, abra **http://localhost:3000/admin** e clique em **Conectar conta Google da V4** — faça login com a conta Workspace que será a organizadora das reuniões. Pronto: o SDR já pode agendar pela tela inicial.

## Telas

| Rota      | Para quem  | O que faz |
|-----------|------------|-----------|
| `/`       | SDR        | Formulário de agendamento (lead, e-mail, data/hora, duração, observações) |
| `/agenda` | SDR/gestor | Lista das próximas calls com link do Meet, copiar link e cancelar |
| `/admin`  | Gestor     | Conectar/desconectar a conta Google, checklist de configuração |

O acesso é protegido pelo código definido em `APP_ACCESS_CODE` (o SDR digita uma vez; fica salvo por 30 dias no navegador). A listagem mostra **apenas** eventos criados pelo próprio sistema — o SDR não enxerga o restante da agenda da V4.

## Sobre a gravação

O Google Meet **não permite** que nenhum app de terceiros ligue a gravação automaticamente via API — isso é sempre uma ação manual de quem estiver como anfitrião/co-anfitrião dentro da call.

- O **organizador** da reunião é a conta Workspace da V4, então a call tem os recursos de gravação da licença V4.
- Para o SDR conseguir gravar: durante a call, o organizador o promove a **co-anfitrião** (Meet → Pessoas → ⋮ → "Tornar co-anfitrião"). A partir daí ele já consegue clicar em "Gravar".
- Depois que alguém grava, o arquivo vai automaticamente para o Google Drive da conta V4. Definindo `MEET_SHOW_RECORDINGS=true` (e ativando a **Google Meet API** no Cloud Console), o sistema passa a localizar esse link de gravação via `GET /api/meetings/[id]/recording` — sem precisar caçar o arquivo no Drive.

## Publicando na Vercel

O armazenamento em arquivo (`./data`) não persiste em ambiente serverless. Em produção (quando `process.env.VERCEL` está definido, ou localmente se `BLOB_READ_WRITE_TOKEN` estiver setado), os tokens OAuth passam a ser lidos/gravados num **Vercel Blob privado** automaticamente — não precisa trocar nada no código, só provisionar o Blob:

1. No projeto na Vercel, vá em **Storage → Create Database → Blob**, marque **Private** e conecte ao projeto (isso injeta `BLOB_READ_WRITE_TOKEN` automaticamente nas envs).
2. Configure as variáveis de ambiente do projeto na Vercel (mesmas do `.env.example`): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `APP_BASE_URL` (domínio de produção), `APP_ACCESS_CODE`, `SDR_EMAIL`, `MEET_SHOW_RECORDINGS`, `TIMEZONE`.
3. No Google Cloud Console, adicione a URI de redirecionamento de produção: `https://SEU-DOMINIO.vercel.app/api/auth/callback`.
4. Depois do deploy, abra `/admin` na URL de produção e conecte a conta Google novamente (a conexão feita localmente não é compartilhada com o Blob de produção).

## Detalhes técnicos

- **Stack**: Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui + googleapis.
- **Tokens OAuth**: `./data/google-tokens.json` localmente, ou Vercel Blob privado em produção (`lib/google.js`, função `useBlobStorage()`).
- **Escopos OAuth**: `calendar.events`, `userinfo.email/profile` e, se `MEET_SHOW_RECORDINGS=true`, `meetings.space.readonly`.
- Eventos criados recebem a marcação `extendedProperties.private.app=calendario-sdr`, usada para listar/cancelar somente o que o sistema criou.
