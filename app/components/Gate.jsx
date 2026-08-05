"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export default function Gate({ children }) {
  const [state, setState] = useState("loading"); // loading | locked | open
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch("/api/access")
      .then((r) => r.json())
      .then((d) => setState(!d.required || d.ok ? "open" : "locked"))
      .catch(() => setState("open"));
  }, []);

  async function submit(e) {
    e.preventDefault();
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      if (res.ok) {
        setState("open");
      } else {
        setError("Código incorreto. Tente novamente.");
      }
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setSending(false);
    }
  }

  if (state === "loading") {
    return <div className="spinner" aria-label="Carregando" />;
  }

  if (state === "locked") {
    return (
      <div className="gate">
        <div className="gate-card">
          <span className="brand-mark">
            <Image src="/logo-v4.png" alt="V4 Company" width={52} height={52} priority />
          </span>
          <h1>Calendário SDR</h1>
          <p>Digite o código de acesso fornecido pela equipe V4.</p>
          <form onSubmit={submit}>
            <input
              type="password"
              placeholder="Código de acesso"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoFocus
            />
            {error && <div className="alert alert-error" style={{ margin: 0 }}>{error}</div>}
            <button className="btn btn-primary btn-block" disabled={sending || !code.trim()}>
              {sending ? "Verificando…" : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return children;
}
