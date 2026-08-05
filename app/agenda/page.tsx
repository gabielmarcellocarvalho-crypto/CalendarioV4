"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { EventManager, type Event } from "@/components/ui/event-manager"

type Attendee = { email: string; response?: string }

type MeetingApi = {
  id: string
  title: string
  description: string
  start: string
  end: string
  meetLink: string | null
  htmlLink: string | null
  status: string
  attendees: Attendee[]
  leadName: string | null
}

const CATEGORIES = ["Reunião"]
const AVAILABLE_TAGS = ["Confirmado", "Aguardando", "Recusado"]

function pad(n: number) {
  return String(n).padStart(2, "0")
}

function toDateTimeParts(d: Date) {
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  }
}

function attendeeTag(attendees: Attendee[]): string {
  if (attendees.length === 0) return "Aguardando"
  if (attendees.some((a) => a.response === "declined")) return "Recusado"
  if (attendees.every((a) => a.response === "accepted")) return "Confirmado"
  return "Aguardando"
}

function toEvent(m: MeetingApi): Event {
  return {
    id: m.id,
    title: m.title,
    description: m.description || "",
    startTime: new Date(m.start),
    endTime: new Date(m.end),
    color: "red",
    category: "Reunião",
    attendees: m.attendees.map((a) => a.email),
    tags: [attendeeTag(m.attendees)],
  }
}

export default function AgendaPage() {
  const router = useRouter()
  const [events, setEvents] = useState<Event[] | null>(null)
  const [error, setError] = useState("")
  const [notConnected, setNotConnected] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/meetings")
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (data.error === "not_connected") {
          setNotConnected(true)
          setEvents([])
          return
        }
        throw new Error(data.message || "Falha ao carregar a agenda.")
      }
      setNotConnected(false)
      setError("")
      setEvents((data.meetings || []).map(toEvent))
      setRefreshKey((k) => k + 1)
    } catch (e: any) {
      setError(e.message || "Falha ao carregar a agenda.")
      setEvents([])
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/meetings/${id}`, { method: "DELETE" })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.message || "Falha ao cancelar a reunião.")
        }
        setError("")
        load()
      } catch (e: any) {
        setError(e.message || "Falha ao cancelar a reunião.")
      }
    },
    [load],
  )

  const handleUpdate = useCallback(
    async (id: string, partial: Partial<Event>) => {
      const body: Record<string, unknown> = {}
      let hasChange = false

      if (partial.startTime && partial.endTime) {
        const { date, time } = toDateTimeParts(partial.startTime)
        body.date = date
        body.time = time
        body.durationMin = Math.round(
          (partial.endTime.getTime() - partial.startTime.getTime()) / 60000,
        )
        hasChange = true
      }
      if (typeof partial.title === "string") {
        body.title = partial.title
        hasChange = true
      }
      if (typeof partial.description === "string") {
        body.description = partial.description
        hasChange = true
      }

      if (!hasChange) return

      try {
        const res = await fetch(`/api/meetings/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.message || "Falha ao atualizar a reunião.")
        }
        setError("")
        load()
      } catch (e: any) {
        setError(e.message || "Falha ao atualizar a reunião.")
      }
    },
    [load],
  )

  return (
    <>
      <h1 className="page-title">
        Agenda <em>·</em> Estilo Google Agenda
      </h1>
      <p className="page-sub">
        Visualize por mês, semana, dia ou lista. Arraste uma reunião para remarcar, clique para
        ver detalhes, editar ou cancelar. Tudo sincronizado com o Google Agenda da V4.
      </p>

      {error && <div className="alert alert-error">{error}</div>}

      {notConnected && (
        <div className="alert alert-warn">
          A conta Google ainda não foi conectada.{" "}
          <Link href="/admin" style={{ textDecoration: "underline" }}>
            Ir para Configurações →
          </Link>
        </div>
      )}

      {events === null && <div className="spinner" aria-label="Carregando" />}

      {events && (
        <EventManager
          key={refreshKey}
          events={events}
          categories={CATEGORIES}
          availableTags={AVAILABLE_TAGS}
          defaultView="month"
          onEventDelete={handleDelete}
          onEventUpdate={handleUpdate}
          onRequestCreate={() => router.push("/")}
        />
      )}
    </>
  )
}
