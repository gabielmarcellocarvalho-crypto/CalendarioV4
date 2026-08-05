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
MEET_AUTO_RECORDING=false          # true para tentar gravação automática
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

- O **organizador** da reunião é a conta Workspace da V4, então a call tem os recursos de gravação da licença V4.
- Para o SDR gravar manualmente: durante a call, promova-o a **co-anfitrião** (Meet → Pessoas → ⋮ → Adicionar como co-anfitrião).
- Alternativa sem intervenção: defina `MEET_AUTO_RECORDING=true`, ative a **Meet REST API** no Cloud Console e **reconecte** a conta em `/admin`. O sistema tentará ligar a gravação automática de cada call criada — a gravação inicia sozinha e vai para o Drive da conta V4. *(Requer edição do Workspace com gravação habilitada; se a API recusar, o agendamento continua funcionando normalmente e a gravação segue manual.)*

## Detalhes técnicos

- **Stack**: Next.js 15 (App Router) + googleapis. Sem banco de dados — os tokens OAuth ficam em `./data/google-tokens.json` (fora do git).
- **Escopos OAuth**: `calendar.events`, `userinfo.email/profile` e, se gravação automática estiver ativa, `meetings.space.created` + `meetings.space.settings`.
- Eventos criados recebem a marcação `extendedProperties.private.app=calendario-sdr`, usada para listar/cancelar somente o que o sistema criou.
- Para publicar (Vercel etc.): ajuste `APP_BASE_URL`, adicione a URI de callback de produção no Cloud Console. Obs.: em plataformas serverless o armazenamento em arquivo (`./data`) não persiste — para produção, troque `lib/google.js` por um storage persistente (KV/DB) ou rode em uma VM/servidor próprio.
