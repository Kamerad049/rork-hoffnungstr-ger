# 03_TECHNIK.md — Technik, Dateibaum, Start, Dienste

> Erstellt: 2026-10-02. Alle Angaben belegen sich auf die Dateien im Projekt (`expo/`).

---

## 1. Technik-Stapel (aus `expo/package.json`)

| Baustein | Version | Zweck |
|---|---|---|
| `expo` | ~54.0.33 | App-Framework (SDK 54) |
| `react-native` | 0.81.5 | UI-Laufzeit (neue Architektur aktiv: `expo/app.json` `newArchEnabled: true`) |
| `react` / `react-dom` | 19.1.0 | React-Kern |
| `expo-router` | ~6.0.17 | Dateibasierte Navigation (`expo/app/` = Routen) |
| `typescript` | ~5.9.2 | Typsicherheit (strict, `expo/tsconfig.json`) |
| `@supabase/supabase-js` | ^2.98.0 | Datenbank/Auth/Storage-Client (Init in `expo/lib/supabase.ts`) |
| `@tanstack/react-query` | ^5.83.0 | Server-State/Caching (Objekt-API; Keys in `expo/constants/queryKeys.ts`) |
| `@nkzw/create-context-hook` | ^1.1.0 | Typsichere Provider (alle `expo/providers/*`) |
| `@react-native-async-storage/async-storage` | 2.2.0 | Lokaler Speicher (nur in Providern benutzt) |
| `expo-image` / `expo-image-picker` | 3.0.11 / 17.0.9 | Bilder anzeigen (mit Cache) / auswählen |
| `expo-camera` | 17.0.10 | Kamera (Check-in-Fotos) |
| `expo-av` | 16.0.8 | Audio/Video (Sprachnachrichten) |
| `expo-location` | 19.0.8 | GPS (Check-ins, Live-Karte) |
| `expo-notifications` | 0.32.16 | Lokale Benachrichtigungen |
| `expo-haptics`, `expo-linear-gradient`, `expo-screen-capture`, `expo-splash-screen`, `expo-status-bar`, `expo-system-ui`, `expo-web-browser`, `expo-font`, `expo-constants`, `expo-file-system`, `expo-linking` | je ~SDK 54 | Plattform-Funktionen |
| `react-native-maps` | 1.20.1 | Karten (Livemap, Orte, Cuisine) |
| `react-native-svg` | 15.12.1 | Vektor-Grafik (u. a. Deutschlandkarte, Sonnenuhr) |
| `lucide-react-native` | ^0.475.0 | Icons (bindend laut Design-Vorgabe) |
| `@expo-google-fonts/inter` | ^0.4.2 | Schrift Inter |
| `hono`, `@hono/trpc-server`, `@trpc/*`, `superjson` | 4.x / 11.x | **Demo-Restand** `expo/backend/` (nicht produktiv) |
| `@rork-ai/toolkit-sdk` | ^0.2.51 | Rork-Plattform-Anbindung |
| `zod` | ^4.3.6 | Validierung |
| `react-native-web` | ^0.21.0 | Expo-Web-Unterstützung (ungeprüft) |
| Dev: `eslint` + `eslint-config-expo`, `@babel/core`, `@types/react` | — | Lint/Build |

Paketmanager: **bun** (nie npm/yarn).

## 2. Vollständiger Dateibaum (235 Dateien; ein Satz je Eintrag)

### Wurzel
- `rork.json` — Rork-Projektmanifest (App-Registrierung; von der Plattform verwaltet).
- `HANDOVER.md` — früheres Übergabe-Dossier (Architektur, Medien-Plan §7, Stempel-Plan §11).
- `HANDOVER_FEATURES.md` — früheres Voll-Inventar (Screens, Provider, Easter Eggs, Tabellen).
- `UEBERGABE/` — **diese Übergabe-Dateien**.
- `.gitignore` — ignoriert Rork-interne Ordner.

### `expo/` — Konfiguration
- `expo/package.json` — Abhängigkeiten + Start-Skripte (`bun run start` = Rork-Devserver).
- `expo/app.json` — Expo-Konfiguration: Name, Slug `deutsch-schreiben-mit-mir`, Bundle-ID `app.rork.deutsch-schreiben-mit-mir` (iOS) / `app.rork.deutsch_schreiben_mit_mir` (Android), Splash weist noch auf `./assets/images/splash-icon.png` (Zeile 13) statt `heldentum-splash.jpg`.
- `expo/tsconfig.json` — TypeScript strict.
- `expo/babel.config.js` — Babel-Preset.
- `expo/metro.config.js` — Metro-Bundler-Konfiguration.
- `expo/eslint.config.js` — Lint-Regeln.
- `expo/README.md` — Rork-Standard-README (erwähnt RevenueCat als Idee).
- `expo/.env` — Schlüssel (**nicht in Git**, siehe §4).
- `expo/.gitignore` — ignoriert `.env`, `node_modules`, native Ordner.

### `expo/app/` — Screens (Routing = Dateisystem)
- `_layout.tsx` (253 Zeilen) — Root: Provider-Kette, Fonts, Notification-Setup.
- `+not-found.tsx` — 404-Screen.
- `+native-intent.tsx` — Rork-Routen-Rest (6 Zeilen).
- `modal.tsx` — leeres Modal-Rest.
- `login.tsx` (906 Zeilen) — Anmeldung.
- `register.tsx` (669 Zeilen) — Registrierung mit Geschlecht/Religion.
- `story-viewer.tsx` (1115 Zeilen) — Stories im Vollbild.
- `direct-chat.tsx` (775 Zeilen) — 1:1-Chat.
- `user-profile.tsx` (1814 Zeilen) — fremdes Profil inkl. Tabs.
- `user-posts.tsx` — Posts eines Nutzers.
- `user-friends.tsx` — Freunde eines Nutzers.
- `user-stamps.tsx` — Stempel eines Nutzers.
- `user-reel-feed.tsx` (1524 Zeilen) — Reel-Feed.
- `submit-suggestion.tsx` — Orts-/Restaurant-Empfehlung einreichen.
- `moderation-history.tsx` — eigene Moderations-Historie/Beschwerden.
- `location-posts.tsx` — Posts zu einem Ort.

### `expo/app/(tabs)/` — Haupt-Navigation
- `_layout.tsx` (107 Zeilen) — Tab-Leiste; 4 Einträge versteckt (`href: null`, Zeilen 53/73/93/99).
- `(home)/_layout.tsx`, `index.tsx`, `article.tsx`, `activity.tsx` — Startbereich/News.
- `feed/_layout.tsx`, `index.tsx`, `create.tsx`, `comments.tsx`, `post-detail.tsx`, `image-viewer.tsx`, `create-story.tsx`, `activity.tsx` — Feed-Bereich.
- `cuisine/_layout.tsx`, `index.tsx`, `[id].tsx`, `map.tsx` — Restaurants.
- `places/_layout.tsx`, `index.tsx`, `[id].tsx`, `map.tsx` — historische Orte.
- `stamps/_layout.tsx`, `index.tsx`, `checkin.tsx` — Stempel-Pass.
- `ranking/_layout.tsx`, `index.tsx` — Rangliste.
- `profile/_layout.tsx`, `index.tsx`, `edit.tsx`, `settings.tsx`, `privacy.tsx`, `datenschutz.tsx`, `impressum.tsx`, `support.tsx`, `friends.tsx`, `saved.tsx`, `chats.tsx`, `chat.tsx`, `messages.tsx`, `ordenshalle.tsx`, `avatar-generator.tsx` — eigener Profilbereich.
- `livemap/_layout.tsx`, `index.tsx` — Live-Karte.
- `kaderschmiede/_layout.tsx`, `index.tsx`, `trupps.tsx`, `trupp-detail.tsx`, `create-trupp.tsx`, `challenges.tsx`, `challenge-detail.tsx`, `create-challenge.tsx`, `activity-detail.tsx`, `create-activity.tsx`, `checkin.tsx`, `lobby.tsx`, `map.tsx` — Fitness-/Trupp-Bereich.
- `spiele/_layout.tsx`, `index.tsx`, `connect-four.tsx`, `shadow-cards.tsx`, `lobby.tsx`, `create-room.tsx` — Spiele (versteckt).
- `inbox/_layout.tsx`, `index.tsx` — Posteingang (versteckt).

### `expo/app/admin/` — Admin-Panel (17 Dateien)
- `_layout.tsx`, `index.tsx` — Rahmen + Übersicht.
- `users.tsx`, `posts.tsx`, `places.tsx`, `restaurants.tsx`, `news.tsx` — Inhalte verwalten.
- `reports.tsx`, `submissions.tsx`, `moderation-actions.tsx`, `moderators.tsx` — Moderation.
- `push.tsx`, `push-detail.tsx`, `push-history.tsx` — Push (nur lokal).
- `sponsors.tsx`, `promotions.tsx`, `promotion-analytics.tsx` — Werbung/Sponsoren.

### `expo/providers/` — 21 Dateien (State der ganzen App)
- `composeProviders.tsx`, `DeferredProviders.tsx` — Provider-Kette/Lade-Zusammensetzung.
- `AuthProvider.ts` — Session, Login/Registrierung/Logout, `isAdmin`.
- `ThemeProvider.ts` — Design-Farben.
- `AlertProvider.ts` + `components/AlertRoot.tsx` — eigene Dialoge.
- `PostsProvider.ts` — Feed (Posts, Likes, Saves) mit React Query.
- `StoriesProvider.ts` — Stories.
- `ReelsProvider.ts` — Reels.
- `ChatProvider.ts` — Direkt-Chat (Realtime).
- `FriendsProvider.ts` — Freundschaften/Blockieren.
- `KaderschmiedeProvider.ts` — Trupps/Challenges/Check-ins/Workouts.
- `LiveLocationProvider.ts` — Standort-Teilen.
- `SocialProvider.ts` — übergreifende soziale Helfer (ungeprüft im Detail).
- `AdminProvider.ts`, `ModerationProvider.ts`, `PromotionProvider.ts` — Admin-/Moderations-/Werbe-State.
- `SpotifyProvider.ts` — Spotify (ausgeschaltet).
- `ConnectFourEngine.ts`, `ShadowCardsEngine.ts`, `LobbyEngine.ts` — Spiel-Logik (Bots inklusive).

### `expo/hooks/` — 10 wiederverwendbare Hooks
- `useContent.ts` — News/Orte/Restaurants aus Supabase; **präpendet 3 Demo-Orte** (Zeilen 11, 109).
- `useLocationSearch.ts` — Ortssuche via Nominatim/OpenStreetMap (`de,at,ch`, 400 ms Debounce).
- `useStampPass.ts` — Stempel-/XP-/Rang-Logik.
- `useOrden.ts` — Orden-Fortschritt.
- `useReviews.ts`, `useFavorites.ts`, `useCanEditContent.ts`, `useUserLookup.ts`, `useNetworkStatus.ts`, `useNotifications.ts`.

### `expo/components/` — 48 wiederverwendbare Bausteine
- `FeedCard.tsx` (1261 Zeilen) — Post-Karte im Feed (größte Komponente).
- `PostCard.tsx`, `NewsCard.tsx`, `PlaceCard.tsx`, `RestaurantCard.tsx`, `SponsoredCard.tsx`, `QuoteCard.tsx` — Karten-Typen.
- `StoryBar.tsx`, `StoryRing.tsx` — Stories-Leiste/Ring.
- `OptimizedImage.tsx`, `Skeleton.tsx`, `OfflineBanner.tsx`, `ErrorBoundary.tsx` — Performance/Stabilität.
- `AdminImagePicker.tsx`, `AdminDeleteModal.tsx`, `EditPostModal.tsx`, `ReportModal.tsx`, `AppealModal.tsx`, `ShareModal.tsx`, `CustomAlert.tsx` — Admin/Interaktions-Dialoge.
- `ReviewSection.tsx`, `StarRating.tsx`, `ReactionIcons.tsx`, `FloatingReactions.tsx` — Bewertungen/Reaktionen.
- `GermanyMap.tsx` (+ `constants/germany_map_data.ts`) — Deutschland-Karte als SVG.
- `RadarChart.tsx`, `ThreatGauge.tsx` — Diagramme (Charakter-Werte/Gefahren-Anzeige).
- `OrdenBadge.tsx`, `OrdenCeremony.tsx`, `WaxSealCeremony.tsx`, `WaxSealStamp.tsx`, `RankIcon.tsx` — Orden/Rang-Visualisierung.
- `SunDial.tsx` (488 Zeilen) — Sonnenuhr-Easter Egg (astronomische Berechnung lokal).
- `WavingFlag.tsx`, `MonumentIcon.tsx`, `MonumentRatingIcon.tsx`, `BrezelIcon.tsx`, `BrezelRatingIcon.tsx`, `GenderIcon.tsx`, `LatinCrossIcon.tsx`, `OrthodoxCrossIcon.tsx` — Deko/Fach-Icons.
- `NowPlayingWidget.tsx` — Spotify-Widget (ausgeschaltet).
- `VoiceMessageBubble.tsx` — Sprachnachricht im Chat.
- `chat/ChatHeader.tsx`, `chat/ChatInputArea.tsx`, `chat/ChatMessageItem.tsx`, `chat/types.ts` — Chat-Bausteine.

### `expo/lib/` — 8 Hilfsdateien
- `supabase.ts` — Supabase-Client (liest `EXPO_PUBLIC_*`).
- `mapDb.ts` — DB-Zeilen → App-Typen.
- `geo.ts` — Entfernungs-/Geo-Helfer.
- `orders.ts` — Orden-Logik.
- `perf.ts` — Performance-Helfer.
- `trpc.ts` — tRPC-Client (nur für Demo-Backend).
- `userCache.ts` — Nutzer-Cache.
- `utils.ts` — Allgemeine Helfer.

### `expo/constants/` — 8 Definitionsdateien
- `types.ts` — zentrale Typen.
- `colors.ts`, `fonts.ts` — Design-Tokens.
- `orden.ts` — 29 Orden-Definitionen (Bronze→„Legendaer").
- `kaderschmiede.ts` — Kader-Konstanten (inkl. Check-in-Sicherheitswerte).
- `games.ts` — Spiele-Konfiguration.
- `germany_map_data.ts` — Koordinaten/Geometrie für Deutschlandkarte.
- `queryKeys.ts` — zentrale React-Query-Keys.

### `expo/mocks/`
- `leitsaetze.ts`, `leitsaetze.csv` — 365 „Leitsätze" (Tageszitate).

### `expo/backend/` — **Demo-Restand (NICHT produktiv)**
- `hono.ts` — Hono-Server mit tRPC-Mount.
- `trpc/app-router.ts`, `trpc/create-context.ts`, `trpc/storage.ts` — Router/Kontext/**In-Memory-Speicher inkl. Plaintext-Passwörtern**.
- `trpc/routes/posts.ts`, `users.ts`, `messages.ts`, `stories.ts`, `stamps.ts`, `media.ts` — Demo-Endpunkte.

### `expo/supabase/` — 15 SQL-Skripte
- `COMPLETE_SCHEMA.sql` — **volles, idempotentes Schema** (47 Tabellen, TEIL 0–49, inkl. RLS + `is_admin()`); Kopie in `UEBERGABE/schema.sql`.
- `COMPLETE_SETUP.sql`, `KOMPLETT_AUSFUEHREN.sql` — ältere Aufbau-Skripte (durch COMPLETE_SCHEMA ersetzt, Historie).
- `SCHRITT_1_TABELLEN.sql`, `SCHRITT_2_CONSTRAINTS.sql`, `SCHRITT_3_FUNKTIONEN.sql`, `SCHRITT_4_RLS_POLICIES.sql`, `SCHRITT_5_INDEXES_SEED.sql` — alte 5-Schritte-Aufteilung (durch COMPLETE_SCHEMA ersetzt, Historie).
- `migration_checkin.sql`, `migration_kaderschmiede.sql`, `migration_moderation_actions.sql`, `migration_posts_fields.sql`, `migration_promotions_rls.sql`, `migration_promotions_tables.sql`, `orders_migration.sql` — nachgelagerte Migrationen (Reihenfolge: siehe `04_DATEN.md`).

### `expo/assets/images/` — 10 Bilder
- `icon.png`, `adaptive-icon.png`, `favicon.png`, `splash-icon.png` — generische App-Icons/Splash.
- `heldentum-splash.jpg` — **eigenes Branding-Splash-Bild (noch nicht eingebunden)**.
- `login-bg.png`, `login-bg-dark.png` — Login-Hintergrund.
- `brandenburgertor.png` — Bild der Demo-Orte.
- `floating-card.png`, `slider-button.png` — UI-Grafiken.

## 3. Lokal starten / bauen / auf ein Gerät bringen

```bash
# 1. Voraussetzung: bun installiert (https://bun.sh)
cd expo
bun install

# 2. Schlüssel: expo/.env anlegen (siehe §4)

# 3. Datenbank: SQL-Skripte im Supabase-SQL-Editor ausführen
#    (nur bei leerem Projekt): expo/supabase/COMPLETE_SCHEMA.sql,
#    danach die 7 migration_*.sql in der Reihenfolge von 04_DATEN.md §3

# 4. Entwicklung starten
bun run start          # Expo-Dev-Server (über Rork-CLI)
#   → iOS-Simulator / Android-Emulator / Expo Go

# 5. Produktiv-Build (auf echtem Gerät vertreiben):
#    Expo EAS Build (bunx eas build) — im Rork-Sandbox-Workflow NICHT verfügbar;
#    muss der Inhaber auf eigenem Rechner/Account machen.
```

Hinweise:
- Einproduktions-Builds sind hier noch nie gelaufen (**ungeprüft**). `app.json` hat keine Signing-/Store-Einstellungen.
- Der Rork-Preview (Cloud-Simulator) startet die App über `bun run start` automatisch.

## 4. Umgebungsvariablen (NUR Namen — keine Werte!)

Datei: `expo/.env` (in Git **nicht** enthalten, `expo/.gitignore`). Vorhandene Namen:

| Name | Zweck |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Adresse des Supabase-Projekts (öffentlich gedacht) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | öffentlicher Supabase-Schlüssel (RLS schützt Daten) |
| `EXPO_PUBLIC_RORK_AUTH_URL` | Rork-Auth-Dienst |
| `EXPO_PUBLIC_RORK_API_BASE_URL` | Rork-Dev-API |
| `EXPO_PUBLIC_RORK_FUNCTIONS_URL` | Rork-Backend-URL |
| `EXPO_PUBLIC_RORK_TOOLKIT_SECRET_KEY` | Rork-Toolkit-Schlüssel |
| `EXPO_PUBLIC_TOOLKIT_URL` | Rork-Toolkit-Adresse |
| `EXPO_PUBLIC_PROJECT_ID` | Rork-Projekt-ID |
| `EXPO_PUBLIC_TEAM_ID` | Rork-Team-ID |
| `SUPABASE_SERVICE_ROLE_KEY` | **geheimer** Supabase-Admin-Schlüssel (Privat-Umgebung; in `expo/.env` landete hier ein `sbp_…`-CLI-Token, kein echtes JWT — siehe `05_KRITISCH.md`) |

Alle `EXPO_PUBLIC_*` landen im App-Bundle und sind daher öffentlich — dafür ist nur die Supabase-Anon-Key-Variante gedacht.

## 5. Externe Dienste

| Dienst | Anbieter | Zweck | Zustand | Kosten | Zugangsdaten liegen bei |
|---|---|---|---|---|---|
| Datenbank/Auth/Storage | Supabase (Projekt `cyrjtpnjclwchhorqwkr`, Region EU) | Alles: Tabellen, Anmeldung, Bild-Speicher | produktiv | Free-Tarif; Upgrade nötig bei Wachstum | Inhaber (Supabase-Konto) |
| Karten | Apple/Google Maps via `react-native-maps` | Livemap, Orte | produktiv | SDK-Key über Expo-Standard (ungeprüft auf echten Geräten) | — |
| Ortssuche | Nominatim (OpenStreetMap) | Ortsuche im Feed | produktiv | gratis (Fair-Use!) | — |
| E-Mail (SMTP) | **keiner** | Passwort-Reset, Verifizierung | **fehlt** | Resend o. ä.: gratis bis ~3.000 Mails/Monat | — |
| Push (remote) | **keiner** | Benachrichtigungen | **fehlt** (nur lokal; Expo-Push wäre Weg) | Expo-Push gratis | — |
| Bezahlung | **keiner** (RevenueCat nur erwähnt in `expo/README.md`) | Abo/In-App-Kauf | nicht begonnen | RevenueCat gratis bis 2.500 $/Monat Umsatz | — |
| KI-Dienste | **keiner** | — | — | — | — |
| Rork-Plattform | Rork | Bau/Vorschau/CI dieser Sandbox | aktiv | im Rork-Abo enthalten | Inhaber (Rork-Konto) |
| Supabase Edge Function `serve-handover` | Supabase | liefert `HANDOVER.md`/`HANDOVER_FEATURES.md` als Download | aktiv | gratis | — |
