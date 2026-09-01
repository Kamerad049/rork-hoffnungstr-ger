# HANDOVER — Hoffnungsträger (Projekt-Dossier)

> **Zweck dieses Dokuments:** Damit JEDE andere KI oder Entwicklerin jederzeit weiterarbeiten kann,
> ohne dass Kontext aus früheren Gesprächen nötig ist. Dieses Dokument ist die zentrale Wahrheit
> ("Single Source of Truth") über den Ist-Zustand. Es wird bei größeren Änderungen aktualisiert.
>
> Letzte Aktualisierung: 2026-09-01
> Begleitdokument: **`HANDOVER_FEATURES.md`** — das VOLLSTÄNDIGE Feature-Inventar
> (jeder Screen, jede Komponente, jeder Provider, alle Easter Eggs wie die Sonnenuhr,
> alle Demo-/Mock-Stellen, kompletter Supabase-Tabellen-Katalog). Beide Dokumente zusammen
> sind die Übergabe-Basis für jede weitere KI / jeden Entwickler.

---

## 1. WAS IST DAS FÜR EIN PROJEKT?

**"Hoffnungsträger"** — eine soziale Community-App (Expo / React Native) für einen
deutsch-konservativ-patriotischen Themenkreis: Orte deutscher Geschichte besuchen & stempeln,
Feed/Reels/Stories, Freundschaften, Chat, Rangsystem (15 Ränge, XP), Fitness-Plattform
"Kaderschmiede", Live-Karte, Admin-Panel mit komplettem Moderations-/News-/Werbe-System.

| Feld | Wert |
|---|---|
| App-Name | Hoffnungsträger |
| Expo slug | `deutsch-schreiben-mit-mir` |
| Bundle ID | `app.rork.deutsch-schreiben-mit-mir` |
| Ordner | `expo/` (dort liegt ALLES Code) |
| Stack | Expo SDK 54, React Native 0.81.5, TypeScript (strict), expo-router, React Query, Supabase |
| Paketmanager | **bun** (nie npm/yarn) |
| Sprache der UI | Deutsch |

---

## 2. WICHTIG: WAS IST PORTABEL, WAS IST RORK-SPEZIFISCH?

| Gehört dem Nutzer & ist portabel | Rork-spezifisch (ersetzbar) |
|---|---|
| Der gesamte Code in `expo/` (Standard-TS) | Vorschau/Streaming der App in Rork |
| Supabase-Projekt & Daten (eigenes Konto) | Rork CI-Builds |
| `expo/.env` (Supabase-Schlüssel) | Rork-Auth-Proxy-Env-Variablen |
| Design, Konzepte, SQL-Skripte | `rork.json` (Projektmanifest) |

**Migration zu einem anderen Agenten/Entwickler = Ordner `expo/` + dieses Dokument + Supabase-Zugang.** Mehr nicht.

---

## 3. ARCHITEKTUR-ÜBERBLICK

### 3.1 Datenfluss (wichtig!)
Die App liest/schreibt **direkt mit dem Supabase-Client** (`expo/lib/supabase.ts`) auf die
Datenbank — geschützt durch **RLS-Policies** (Row Level Security). Es gibt KEIN klassisches
Backend zwischen App und DB.

- `expo/backend/trpc/` (Hono + tRPC) ist ein **nur-Demo-Restand**: speichert in in-memory Maps,
  inkl. Plaintext-Passwörtern. **Wird von den echten Flows NICHT benutzt.** Kandidat für Entfernung.

### 3.2 Ordnerstruktur

```
expo/
├── app/                  # Screens (expo-router; Dateiname = Route)
│   ├── _layout.tsx       # Root: Provider-Kette, Fonts, Notifications
│   ├── (tabs)/_layout.tsx# Tab-Bar & Sichtbarkeit (inbox + spiele: href:null = versteckt)
│   ├── (tabs)/           # home, feed, cuisine, places, stamps, ranking,
│   │                     # profile, livemap, kaderschmiede (+ inbox/spiele versteckt)
│   ├── admin/            # 17 Admin-Screens (news, places, restaurants, posts, users,
│   │                     # reports, submissions, push, moderators, sponsors, promotions, ...)
│   ├── login.tsx / register.tsx
│   ├── user-profile.tsx / user-posts.tsx / user-friends.tsx / user-stamps.tsx
│   ├── user-reel-feed.tsx / story-viewer.tsx / direct-chat.tsx
│   ├── submit-suggestion.tsx / moderation-history.tsx / location-posts.tsx
│   └── ...
├── providers/            # ~20 Provider (siehe 3.3)
├── hooks/                # useContent, useLocationSearch, useStampPass, useNetworkStatus, ...
├── components/           # FeedCard (1261 Zeilen!), PostCard, OrdenBadge, GermanyMap, ...
├── constants/            # types.ts, kaderschmiede.ts, germany_map_data, Theme, Orden-Definitionen
├── lib/                  # supabase.ts (Client), mapDb.ts (DB→App-Typ-Mapping)
├── supabase/             # SQL-Skripte: COMPLETE_SCHEMA.sql (VOLLES Schema, idempotent)
│                         # + einzelne Migrationen (z.B. migration_kaderschmiede.sql)
├── backend/trpc/         # Demo-Restand (NICHT produktiv, s. 3.1)
└── .env                  # Supabase URL + anon/publishable Key (öffentlich, kein Secret)
```

### 3.3 Wichtige Provider (in `app/_layout.tsx` verkettet)

| Provider | Zuständigkeit |
|---|---|
| `AuthProvider` | Supabase Auth-Session, Login/Registrier/Logout, `isAdmin` (aus `users.is_admin`), Reset-Password (ohne SMTP tot) |
| `ThemeProvider` | Dark-Theme Farbsystem |
| `AlertProvider` | Custom Alert-Dialoge (`showAlert`) |
| `PostsProvider` | Feed-Posts, Likes, Saves (React Query + Supabase) |
| `FriendsProvider` | Freundschaften, Anfragen, Blockieren |
| `AdminProvider` / `ModerationProvider` / `PromotionProvider` | Admin/Moderation/Werbung |
| `KaderschmiedeProvider` | Trupps, Challenges, Check-ins, Workouts |
| `LiveLocationProvider` | Live-Standort-Teilen (Genauigkeit/Dauer/Audience) |
| `StoryProvider`, `ChatProvider`, ... | Stories & Direkt-Chat (Realtime) |

### 3.4 Hooks
- `hooks/useContent.ts` → News, Orte, Restaurants von Supabase; **präpendet DEMO_PLACES**
  (3 Brandenburger-Tor-Varianten mit PNG) — **temporärer Demo-Inhalt, später entfernen!**
- `hooks/useLocationSearch.ts` → Live-Ortssuche via Nominatim-OpenStreetMap-API
  (`countrycodes=de,at,ch`, 400ms Debounce, min. 2 Zeichen). Benutzt in `feed/create.tsx` + `EditPostModal`.
- `hooks/useStampPass.ts` → Stempel-/Rang-Logik

---

## 4. DATENBANK (Supabase)

- URL: `https://cyrjtpnjclwchhorqwkr.supabase.co` — Schlüssel in `expo/.env`.
- **~47 Tabellen.** Vollständiges, idempotentes Schema: `expo/supabase/COMPLETE_SCHEMA.sql`
  (Stand 2026-03-03; enthält u.a. in TEIL 48 die Helper-Funktion `public.is_admin()` als SECURITY DEFINER).
- RLS auf allen Tabellen aktiv; Admin-Rechte = `users.is_admin = true`.
- `users`-Tabelle: Profilfelder (display_name, bio, rank, xp, birthplace, residence, bundesland,
  privatsphäre-Felder, is_admin).
- Echte Datenpfade: posts, post_likes, comments, stories, messages (Realtime), places,
  restaurants, reviews, news, reports, moderation_*, sponsors, promotions, kaderschmiede-*, stamps.

**Wichtig für neue KI:** Neue Tabellen → SQL in `expo/supabase/` ergänzen (migrations-Prinzip beibehalten).

### Bekannte Konten (Stand Audit)
- Admin: `maverick.offiziell@gmail.com` (id `589ba521-...`, `is_admin: true`, Anzeige "Hoffnungsträger")
- 2. Nutzer: `coolesockestore@gmail.com` (`is_admin: false`)
- Admin-Zugang in-App: Profil → Einstellungen → "Admin Panel" (gated auf `user?.isAdmin`)
- Passwörter: NICHT aus Code lesbar (Supabase-Hash). Reset nur über Supabase Dashboard möglich,
  solange kein Maildienst eingerichtet ist.

---

## 5. DESIGN-SYSTEM (BINDEND!)

| Token | Wert |
|---|---|
| Dark-Hintergrund | `#141416` / tiefer `#0f0f10` |
| Gold (Akzent) | `#BFA35D` |
| Cream | `#E8DCC8` |
| Kupfer | Akzentvariante in Theme |
| **VERBOTEN** | **KEIN BLAU** (Nutzer-Entscheidung!) |
| Neumorphismus | Nur optional als Test — Nutzer lehnte ihn auf Profilseite ab |

Icons: `lucide-react-native`. Bewegung: Reanimated/Animated, Haptics bei Aktionen.

---

## 6. BEKANNTER IST-ZUSTAND: FERTIG / HALBFERTIG / KAPUTT

### ✅ Läuft
- Komplette Navigation (8 Tabs sichtbar, Deep-Screens), Auth inkl. Registrierung (Gender/Religion)
- Feed (Likes, Kommentare, Saves), Stories, Reels, Direkt-Chat (Realtime)
- Freunde-System, Blockieren, Privatsphäre-Einstellungen
- Orte/Restaurants/Bewertungen/Favoriten, Stempel-Pass, Ranking, 15-Rang-XP-System
- Kaderschmiede komplett, Live-Karte (Location-Sharing), News
- Admin-Panel komplett (17 Screens)
- Spiele engines (Connect4, ShadowCards, Lobby) — Tab versteckt, Code bleibt erhalten

### ⚠️ Halbfertig / bewusst versteckt
- **Spiele-Tab:** `href: null` in `app/(tabs)/_layout.tsx` — Absicht, kann zurückkommen
- **Spotify-Widget** (`NowPlayingWidget`): gated hinter `{false && ...}` — keine OAuth-Anbindung
- **Demo-Orte** in `hooks/useContent.ts` (DEMO_PLACES) — entfernen sobald echte Orte in DB sind
- **tRPC-Backend** (`expo/backend/`) — Demo, entfernen ODER ignorieren

### 🔴 Kaputt / fehlt (priorisierte TODOs)
1. **Feed-Bild-Upload FUNKTIONIERT NICHT:** `feed/create.tsx` → `PostsProvider.createPost`
   speichert nur den **lokalen Geräte-URI** (`file:///...`) in `posts.media_urls`.
   Andere Nutzer sehen nichts. → Fix: zentraler Upload-Dienst (s. §7).
2. **E-Mail-Dienst fehlt:** Kein SMTP/Resend konfiguriert → Passwort-Reset & Verifizierung tot.
   Fix: Supabase Dashboard → Authentication → SMTP (z.B. Resend, gratis bis 3.000 Mails/Monat).
3. **Push:** Nur lokale Notifications. Remote-Push (Expo Push Token + Edge Function) fehlt.
   Admin-Push-Screen existiert, sendet lokal.
4. **Monetarisierung (RevenueCat):** Nur im README erwähnt, kein Code.
5. **GDPR/Rechtliches:** Keine Datenschutzerklärung, kein Impressum, keine Account-Löschung.
6. **Media-Upload ohne Komprimierung** in AdminImagePicker + create-trupp (volles Original hochgeladen).

---

## 7. BESCHLOSSENE PLANUNG: MEDIEN-UPLOAD (NOCH NICHT UMGESETZT)

Ziel: Ein **zentraler Upload-Dienst** (eine Datei, z.B. `expo/lib/mediaUpload.ts`), den alle
Screens nutzen — statt der aktuellen Zersplitterung. Prinzipien (Kostenfalle vermeiden):

1. **Client-Komprimierung vor Upload** (expo-image-manipulator: max 1440px, JPEG ~0.7) → ~300KB statt 5MB
2. **Thumbnail** (~400px, ~30KB) parallel speichern; Feed-Listen laden nur Thumb
3. **Direkt-Upload Handy → Supabase Storage** (kein Server-Hop)
4. **Bucket-Struktur:** öffentlicher Bucket `media`, Ordner `posts/{user_id}/...`; RLS erzwingt
   Eigen-Ordner-Zugriff; Dateiname `{timestamp}_{rand}_full.jpg` / `_thumb.jpg`
5. **Videos: Start OHNE Videos** (oder hartes Limit, z.B. 15–30s / 50MB) — größte Kostenfalle
6. Bestehende Admin-Uploads (Bucket `admin-uploads`) bleiben wie sie sind; neue laufen über den Dienst
7. Später optional: Wechsel auf Cloudflare R2 (Egress kostenlos) — dank zentraler Datei an einer Stelle tauschbar

Kostenlogik: Mit Komprimierung+Thumbnails ist Supabase Storage bis weit über Startphase hinaus
im Free/25$-Tarif ausreichend. R2 als Wachstumsoption dokumentiert.

---

## 8. ENTWICKLUNGS-KONVENTIONEN (für jede weitere KI)

- **TypeScript strict**, explizite Typen (`useState<Type[]>([])`), `?.`/`??`, `as const` bei Style-Literalen
- **React Query** für Server-State (Objekt-API, stabile queryKeys in `queryKeys`)
- Shared State über Provider mit `@nkzw/create-context-hook` — **nie bare `createContext`**, kein zustand
- AsyncStorage nur innerhalb von Providern
- React Compiler ist NICHT aktiv → manuelles `useCallback`/`useMemo`/`React.memo`
- Neue Screens: in `expo/app/` anlegen (Routing = Dateisystem); Icons aus `lucide-react-native`
- Fehlerbehandlung: User-freundliche deutsche Meldungen, konsolige `console.log('[TAG] ...')`-Logs
- Keine Secrets im Code (Client-Env nur `EXPO_PUBLIC_*`)
- **Vor Abgabe: `runChecks` (appPath: "expo") bestehen lassen**

---

## 9. SO WIRD LOCALL GESTARTET

```bash
cd expo
bun install
bun expo start        # dann iOS/Android-Simulator oder Expo Go
```

Env-Variablen stehen in `expo/.env` (Supabase URL + publishable/anon Key — die sind bewusst
öffentlich, RLS schützt die Daten).

Datenbank komplett neu aufsetzen: SQL-Skripte in `expo/supabase/` in Reihenfolge ausführen
(COMPLETE_SCHEMA.sql ist idempotent + danach Migrationen).

---

## 10. OFFENE ENTSCHEIDUNGEN (vom Produktinhaber zu klären)

1. Videos im Feed: ja (mit Limit) / nein?
2. Thumbnails im Feed: Zustimmung stand aus
3. Spotify-Feature: weiterverfolgen oder streichen?
4. Spiele-Tab: zurück in die Tab-Bar wann?
5. Monetarisierung: Abo-Modell (RevenueCat) überhaupt gewünscht?
6. Branding: Splash-Screen nutzt noch generisches Icon statt `heldentum-splash.jpg`
7. Stempel-Verifikation: Dreistufen-Modell (§11) — ab welcher Stufe für welche Orte?

---

## 11. BESCHLOSSENE PLANUNG: STEMPEL-VERIFIKATION (NOCH NICHT UMGESETZT)

**Problem:** GPS allein ist trivial fälschbar (Fake-GPS-Apps). Ziel: Betrug teurer machen
als der Stempel wert ist — mehrstufige Verifikation statt 100%-Schutz.

**Bereits vorhandene Grundlage (Kaderschmiede-Check-in als Vorbild!):** In
`app/(tabs)/kaderschmiede/checkin.tsx` existiert bereits ein funktionierendes
Anti-Cheat-Muster: 6-stelliger Code + QR, Token `KADER:{id}:{epoch}:{nonce}` mit
30 s Rotation / 60 s Gültigkeit, GPS-Radius 50 m, max. Accuracy 100 m,
**`location.mocked` → BLOCKIERT**. Dieses Muster auf den Stempel-Check-in übertragen
(`app/(tabs)/stamps/checkin.tsx`, aktuell nur Distanz + Foto).

### Serverseitige Grundprüfung (Stufe 1, Pflicht für alle Orte)
- Validierung NUR serverseitig (Supabase RPC/Edge Function), dem Client nicht vertrauen
- Plausibilität: GPS-Genauigkeit, **Teleport-Erkennung** (Position 5 min vorher zu weit weg?)
- Muster-Erkennung: viele Stempel in kurzer Zeit quer über Deutschland → Flag für Moderation
- **Zeit-in-der-Zone:** Stempel erst nach 10+ Min Aufenthalt im Umkreis

### Dreistufen-Modell
| Stufe | Für welche Orte | Mechanismen |
|---|---|---|
| 🥉 Bronze | Alle normalen Orte | GPS + Plausibilität + Zeit-in-Zone |
| 🥈 Silber | Wichtige Orte | + Foto **in der App aufgenommen** (nicht Galerie), EXIF-GPS/Timestamp-Abgleich, `location.mocked`-Block |
| 🥇 Gold | Raritäten/Premium | + **Orts-Quiz** (Frage, deren Antwort nur physisch vor Ort lesbar ist, z.B. „Welches Jahr steht auf der Tafel?" — günstig & praktisch unfälschbar) ODER physischer QR-Code am Ort (stündlich rotierend) ODER NFC-Chip |

### Ergänzend
- **Community-Kontrolle:** Verdächtige Stempel meldbar → bestehendes Moderations-System
  (`reports`) greift unverändert
- DB-Erweiterung: `places.verification_level` (bronze/silver/gold); `collected_stamps`
  erweitern um `verified_at`, `verification_data` (JSON: accuracy, dwell, photo_exif,
  quiz_answer_hash)
- Admin-Panel (`admin/places.tsx`) erweitern: Verifikations-Stufe + Quiz-Frage/Antwort pro Ort
