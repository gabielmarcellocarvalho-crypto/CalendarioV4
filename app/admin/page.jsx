"use client";

import { useEffect, useState } from "react";

export default function Admin() {
  const [status, setStatus] = useState(null);
  const [flash, setFlash] = useState(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  function loadStatus() {
    fetch("/api/auth/status")
      .then((r) => (r.ok ? r.json() : null))
      .then(setStatus)
      .catch(() => {});
  }

  useEffect(() => {
    loadStatus();
    const params = new URLSearchParams(window.location.search);
    if (params.get("conectado")) {
      setFlash({ type: "success", text: "Conta Google conectada com sucesso!" });
    } else if (params.get("erro")) {
      const map = {
        credenciais: "Preencha GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET no .env.local antes de conectar.",
        troca_token: "Falha ao trocar o código de autorização. Confira o Client Secret e a URI de redirecionamento.",
        access_denied: "Autorização negada no Google.",
      };
      setFlash({
        type: "error",
        text: map[params.get("erro")] || `Erro na conexão: ${params.get("erro")}`,
      });
    }
    if (params.toString()) {
      window.history.replaceState({}, "", "/admin");
    }
  }, []);

  async function disconnect() {
    setBusy(true);
    try {
      await fetch("/api/auth/disconnect", { method: "POST" });
      setFlash({ type: "success", text: "Conta desconectada." });
      loadStatus();
    } finally {
      setBusy(false);
    }
  }

  function copyRedirect() {
    if (!status?.redirectUri) return;
    navigator.clipboard.writeText(status.redirectUri).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (!status) return <div className="spinner" aria-label="Carregando" />;

  return (
    <>
      <h1 className="page-title">
        Configurações <em>·</em> Conexão Google
      </h1>
      <p className="page-sub">
        Conecte aqui a conta Google Workspace da V4 (a “dona” das reuniões). Os eventos são criados
        no calendário dela — assim o Meet nasce com os recursos da conta V4.
      </p>

      {flash && (
        <div className={`alert ${flash.type === "success" ? "alert-success" : "alert-error"}`}>
          {flash.text}
        </div>
      )}

      <div className="card">
        <div className="card-title">Status</div>
        <div className="check-list">
          <div className="check-item">
            <span className="label">Credenciais do Google Cloud (.env.local)</span>
            {status.credentialsConfigured ? (
              <span className="badge ok"><span className="dot" />Configuradas</span>
            ) : (
              <span className="badge off"><span className="dot" />Pendentes</span>
            )}
          </div>
          <div className="check-item">
            <span className="label">Conta Google conectada</span>
            {status.connected ? (
              <span className="badge ok">
                <span className="dot" />
                {status.email || "Conectada"}
              </span>
            ) : (
              <span className="badge off"><span className="dot" />Não conectada</span>
            )}
          </div>
          <div className="check-item">
            <span className="label">E-mail do SDR (convidado automático)</span>
            {status.sdrEmail ? (
              <span className="badge ok"><span className="dot" />{status.sdrEmail}</span>
            ) : (
              <span className="badge"><span className="dot" style={{ background: "var(--amber)" }} />Opcional — defina SDR_EMAIL</span>
            )}
          </div>
          <div className="check-item">
            <span className="label">Link da gravação após a call (Meet API)</span>
            {status.showRecordings ? (
              <span className="badge ok"><span className="dot" />Ativado</span>
            ) : (
              <span className="badge"><span className="dot" style={{ background: "var(--amber)" }} />Desativado</span>
            )}
          </div>
          <div className="check-item">
            <span className="label">Fuso horário</span>
            <code>{status.timezone}</code>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          {status.connected ? (
            <>
              <a className="btn btn-ghost" href="/api/auth/google">
                Reconectar conta
              </a>
              <button className="btn btn-danger-ghost" onClick={disconnect} disabled={busy}>
                {busy ? "Desconectando…" : "Desconectar"}
              </button>
            </>
          ) : (
            <a
              className="btn btn-primary"
              href="/api/auth/google"
              aria-disabled={!status.credentialsConfigured}
              onClick={(e) => {
                if (!status.credentialsConfigured) {
                  e.preventDefault();
                  setFlash({
                    type: "error",
                    text: "Preencha as credenciais no .env.local e reinicie o servidor antes de conectar.",
                  });
                }
              }}
            >
              Conectar conta Google da V4
            </a>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-title">Como configurar o Google Cloud Console</div>
        <ol className="steps">
          <li>
            <span>
              Acesse <code>console.cloud.google.com</code>, crie (ou selecione) um projeto e ative as
              APIs: <strong>Google Calendar API</strong>
              {status.showRecordings ? (
                <> e <strong>Google Meet API</strong></>
              ) : null}
              .
            </span>
          </li>
          <li>
            <span>
              Em <strong>APIs e serviços → Tela de permissão OAuth</strong>, configure o app
              (tipo <strong>Interno</strong>, se a conta for do Workspace da V4).
            </span>
          </li>
          <li>
            <span>
              Em <strong>Credenciais → Criar credenciais → ID do cliente OAuth</strong>, escolha{" "}
              <strong>Aplicativo da Web</strong> e adicione esta URI de redirecionamento autorizada:
              <br />
              <code>{status.redirectUri}</code>{" "}
              <button className="btn btn-ghost btn-sm" onClick={copyRedirect} style={{ marginTop: 6 }}>
                {copied ? "Copiada ✓" : "Copiar URI"}
              </button>
            </span>
          </li>
          <li>
            <span>
              Copie o <strong>Client ID</strong> e o <strong>Client Secret</strong> para o arquivo{" "}
              <code>.env.local</code> (use o <code>.env.example</code> como modelo) e reinicie o
              servidor.
            </span>
          </li>
          <li>
            <span>
              Volte aqui e clique em <strong>Conectar conta Google da V4</strong> — faça login com a
              conta Workspace que será a organizadora das reuniões.
            </span>
          </li>
        </ol>
      </div>

      <div className="card">
        <div className="card-title">Como funciona a gravação</div>
        <p style={{ color: "var(--text-dim)", fontSize: 14, lineHeight: 1.7 }}>
          Importante: o Google não permite que nenhum aplicativo externo ligue a gravação
          automaticamente por API — gravar é sempre uma ação manual de quem estiver como{" "}
          <strong>anfitrião ou co-anfitrião</strong> dentro da call. Como as reuniões são criadas
          pela conta Workspace da V4, o organizador pode entrar rapidamente e promover o SDR a{" "}
          <strong>co-anfitrião</strong> (Meet → Pessoas → ⋮ → "Tornar co-anfitrião"), e a partir
          daí ele consegue clicar em "Gravar" normalmente.
        </p>
        <p style={{ color: "var(--text-dim)", fontSize: 14, lineHeight: 1.7, marginTop: 12 }}>
          Depois que alguém grava a call, o arquivo é salvo automaticamente no Google Drive da
          conta V4. Ativando <code>MEET_SHOW_RECORDINGS=true</code> no <code>.env.local</code>{" "}
          (e a <strong>Google Meet API</strong> no Cloud Console), o sistema passa a buscar esse
          link de gravação para exibir na agenda — sem precisar caçar o arquivo no Drive.
        </p>
      </div>
    </>
  );
}
