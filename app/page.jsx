"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const DURATIONS = [
  { value: 15, label: "15 minutos" },
  { value: 30, label: "30 minutos" },
  { value: 45, label: "45 minutos" },
  { value: 60, label: "1 hora" },
  { value: 90, label: "1h30" },
];

function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function NovaReuniao() {
  const [form, setForm] = useState({
    leadName: "",
    leadEmail: "",
    extraEmails: "",
    date: todayISO(),
    time: "10:00",
    durationMin: 30,
    notes: "",
    notify: true,
  });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(null);
  const [status, setStatus] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/auth/status")
      .then((r) => (r.ok ? r.json() : null))
      .then(setStatus)
      .catch(() => {});
  }, []);

  const set = (key) => (e) =>
    setForm((f) => ({
      ...f,
      [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value,
    }));

  async function submit(e) {
    e.preventDefault();
    setSending(true);
    setError("");
    setCreated(null);
    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.error === "not_connected") {
          setError(
            "Nenhuma conta Google conectada ainda. Abra Configurações e conecte a conta V4."
          );
        } else {
          setError(data.message || "Não foi possível agendar. Tente novamente.");
        }
        return;
      }
      setCreated(data.meeting);
      setCopied(false);
      setForm((f) => ({ ...f, leadName: "", leadEmail: "", extraEmails: "", notes: "" }));
    } catch {
      setError("Falha de conexão com o servidor.");
    } finally {
      setSending(false);
    }
  }

  function copyLink() {
    if (created?.meetLink) {
      navigator.clipboard.writeText(created.meetLink).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
    }
  }

  const notConfigured = status && (!status.credentialsConfigured || !status.connected);

  return (
    <>
      <h1 className="page-title">
        Nova <em>reunião</em>
      </h1>
      <p className="page-sub">
        Agende a call com o lead: o evento entra no Google Agenda da V4, o convite é enviado por
        e-mail e o link do Google Meet é gerado automaticamente.
      </p>

      {notConfigured && (
        <div className="alert alert-warn">
          {!status.credentialsConfigured
            ? "As credenciais do Google ainda não foram configuradas."
            : "A conta Google da V4 ainda não foi conectada."}{" "}
          <Link href="/admin" style={{ textDecoration: "underline" }}>
            Ir para Configurações →
          </Link>
        </div>
      )}

      {created && (
        <div className="card" style={{ borderColor: "rgba(34,197,94,0.35)" }}>
          <div className="alert alert-success" style={{ marginBottom: 0 }}>
            ✅ Reunião agendada com sucesso! O convite foi enviado para os participantes.
          </div>
          {created.meetLink && (
            <div className="meet-box">
              <code>{created.meetLink}</code>
              <button className="btn btn-ghost btn-sm" onClick={copyLink}>
                {copied ? "Copiado ✓" : "Copiar link"}
              </button>
              <a
                className="btn btn-primary btn-sm"
                href={created.meetLink}
                target="_blank"
                rel="noreferrer"
              >
                Abrir Meet
              </a>
            </div>
          )}
          <p className="hint" style={{ marginTop: 12 }}>
            Veja todos os agendamentos na aba <Link href="/agenda" style={{ textDecoration: "underline" }}>Agenda</Link>.
          </p>
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={submit} className="card">
        <div className="card-title">Dados do lead</div>
        <div className="form-grid">
          <div className="field">
            <label>
              Nome do lead / empresa <span className="req">*</span>
            </label>
            <input
              placeholder="Ex.: João Silva — Empresa X"
              value={form.leadName}
              onChange={set("leadName")}
              required
            />
          </div>
          <div className="field">
            <label>
              E-mail do lead <span className="req">*</span>
            </label>
            <input
              type="email"
              placeholder="lead@empresa.com.br"
              value={form.leadEmail}
              onChange={set("leadEmail")}
              required
            />
          </div>
          <div className="field full">
            <label>Participantes adicionais</label>
            <input
              placeholder="outro@empresa.com, socio@empresa.com (separados por vírgula)"
              value={form.extraEmails}
              onChange={set("extraEmails")}
            />
            <span className="hint">
              {status?.sdrEmail
                ? `O SDR (${status.sdrEmail}) é convidado automaticamente.`
                : "Opcional — adicione outros e-mails que devem receber o convite."}
            </span>
          </div>
        </div>

        <div className="card-title" style={{ marginTop: 26 }}>
          Data e horário
        </div>
        <div className="form-grid">
          <div className="field">
            <label>
              Data <span className="req">*</span>
            </label>
            <input type="date" value={form.date} onChange={set("date")} min={todayISO()} required />
          </div>
          <div className="field">
            <label>
              Horário <span className="req">*</span>
            </label>
            <input type="time" value={form.time} onChange={set("time")} required />
          </div>
          <div className="field">
            <label>Duração</label>
            <select value={form.durationMin} onChange={set("durationMin")}>
              {DURATIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Fuso horário</label>
            <input value={status?.timezone || "America/Sao_Paulo"} disabled />
          </div>
          <div className="field full">
            <label>Observações (entram na descrição do convite)</label>
            <textarea
              placeholder="Pauta, contexto do lead, links úteis…"
              value={form.notes}
              onChange={set("notes")}
            />
          </div>
          <div className="field full checkbox-row">
            <input
              id="notify"
              type="checkbox"
              checked={form.notify}
              onChange={set("notify")}
            />
            <label htmlFor="notify" style={{ fontWeight: 500, color: "var(--text-dim)" }}>
              Enviar convite por e-mail aos participantes
            </label>
          </div>
        </div>

        <div style={{ marginTop: 24 }}>
          <button className="btn btn-primary btn-block" disabled={sending}>
            {sending ? "Agendando…" : "Agendar reunião + gerar link do Meet"}
          </button>
        </div>
      </form>
    </>
  );
}
