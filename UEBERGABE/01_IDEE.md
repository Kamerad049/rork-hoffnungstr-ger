# 01_IDEE.md — Die Idee hinter dem Projekt

> Erstellt: 2026-10-02 · Quellen: Gespräche mit dem Projektinhaber (Aug.–Okt. 2026), `HANDOVER.md`, `HANDOVER_FEATURES.md`, Git-Verlauf.
> Alles, was hier steht, wurde vom Projektinhaber so gesagt oder entschieden. Nicht Rekonstruierbares ist als „unbekannt" markiert.

---

## 1. Was ist die App?

**Name:** Hoffnungsträger

**Kurzfassung:** Eine soziale Community-App für ein deutsch(-konservativ)-patriotisches
Themenkreis-Publikum. Menschen besuchen historische Orte in Deutschland, sammeln dort
**Stempel** (wie einen Stempel-Pass), steigen in einem **Rang-System** auf (15 Ränge, XP,
Orden), und treffen sich in einem sozialen Netzwerk drumherum: Feed, Stories, Reels,
Direkt-Chat, Freundschaften, Live-Karte. Dazu kommt eine Fitness-Plattform
(**„Kaderschmiede"**: Trupps, Challenges, Check-ins, Workouts) und ein komplettes
Admin-Panel mit Moderation, News, Werbe- und Sponsoren-Verwaltung.

## 2. Für wen?

- Deutschsprachiger Markt (Deutschland, implizit auch Österreich/Schweiz — die Ortssuche
  filtert auf `countrycodes=de,at,ch`, siehe `expo/hooks/useLocationSearch.ts`).
- Menschen, die Interesse an deutscher Geschichte, Heimat und Gemeinschaft haben.
- Alter: Erwachsene (die Registrierung fragt Geschlecht und Religion ab — `expo/app/register.tsx`).

## 3. Welches Problem löst sie?

- Es gibt keine zentrale, motivierende Plattform, die historische Orte in Deutschland
  „sammelbar" macht (Sammler-/Gamification-Motiv: Stempel-Pass, Ränge, Orden).
- Bestehende soziale Netzwerke passen nicht zum gewünschten Themenkreis und Wertegerüst
  (15 „Leitsätze", Charakter-Werte — Definitionen in `expo/constants/orden.ts` und
  `expo/mocks/leitsaetze.ts` bzw. `expo/mocks/leitsaetze.csv`).

## 4. Leitgedanke (so wie er im Gespräch immer wieder klang)

- **Sammler-Motivation:** Orte besuchen → Stempel → Rang/Orden → Status in der Community.
- **Gemeinschaft:** Alles ist sozial (Feed, Freunde, Trupps, Rangliste).
- **Hochwertig & ehrlich:** Die App soll sich so poliert anfühlen wie moderne
  Großplattformen (Instagram als Maßstab genannt), obwohl der Betreiber ein Einzelner ist.
- **Kosten-Kontrolle:** Der Betreiber will bei tausenden Nutzern nicht in Kostenfallen
  (Media-Traffic, Videos) tappen. Sparsame Architektur ist ein Ziel, kein Zufall.
- **Unabhängigkeit („was habe ich in der Hand?"):** Daten und Code müssen portabel sein.
  Der Betreiber will nicht von der Bau-Plattform (Rork) abhängig sein. Deshalb gibt es
  diese Übergabe-Dokumentation.
- **Ästhetik (bindend, vom Inhaber festgelegt):**
  - Dunkles Design: Hintergrund `#141416` / `#0f0f10`
  - Gold `#BFA35D`, Cream `#E8DCC8`, Kupfer als Akzentvariante
  - **Verboten: BLAU als Akzentfarbe** (ausdrückliche Nutzer-Entscheidung)
  - Neumorphismus: nur optional als Test; auf der Profilseite abgelehnt
  - Schrift: Inter; Icons: `lucide-react-native`

## 5. Alle bekannten Wünsche, Ziele und Entscheidungen des Inhabers

(Datum = so weit aus dem Gesprächs-/Git-Verlauf rekonstruierbar; „unbekannt" = nicht mehr datierbar)

| Datum | Entscheidung / Wunsch |
|---|---|
| unbekannt (früh, vor 2026-03) | App-Idee: Orte sammeln + Community, Name „Hoffnungsträger" |
| 2026-03-27 | Große Erst-Generierung der App durch Agenten (viele Commits an einem Tag, siehe `07_CHRONIK.md`) |
| 2026-06-05 | Wunsch: Beispiel-Orte auch auf der Startseite zeigen (Git-Commit „Beispiel-Orte werden nun auch auf der Startseite angezeigt") |
| 2026-06-21 | Weitere Ausbau-Phase (mehrere Commits, Details unbekannt) |
| 2026-08-31 | Forderung: **Nichts einfach umbauen — erst Plan, dann explizites „Go"** („NIX EINFACH UMBAUEN!") |
| 2026-08-31 | Sorge vor Kostenfallen bei Medien; Beschluss: Client-Komprimierung, Thumbnails, Videos erst mal weglassen (heute §7 in `HANDOVER.md`) |
| 2026-08-31 | Wunsch nach vollständiger Übergabe-Fähigkeit („was habe ich in der Hand") |
| 2026-09-01 | Spiele-Tab aus der Tab-Leiste nehmen, aber Code behalten (`expo/app/(tabs)/_layout.tsx`, `href: null`) |
| 2026-09-01 | Spotify-Widget ausblenden (gated hinter `{false && …}`, `expo/app/(tabs)/profile/index.tsx` Zeile 954) — Weiterverfolgen ja/nein: **offen** |
| 2026-09-01 | Komplettes Feature-Audit beauftragt → `HANDOVER.md` + `HANDOVER_FEATURES.md` |
| 2026-09-01 | Stempel-Verifikations-Modell gebilligt (3 Stufen: GPS-Plausibilität → Foto/EXIF → Orts-Quiz/QR), dokumentiert in `HANDOVER.md` §11 — **nicht umgesetzt** |
| 2026-10-02 | Handover-Dateien als Download in eigenes Supabase-Projekt gebracht (Supabase Edge Function `serve-handover`) |
| 2026-10-02 | **Entscheidung: Native App statt PWA** (Begründung: Stempel/GPS/Kamera/Push brauchen native Fähigkeiten; PWA später evtl. zusätzlich) |
| 2026-10-02 | Auftrag dieser Übergabe-Dateien (`UEBERGABE/`) |

## 6. Zielplattformen und Markt

| Feld | Stand |
|---|---|
| Primärplattform | **iOS + Android als native App** (Expo/React Native; Entscheidung 2026-10-02) |
| Web/PWA | Aktuell nur Nebensache; R2-Download-/Web-Ideen später. Expo-Web ist technisch möglich, aber ungeprüft |
| Sprache der Oberfläche | Deutsch (durchgängig) |
| Zielmarkt | Deutschland (Ortssuche inkl. AT/CH: `expo/hooks/useLocationSearch.ts`) |
| Vertrieb (geplant) | App Store + Google Play; Kosten dem Inhaber bekannt (Apple 99 $/Jahr, Google 25 $ einmalig) |

## 7. Was der Inhaber selbst noch weiß / kann

- Er kennt nur noch „die Grundidee" (seine eigene Aussage, 2026-10-02).
- Er ist kein Entwickler; alles Technische muss aus diesen Dateien ersichtlich sein.
- Zugang zu seinem Supabase-Konto und zur Rork-Projektseite hat er (Zugangsdaten nur bei ihm).
