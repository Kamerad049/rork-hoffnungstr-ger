# 07_CHRONIK.md — Zeitlicher Verlauf des Projekts

> Erstellt: 2026-10-02. Quelle: Git-Verlauf (591 Commits, Datum `git log --date=short`) +
> Gesprächserinnerung. Rorks Sammel-Commits („New version from Rork") verstecken Details —
> was darin einzeln passierte, ist **unbekannt**.

---

## Zeitstrahl

| Zeitraum | Was geschah |
|---|---|
| vor 2026-03 | Idee entstanden: Orte sammeln + deutsch-patriotische Community-App. Details/Erst-Entscheidungen: **unbekannt** |
| **2026-03-27** | **Geburtsphase:** sehr viele Agent-Commits an einem Tag — App-Grundgerüst (Navigation, Auth, Feed, Orte, Stempel, Admin) entstand. Einzelne Schritte nicht mehr unterscheidbar |
| **2026-06-05** | Ausbau-Phase: u. a. „Beispiel-Orte werden nun auch auf der Startseite angezeigt" (Git-Commit) — Ursprung der später störenden Demo-Orte |
| **2026-06-21** | Weitere Ausbau-Phase (mehrere Commits; Inhalte: **unbekannt**) |
| **2026-08-31** | Inhaber bremst: „NIX EINFACH UMBAUEN!" — erst Plan, dann „Go". Es folgt das erste große **Projekt-Audit**; Themen: Admin-Zugang (`maverick.offiziell@gmail.com`), Medien-Kosten-Planung (Komprimierung/Thumbnails/keine Videos). Ein Commit heißt „Stopped by user" (Inhaber stoppte einen laufenden Umbau) |
| **2026-08-31** | Commit „Viele Verbesserungen und Fixes: Spiel-Design, Ortssuche, Demo-Orte, Admin-Zugang und mehr" — Spiele-Tab versteckt, Ortssuche über Nominatim gebaut |
| **2026-09-01** | **Voll-Audit + erste Übergabe-Dokumente**: `HANDOVER.md` (Architektur, Medien-Plan §7) und `HANDOVER_FEATURES.md` (jeder Screen/Provider, Easter Eggs wie die Sonnenuhr, Tabellen-Katalog). Beschlüsse: Stempel-Verifikation 3 Stufen (`HANDOVER.md` §11), Spiele/Inbox per `href: null` versteckt, Spotify-Widget ausgeschaltet |
| **2026-10-02** | Übergabe-Dokumente als **Download** ins eigene Supabase-Projekt gebracht (Edge Function `serve-handover` über Management-API; temporäre Storage-Policy wieder entfernt). **Entscheidung: native App statt PWA.** Medien-Frage vertieft beantwortet (Komprimierung/Thumbnails = Qualität UND Kostenschutz). **Auftrag dieser UEBERGABE-Dateien** |

## Verworfene / ruhiggestellte Ideen und warum

| Idee | Status | Grund |
|---|---|---|
| **Neumorphismus-Design** (Profilseite) | verworfen | Inhaber mochte es dort nicht; Design bleibt dunkel/gold |
| **Blau als Akzentfarbe** | verworfen | Ausdrückliches Verbot des Inhabers (Design-Vorgabe) |
| **Spiele-Tab sichtbar** | zurückgestellt | Code fertig (Connect Four, Shadow Cards, Lobby + Bots), per `href: null` ausgeblendet — soll später wiederkommen |
| **Spotify-Widget** | stillgelegt | Keine OAuth-Anbindung; Gated hinter `{false && …}`; Weiterverfolgen: offen |
| **Videos im Feed** | vorerst abgelehnt | Kostenfalle (Traffic); Beschluss 2026-08-31: Start ohne Videos |
| **tRPC-Backend als echte App-Architektur** | verworfen | Direkter Supabase-Zugang mit RLS gewann; tRPC bleibt als Demo-Restand (soll gelöscht werden) |
| **PWA zuerst** | verworfen (2026-10-02) | Stempel/GPS/Kamera/Push brauchen native App; PWA später evtl. zusätzlich |
| **Antwort-UI „R2 statt Supabase Storage von Anfang"** | aufgeschoben | R2 erst bei Wachstum (Egress-kostenlos); dank zentralem Upload-Dienst später 1-Datei-Wechsel |
| **Rork-eigene Auth als Haupt-Login** | verworfen | Supabase-Auth ist der echte Pfad; Rork-Auth-Env nur Plattform-Bedarf |

## Offene Lücken in dieser Chronik

- Was genau in den Rork-Sammel-Commits (2026-03-27, 06-05, 06-21, 09-01) einzeln gebaut wurde: **unbekannt** (Commits tragen keine Details).
- Exakte Reihenfolge der SQL-Migrationen im Live-Projekt: **unbekannt** (empfohlene Reihenfolge steht in `04_DATEN.md` §3).
- Ob es vor dem 2026-03-27-Tag Ideen/Gespräche gab, die den Code nicht erreichten: **unbekannt**.
