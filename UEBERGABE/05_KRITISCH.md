# 05_KRITISCH.md — Was fehlt, was kaputt ist, was Attrappe ist

> Erstellt: 2026-10-02. Alles mit Datei+Zeile belegt, soweit durch Code-Leseprüfung verifiziert.
> Punkte aus dem früheren Audit (2026-09), die diesmal nicht neu geprüft wurden, sind als
> „Audit 2026-09, diesmal ungeprüft" gekennzeichnet.

---

## 1. Zwingend fehlend, BEVOR echte Menschen in die App dürfen

| # | Punkt | Warum kritisch |
|---|---|---|
| 1 | **Datenschutzerklärung + Impressum mit echten Angaben** | Screen existieren, aber mit Platzhalter-Text: `expo/app/(tabs)/profile/datenschutz.tsx`, `expo/app/(tabs)/profile/impressum.tsx`. In Deutschland rechtlich Pflicht |
| 2 | **Konto-Löschen-Funktion** | Keine Account-Selbstlöschung im Code (Audit 2026-09). DSGVO-Pflicht. Apple/Google verlangen sie im Store |
| 3 | **Passwort-Reset per E-Mail** | Kein SMTP-Dienst eingerichtet (Supabase Dashboard → Authentication → SMTP). Nur der Admin kann Passwörter aktuell zurücksetzen |
| 4 | **Feed-Bild-Upload reparieren** | Siehe §2, Fehler #1 — Kernfunktion ist für andere Nutzer unsichtbar |
| 5 | **Stempel-Check-in serverseitig prüfen** | Aktuell client-getreu → manipulierbar (siehe §2, Fehler #4) |
| 6 | **Remote-Push oder Feature entfernen** | Admin-Push-Screen verspricht etwas, das nicht passiert (siehe §2, Fehler #6) |
| 7 | **Crash-Berichte / Fehlermonitoring** | Nicht vorhanden (kein Sentry o. ä.). `expo/components/ErrorBoundary.tsx` fängt nur UI-Fehler ab |
| 8 | **Store-Aufbereitung** | Kein Signing, keine Screenshots, keine Store-Texte; Build-Prozess noch nie gelaufen (ungeprüft) |

## 2. Bekannte Fehler und Baustellen (mit Datei + Zeile)

| # | Fehler | Beleg |
|---|---|---|
| 1 | **Feed-Bild-Upload kaputt:** „Post erstellen" übergibt die lokale Bild-URI aus dem Picker direkt an die DB. Andere Nutzer (und nach Neustart auch der Verfasser selbst) sehen kein Bild. | `expo/app/(tabs)/feed/create.tsx` Zeile 681 (`createPost(cleanContent, imageUri ?? undefined, …)`); `expo/providers/PostsProvider.ts` Zeile 191 (`media_urls: mediaUrl ? [mediaUrl] : []`) — kein `.upload()` im Ablauf |
| 2 | **Demo-Orte im echten Inhalt:** 3 Brandenburger-Tor-Varianten werden im Code vor die echten Orte gemischt. | `expo/hooks/useContent.ts` Zeile 11 (`const DEMO_PLACES`) und Zeile 109 (`[...DEMO_PLACES, …(placesQuery.data ?? [])]`) |
| 3 | **Chat-Lesebestätigung simuliert:** Der Partner wird lokal als „gelesen" markiert, ohne dass er es tat. | `expo/providers/ChatProvider.ts` Zeile 384 (`simulatePartnerRead`), exportiert Zeile 595 |
| 4 | **Stempel-Check-in fälschbar:** Nur GPS-Distanz + Foto, alles client-seitig. Der sicherere Mechanismus existiert bereits (Kaderschmiede: GPS-Spoofing-Block, rotierende Codes — Datei `expo/app/(tabs)/kaderschmiede/checkin.tsx`), wurde aber für Stempel **nicht übernommen**. | `expo/app/(tabs)/stamps/checkin.tsx` |
| 5 | **Profil-Reels ohne echte Daten:** Reels-/Markiert-Tabs im fremden Profil speisen sich nicht aus der DB. | `expo/app/user-profile.tsx` Zeilen 289/301 (`userReels`/`taggedReels` useMemo) — Audit 2026-09, diesmal ungeprüft |
| 6 | **Push nur lokal:** Admin-Push schreibt DB-Eintrag + lokale Notification; kein Versand an andere Geräte. | `expo/app/admin/push.tsx`, `expo/hooks/useNotifications.ts` |
| 7 | **Charakter-Werte immer Null:** Die 6 Werte (Radar-Diagramm) kommen nie aus der DB. | `expo/hooks/useOrden.ts`, `expo/app/(tabs)/profile/ordenshalle.tsx` — Audit 2026-09, diesmal ungeprüft |
| 8 | **Admin-Bild-Upload unkompri­miert:** Volle Originalgröße wird hochgeladen (Kostenrisiko). | `expo/components/AdminImagePicker.tsx` Zeilen 245/268; ebenso `expo/app/(tabs)/kaderschmiede/create-trupp.tsx` Zeilen 622–668 |
| 9 | **Splash nicht gebrandet:** Generisches `splash-icon.png` statt vorhandenem `heldentum-splash.jpg`. | `expo/app.json` Zeile 13 |
| 10 | **Reels/Medien local-only:** Reel-Medien und Reaktionen persistieren laut Audit nicht serverseitig. | `expo/providers/ReelsProvider.ts`, `expo/app/user-reel-feed.tsx` — Audit 2026-09, diesmal ungeprüft |

## 3. Wo geraten / improvisiert / vorgetäuscht wurde (Attrappen-Liste)

- **Demo-Orte** (Fehler #2) — aussehen wie echte Einträge.
- **tRPC-Backend** (`expo/backend/trpc/` inkl. `storage.ts`): speichert **im Arbeitsspeicher** mit **Klartext-Passwörtern**. Wird von den echten App-Flows **nicht** benutzt — ein hinterlassener Demo-Server. → entfernen oder streng ignorieren.
- **Chat-Lesebestätigung** (Fehler #3) — täuscht Lesen vor.
- **Admin-Push** (Fehler #6) — täuscht Versand vor (nur lokal).
- **Charakter-Werte** (Fehler #7) — feste Nullen im Diagramm.
- **Profil-Reels-Tabs** (Fehler #5) — zeigen gefüllte Liste ohne echte Quelle.
- **Datenschutz/Impressum** — Seiten existieren mit Attrappen-Text.
- **Auskommentierter/verwaister Code:** `expo/lib/trpc.ts` (Client fürs Demo-Backend), alte Screens `expo/app/(tabs)/profile/chat.tsx` + `messages.tsx` (vom neueren `direct-chat`/`chats` ersetzt), Backup-Ordner `expo/.backup/` (alte Provider-Versionen, nicht im Dateibaum von Git — lokal vorhanden).
- **`expo/mocks/leitsaetze.ts` / `.csv`** — 365 Leitsätze als eingebaute Testdaten (bewusst so, ist inhaltlich gewollt).

## 4. Sicherheitsrisiken

| Risiko | Bewertung |
|---|---|
| `EXPO_PUBLIC_*`-Schlüssel im App-Bundle (`expo/.env`) | **Gewollt und okay**: Der Supabase-Anon-Key ist öffentlich gedacht; Sicherheit kommt aus RLS. **Aber:** Niemals geheimere Schlüssel mit `EXPO_PUBLIC_`-Präfix ablegen |
| `SUPABASE_SERVICE_ROLE_KEY` in `expo/.env` | ⚠️ **Achtung:** Datei ist nicht in Git („git ls-files" leer), aber der hinterlegte Wert ist ein `sbp_…`-CLI-Zugriffstoken mit **Management-API-Rechten** (damit wurde am 2026-10-02 eine Edge Function deployt). Ein echtes service_role-JWT ist das NICHT. Der Inhaber sollte den Token nur in sicherer Umgebung halten und bei Bedarf in Supabase (Account → Access Tokens) rotieren |
| RLS-Regeln | Alle Tabellen haben RLS (TEIL 47/49 in `UEBERGABE/schema.sql`), **aber**: Nicht jede Policy wurde Zeile für Zeile gegen Ausnutzung geprüft — vor echtem Start: Policies von Hand reviewen (besonders `anon`-Leserechte) |
| Fehlende serverseitige Prüfungen bei Stempel/Kader | Kader-Check-in ist servernah gedacht, Stempel gar nicht (Fehler #4) |
| Storage-Bucket `admin-uploads` | Öffentlich lesbar; wer hochladen darf, regeln die Storage-Policies — **ungeprüft** im Detail |
| Keine Rate-Limits | Nominatim-Ortssuche & Auth haben keine eigenen Drosseln (Fair-Use von OSM beachten) |
| Keine Secrets im Code | Es sind keine Schlüssel im Quelltext hartkodiert (Audit 2026-09; diesmal stichprobenartig bestätigt) |

## 5. Technische Schulden (was man heute anders bauen würde)

1. **Kein zentraler Medien-Upload-Dienst** — Upload-Logik verstreut und teils kaputt; geplanter Fix: `expo/lib/mediaUpload.ts` (`HANDOVER.md` §7).
2. **Demo-tRPC-Backend** liegt neben der echten Architektur und ist eine Verwechslungs-/Angriffsfläche → löschen.
3. **`FeedCard.tsx` mit 1261 Zeilen** und `user-profile.tsx` mit 1814 Zeilen — zu groß, schwer wartbar; in Teilstücke splitten.
4. **Lokale URIs in DB-Feldern** (`media_urls`, Stories, Reels, Voice) — Design-Fehler; künftig immer erst hochladen, dann öffentliche URL speichern.
5. **Alte Screens parallel zu neuen** (`profile/chat.tsx` + `messages.tsx` vs. `chats.tsx` + `direct-chat.tsx`) — Verwirrungsgefahr, aufräumen.
6. **Keine automatisierten Tests** — es existiert keine einzige Test-Datei.
7. **Kein Fehler-/Crash-Monitoring**, keine Analytics.
8. **Web/Expo-Web** wird mitgebundlet (`react-native-web`), aber nie gepflegt/geprüft.
9. **Kein `.env.example`** — neue Entwickler müssen Variablen aus Doku erraten (siehe `03_TECHNIK.md` §4).
