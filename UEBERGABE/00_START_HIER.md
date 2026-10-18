# 00_START_HIER.md — Lies mich zuerst!

> Für die übernehmende KI / Entwicklerin. Stand: 2026-10-02.

## Die App in drei Sätzen

„Hoffnungsträger" ist eine deutschsprachige Community-App (Expo/React Native, Supabase), in
der Menschen historische Orte in Deutschland besuchen und Stempel sammeln — mit Rängen (15),
Orden (29), XP und sozialem Netzwerk drumherum (Feed, Stories, Reels, Chat, Freunde,
Live-Karte). Dazu kommt die Fitness-Plattform „Kaderschmiede" (Trupps, Challenges, sicherer
GPS-Check-in) und ein komplettes Admin-Panel mit Moderation. Zielmarkt ist Deutschland; die
Oberfläche ist durchgehend deutsch; Ziel sind **native Apps** (iOS/Android) — PWA wurde
bewusst zunächst verworfen.

## Der Stand in fünf Sätzen

1. Der Code ist **umfangreich und weitgehend funktionsfähig** (~90 Screens, 21 Provider,
   47 DB-Tabellen; Detail-Inventar in `02_BESTAND.md`), aber es lief **noch nie ein echter
   Store-Build** und ein Screen-für-Screen-Lauftest ist nicht dokumentiert.
2. **Kaputt:** Eigene Feed-Bilder werden nur als lokale Geräte-URI in der DB gespeichert
   (`expo/app/(tabs)/feed/create.tsx` Zeile 681 → `expo/providers/PostsProvider.ts` Zeile 191)
   — niemand anderes sieht sie. Passwort-Reset ist tot (kein SMTP). Remote-Push fehlt
   (Admin-Push-Screen sendet nur lokal).
3. **Attrappen im echten Produkt:** 3 Demo-Orte (`expo/hooks/useContent.ts`), simulierte
   Chat-Lesebestätigung (`expo/providers/ChatProvider.ts` Zeile 384), Demo-tRPC-Backend mit
   Klartext-Passwörtern (`expo/backend/trpc/`), Platzhalter-Datenschutz/Impressum.
4. **Beschlossene, aber nicht gebaute Pläne:** zentraler Medien-Upload-Dienst mit
   Komprimierung (`HANDOVER.md` §7) und 3-stufige Stempel-Verifikation (`HANDOVER.md` §11).
5. Der Inhaber ist **kein Entwickler** und kennt nur noch die Grundidee — alle Fakten müssen
   aus diesen Dateien kommen; er trifft nur die Produkt-Entscheidungen aus `06_PLAN.md` §2.

## Die drei größten Baustellen

1. **Medien:** Upload-Dienst bauen (repariert den Feed + schützt vor Traffic-Kosten) → `06_PLAN.md` Schritt 1.
2. **Start-Voraussetzungen:** Rechtstexte, Konto-Löschung, SMTP, Policies-Review → `05_KRITISCH.md` §1.
3. **Vertrauen ins Kern-Versprechen:** Stempel-Check-in serverseitig verifizieren → `HANDOVER.md` §11.

## Lesereihenfolge der übrigen Dateien

1. `01_IDEE.md` — Idee, Werte, alle Entscheidungen des Inhabers
2. `02_BESTAND.md` — jeder Screen/jede Funktion mit Zustand
3. `03_TECHNIK.md` — Stack, Dateibaum, Start, Dienste, Umgebungsvariablen
4. `04_DATEN.md` + `schema.sql` — Datenbankmodell und Regeln
5. `05_KRITISCH.md` — Fehler, Attrappen, Sicherheitsrisiken (vor jeder Änderung lesen!)
6. `06_PLAN.md` — Prioritäten, offene Fragen an den Inhaber, Top-10-Schritte
7. `07_CHRONIK.md` — was wann gebaut/verworfen wurde
8. Ergänzend (älter, aber detailliert): `HANDOVER.md` + `HANDOVER_FEATURES.md`

## Projekt starten (Kurzform; Details: `03_TECHNIK.md` §3)

```bash
cd expo && bun install && bun run start   # Schlüssel liegen in expo/.env
```

Datenbank: `expo/supabase/COMPLETE_SCHEMA.sql` + Migrationen (Reihenfolge in `04_DATEN.md` §3).

## Grundregeln für die Arbeit am Projekt

- **TypeScript strict**, React Query für Server-State, Provider über `@nkzw/create-context-hook`.
- **Design ist bindend:** dunkel `#141416`, Gold `#BFA35D`, Cream `#E8DCC8`, **NIE Blau**, Inter, `lucide-react-native`.
- Paketmanager: **bun**. Vor Abgabe: TypeScript/Build-Prüfung bestehen lassen.
- Erst Plan, dann Änderung — der Inhaber sagt „Go" (er hat mehrfach ungewollte Umbauten gestoppt).
- Nichts erfinden; Unbekanntes als „unbekannt/ungeprüft" markieren. Keine Geheimnisse in Dateien.
