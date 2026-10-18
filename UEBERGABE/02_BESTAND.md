# 02_BESTAND.md — Was in der App existiert und wie fertig es ist

> Erstellt: 2026-10-02 · Grundlage: Code-Audit (Aug.–Okt. 2026) + diesmalige Code-Leseprüfung.
> **Ehrlichkeitshinweis:** Ein interaktiver Lauf durch jeden Bildschirm auf einem Gerät war von
> hier aus **nicht möglich**. Die Zustände beruhen auf gründlicher Code-Lektüre des bisherigen
> Audits (dokumentiert in `HANDOVER_FEATURES.md`) und Stichproben diesmal. Alles, was nicht
> durch Code-Lektüre belegt ist, ist als **„ungeprüft"** markiert.

Zustände:
- **fertig** = im Code vollständig und nach Audit funktionsfähig
- **teilweise** = Grundfunktion da, bekannte Lücken
- **Attrappe** = sieht aus wie echt, aber feste/dummy-Werte
- **geplant** = besprochen, nicht gebaut
- **ungeprüft** = Code existiert, Laufverhalten nicht verifiziert

---

## 1. Tab-Navigation (`expo/app/(tabs)/_layout.tsx`)

8 sichtbare Tabs: Home, Feed, Cuisine, Orte, Stempel, Ranking, Profil (eigentlich „Ich"), Live-Karte, Kaderschmiede.
4 Registrierungen sind per `href: null` versteckt (Zeilen 53, 73, 93, 99): **Spiele**, **Posteingang (Inbox)** und zwei weitere Tab-Einträge (genaue Zuordnung: siehe Datei). Versteckte Screens bleiben über Deep-Links erreichbar (ungeprüft).

## 2. Screens — Tab-Bereich

| Screen | Datei | Inhalt / Aktionen | Zustand |
|---|---|---|---|
| Startseite | `expo/app/(tabs)/(home)/index.tsx` | Dashboard: News, gepinnte Orte, Aktuelles, Einstieg in alle Bereiche | fertig (ungeprüft im Lauf) |
| News-Artikel | `expo/app/(tabs)/(home)/article.tsx` | Ganzen News-Artikel lesen | fertig (ungeprüft) |
| Home-Aktivität | `expo/app/(tabs)/(home)/activity.tsx` | Aktivitäten-Übersicht | teilweise (ungeprüft) |
| Feed | `expo/app/(tabs)/feed/index.tsx` | Post-Stream, Liken, Speichern, Story-Bar, Reaktionen | fertig; **Bild-Upload kaputt** (s. u.) |
| Post erstellen | `expo/app/(tabs)/feed/create.tsx` | Text + Bild + Ort + Nutzer markieren; Zeile 681 übergibt `imageUri` direkt | **teilweise/kaputt** |
| Kommentare | `expo/app/(tabs)/feed/comments.tsx` | Kommentare lesen/schreiben/löschen | fertig (ungeprüft) |
| Post-Detail | `expo/app/(tabs)/feed/post-detail.tsx` | Einzelnen Post mit Kommentaren | fertig (ungeprüft) |
| Bild-Ansicht | `expo/app/(tabs)/feed/image-viewer.tsx` | Bild groß ansehen | fertig (ungeprüft) |
| Story erstellen | `expo/app/(tabs)/feed/create-story.tsx` | Foto + Text als Story posten | teilweise — Bild wird evtl. nur lokal gespeichert (ungeprüft; gleiches Upload-Problem wie Feed) |
| Feed-Aktivität | `expo/app/(tabs)/feed/activity.tsx` | Eigene Interaktionen | teilweise (ungeprüft) |
| Küche (Cuisine) | `expo/app/(tabs)/cuisine/index.tsx` | Restaurant-Liste, Bewertungen | fertig (ungeprüft) |
| Restaurant-Detail | `expo/app/(tabs)/cuisine/[id].tsx` | Detail + Bewertungen schreiben | fertig (ungeprüft) |
| Küchenkarte | `expo/app/(tabs)/cuisine/map.tsx` | Restaurants auf Karte | fertig (ungeprüft) |
| Orte | `expo/app/(tabs)/places/index.tsx` | Historische Orte, Liste | fertig; **3 Demo-Orte gemischt** (s. u.) |
| Ort-Detail | `expo/app/(tabs)/places/[id].tsx` | Ort ansehen, stempeln, Posts am Ort | fertig (ungeprüft) |
| Orte-Karte | `expo/app/(tabs)/places/map.tsx` | Orte auf Deutschlandkarte/Karte | fertig (ungeprüft) |
| Stempel-Pass | `expo/app/(tabs)/stamps/index.tsx` | Gesammelte Stempel, Fortschritt | fertig (ungeprüft) |
| Stempel-Check-in | `expo/app/(tabs)/stamps/checkin.tsx` | GPS-Check-in + Foto | **teilweise** — nur Distanz+Foto, keine serverseitige Prüfung, manipulierbar |
| Ranking | `expo/app/(tabs)/ranking/index.tsx` | Rangliste aller Nutzer | fertig (ungeprüft) |
| Profil | `expo/app/(tabs)/profile/index.tsx` | Eigenes Profil, Avatar, Sonnenuhr (Easter Egg), Spotify (aus) | fertig (ungeprüft) |
| Profil bearbeiten | `expo/app/(tabs)/profile/edit.tsx` | Name, Bio, Bundesland, Sonnenuhr-Toggle | fertig (ungeprüft) |
| Einstellungen | `expo/app/(tabs)/profile/settings.tsx` | Konto, Admin-Einstieg, Logout | fertig (ungeprüft) |
| Privatsphäre | `expo/app/(tabs)/profile/privacy.tsx` | 10 Sichtbarkeits-Schalter | fertig (ungeprüft) |
| Datenschutz-Seite | `expo/app/(tabs)/profile/datenschutz.tsx` | **Platzhalter-Text, kein echter Rechtstext** | Attrappe |
| Impressum | `expo/app/(tabs)/profile/impressum.tsx` | **Platzhalter-Text, keine echten Angaben** | Attrappe |
| Support | `expo/app/(tabs)/profile/support.tsx` | Kontakt/Hilfe | teilweise (ungeprüft) |
| Freunde | `expo/app/(tabs)/profile/friends.tsx` | Liste, Anfragen, Blockieren | fertig (ungeprüft) |
| Gespeichert | `expo/app/(tabs)/profile/saved.tsx` | Gespeicherte Posts | fertig (ungeprüft) |
| Chats-Liste | `expo/app/(tabs)/profile/chats.tsx` | Alle Unterhaltungen | fertig (ungeprüft) |
| Chat (alt) | `expo/app/(tabs)/profile/chat.tsx` | Älterer Chat-Screen; Hauptroute ist `direct-chat` | teilweise (ungeprüft) |
| Nachrichten (alt) | `expo/app/(tabs)/profile/messages.tsx` | Ältere Nachrichten-Ansicht | teilweise (ungeprüft) |
| Ordenshalle | `expo/app/(tabs)/profile/ordenshalle.tsx` | Verdiente Orden + Zeremonie, Charakter-Werte | fertig; Charakter-Werte laut Audit immer `[0,0,0,0,0,0]` (Dateien: `expo/hooks/useOrden.ts`, `expo/app/(tabs)/profile/ordenshalle.tsx`) |
| Avatar-Generator | `expo/app/(tabs)/profile/avatar-generator.tsx` | Avatar zusammenstellen | fertig (ungeprüft) |
| Live-Karte | `expo/app/(tabs)/livemap/index.tsx` | Freunde live auf Karte (Freigabe mit Dauer/Genauigkeit) | fertig (ungeprüft) |
| Kaderschmiede-Start | `expo/app/(tabs)/kaderschmiede/index.tsx` | Fitness-Dashboard | fertig (ungeprüft) |
| Trupps | `expo/app/(tabs)/kaderschmiede/trupps.tsx` / `trupp-detail.tsx` / `create-trupp.tsx` | Gruppen verwalten, Mitglied werden; create-trupp lädt Bild hoch (unkomprimiert) | fertig / Upload unkompri­miert |
| Challenges | `expo/app/(tabs)/kaderschmiede/challenges.tsx` / `challenge-detail.tsx` / `create-challenge.tsx` | Wettkämpfe | fertig (ungeprüft) |
| Aktivitäten | `expo/app/(tabs)/kaderschmiede/activity-detail.tsx` / `create-activity.tsx` | Trainings-Aktivitäten | fertig (ungeprüft) |
| Kader-Check-in | `expo/app/(tabs)/kaderschmiede/checkin.tsx` | **Sicherster Check-in der App**: 6-stelliger Code + QR, Token `KADER:{id}:{epoch}:{nonce}` (30 s Rotation, 60 s gültig), GPS-Radius 50 m, max. Accuracy 100 m, **GPS-Spoofing (`location.mocked`) wird blockiert** | fertig |
| Lobby | `expo/app/(tabs)/kaderschmiede/lobby.tsx` | Vorbereitungs-Lobby (mit Bots) | fertig (ungeprüft) |
| Kader-Karte | `expo/app/(tabs)/kaderschmiede/map.tsx` | Trupp-Treffen auf Karte | fertig (ungeprüft) |
| Spiele-Start | `expo/app/(tabs)/spiele/index.tsx` | Spielhalle (versteckt) | fertig, versteckt |
| Connect Four | `expo/app/(tabs)/spiele/connect-four.tsx` + `expo/providers/ConnectFourEngine.ts` | Vier gewinnt (auch gegen Bots) | fertig, versteckt |
| Shadow Cards | `expo/app/(tabs)/spiele/shadow-cards.tsx` + `expo/providers/ShadowCardsEngine.ts` | Kartenspiel | fertig, versteckt |
| Spiel-Lobby | `expo/app/(tabs)/spiele/lobby.tsx` / `create-room.tsx` + `expo/providers/LobbyEngine.ts` | Räume + Bots | fertig, versteckt |
| Posteingang | `expo/app/(tabs)/inbox/index.tsx` | Benachrichtigungen (versteckt) | teilweise, versteckt |

## 3. Screens — außerhalb der Tabs

| Screen | Datei | Zustand |
|---|---|---|
| Login | `expo/app/login.tsx` | fertig; Passwort-vergessen **tot** (kein Mail-Dienst) |
| Registrierung | `expo/app/register.tsx` | fertig (Gender/Religion abgefragt) |
| Story-Viewer | `expo/app/story-viewer.tsx` (1115 Zeilen) | fertig (ungeprüft) |
| Direkt-Chat | `expo/app/direct-chat.tsx` (775 Zeilen) | fertig, Realtime; **Lesebestätigung des Partners ist simuliert** (`expo/providers/ChatProvider.ts` Zeile 384 `simulatePartnerRead`) |
| Fremdes Profil | `expo/app/user-profile.tsx` (1814 Zeilen) | fertig; Reels-Tabs liefern laut Audit **keine echten DB-Daten** (Zeilen ~289/301) |
| Nutzer-Posts | `expo/app/user-posts.tsx` | fertig (ungeprüft) |
| Nutzer-Freunde | `expo/app/user-friends.tsx` | fertig (ungeprüft) |
| Nutzer-Stempel | `expo/app/user-stamps.tsx` | fertig (ungeprüft) |
| Reel-Feed | `expo/app/user-reel-feed.tsx` (1524 Zeilen) | teilweise — Medien werden laut Audit nur lokal gespeichert; Reaktionen nicht serverseitig |
| Empfehlung einreichen | `expo/app/submit-suggestion.tsx` | fertig (ungeprüft) |
| Moderations-Historie | `expo/app/moderation-history.tsx` | fertig (ungeprüft) |
| Ort-Posts | `expo/app/location-posts.tsx` | fertig (ungeprüft) |
| Modal-Rest | `expo/app/modal.tsx` | leeres Routen-Rest |
| 404 | `expo/app/+not-found.tsx` | fertig |
| Native-Intent | `expo/app/+native-intent.tsx` | Rork-Gerüst (6 Zeilen) |

## 4. Screens — Admin-Panel (nur für `users.is_admin = true`, Einstieg: Profil → Einstellungen)

| Screen | Datei | Zustand |
|---|---|---|
| Admin-Übersicht | `expo/app/admin/index.tsx` | fertig (ungeprüft) |
| Nutzer | `expo/app/admin/users.tsx` | fertig (ungeprüft) |
| Posts | `expo/app/admin/posts.tsx` | fertig (ungeprüft) |
| Orte | `expo/app/admin/places.tsx` | fertig (ungeprüft) |
| Restaurants | `expo/app/admin/restaurants.tsx` | fertig (ungeprüft) |
| News | `expo/app/admin/news.tsx` | fertig (ungeprüft) |
| Meldungen | `expo/app/admin/reports.tsx` | fertig (ungeprüft) |
| Einsendungen | `expo/app/admin/submissions.tsx` | fertig (ungeprüft) |
| Push | `expo/app/admin/push.tsx` / `push-detail.tsx` / `push-history.tsx` | **teilweise — sendet nur lokal + DB-Eintrag, kein Remote-Push** |
| Moderatoren | `expo/app/admin/moderators.tsx` | fertig (ungeprüft) |
| Sponsoren | `expo/app/admin/sponsors.tsx` | fertig (ungeprüft) |
| Werbung | `expo/app/admin/promotions.tsx` / `promotion-analytics.tsx` | fertig (ungeprüft) |
| Moderations-Aktionen | `expo/app/admin/moderation-actions.tsx` | fertig (ungeprüft) |

## 5. Funktionen — Gesamt-Tabelle

| Funktion | Zustand | Dateien | Was fehlt / Fehler |
|---|---|---|---|
| Registrierung/Login/Logout | fertig | `expo/providers/AuthProvider.ts`, `expo/app/login.tsx`, `expo/app/register.tsx` | — |
| Passwort vergessen | **Attrappe** | `expo/providers/AuthProvider.ts` | Kein Mail-Dienst (SMTP) hinterlegt → Reset-Mails kommen nie an. Nur Reset über Supabase-Dashboard möglich |
| Admin-Rollen | fertig | `expo/supabase/COMPLETE_SCHEMA.sql` TEIL 48 (`is_admin()`), `expo/providers/AuthProvider.ts` | — |
| Feed: Post erstellen (Text) | fertig | `expo/providers/PostsProvider.ts` (Zeilen 185–207) | — |
| Feed: Bild hochladen | **KAPUTT** | `expo/app/(tabs)/feed/create.tsx` Zeile 681, `expo/providers/PostsProvider.ts` Zeile 191 | Es wird nur die **lokale Geräte-URI** (`file:///…`) in `posts.media_urls` gespeichert — niemand sonst sieht das Bild |
| Feed: Likes/Speichern/Kommentare | fertig | `expo/providers/PostsProvider.ts`, `expo/components/FeedCard.tsx` | — |
| Stories | fertig | `expo/providers/StoriesProvider.ts`, `expo/app/story-viewer.tsx`, `expo/components/StoryBar.tsx`, `StoryRing.tsx` | Media-Upload vermutlich gleiches Problem (ungeprüft) |
| Reels | teilweise | `expo/providers/ReelsProvider.ts`, `expo/app/user-reel-feed.tsx` | Upload/local-only; Reaktionen nicht serverseitig; Profil-Reels-Tabs ohne echte DB-Daten |
| Direkt-Chat (Text, Realtime) | fertig | `expo/providers/ChatProvider.ts`, `expo/app/direct-chat.tsx`, `expo/components/chat/*` | — |
| Sprachnachrichten | teilweise | `expo/providers/ChatProvider.ts`, `expo/components/VoiceMessageBubble.tsx` | Aufnahme wird laut Audit nur lokal gespeichert (ungeprüft) |
| Freundschaften/Blockieren | fertig | `expo/providers/FriendsProvider.ts` | — |
| Privatsphäre-Einstellungen | fertig | `expo/app/(tabs)/profile/privacy.tsx`, Tabelle `privacy_settings` | Enforcement in allen Abfragen teilweise unvollständig (ungeprüft) |
| Orte + Bewertungen + Favoriten | fertig | `expo/hooks/useContent.ts`, `expo/hooks/useReviews.ts`, `expo/hooks/useFavorites.ts` | — |
| Stempel sammeln | teilweise | `expo/app/(tabs)/stamps/checkin.tsx`, `expo/hooks/useStampPass.ts` | Keine serverseitige Verifikation; GPS-Spoofing-Block existiert nur bei Kaderschmiede, nicht bei Stempeln |
| XP/Ränge (15) | fertig | `expo/hooks/useStampPass.ts`, `expo/constants/orden.ts` | — |
| Orden (29) + Zeremonie | fertig | `expo/hooks/useOrden.ts`, `expo/lib/orders.ts`, `expo/components/OrdenBadge.tsx`, `OrdenCeremony.tsx`, `WaxSealCeremony.tsx` | Charakter-Werte immer 0 (s. o.) |
| Kaderschmiede komplett | fertig | `expo/providers/KaderschmiedeProvider.ts`, `expo/constants/kaderschmiede.ts`, Tab-Ordner | Upload unkompri­miert |
| Live-Standort teilen | fertig | `expo/providers/LiveLocationProvider.ts`, `expo/app/(tabs)/livemap/index.tsx` | — |
| News | fertig | Tabelle `news`, `expo/app/(tabs)/(home)/*`, `expo/components/NewsCard.tsx` | — |
| Sponsoren/Werbung | fertig | `expo/providers/PromotionProvider.ts`, `expo/components/SponsoredCard.tsx` | — |
| Moderation (Auto-Eskalation) | fertig | `expo/providers/ModerationProvider.ts`, `expo/components/ReportModal.tsx`, `AppealModal.tsx`, Tabelle `moderation_*` | Eskalationsstufen: 30 min Kommentar → 1 h Like → 24 h Post → 7 Tage Sperre |
| Admin-Panel | fertig | `expo/app/admin/*` (17 Screens) | — |
| Push-Benachrichtigungen | **Attrappe** | `expo/hooks/useNotifications.ts`, `expo/app/admin/push.tsx` | Nur lokale Notifications + DB-Eintrag in `push_notifications`; kein Remote-Push |
| Spotify-Widget | **Aus** | `expo/components/NowPlayingWidget.tsx`, `expo/providers/SpotifyProvider.ts`, `expo/app/(tabs)/profile/index.tsx` Zeile 954 | Gated hinter `{false && …}`; keine OAuth-Anbindung |
| Spiele | fertig, versteckt | `expo/app/(tabs)/spiele/*`, `expo/providers/*Engine.ts` | Per `href: null` ausgeblendet |
| Sonnenuhr (Easter Egg) | fertig | `expo/components/SunDial.tsx` (488 Zeilen) | 60 Punkte um Avatar, astronomische Sonnenzeit-Berechnung lokal (keine API), Tap auf Sonne = Info-Overlay; Toggle in `profile/edit.tsx` |
| Bild-Upload Admin | fertig, aber unkompri­miert | `expo/components/AdminImagePicker.tsx` (Zeilen 245, 268) | Volle Originalgröße wird hochgeladen — Kostenrisiko |
| Medien-Upload-Dienst (zentral) | **geplant** | geplant: `expo/lib/mediaUpload.ts` | Siehe `HANDOVER.md` §7 — besprochen, nicht gebaut |
| Stempel-Verifikation 3 Stufen | **geplant** | — | Siehe `HANDOVER.md` §11 |
| Konto löschen / DSGVO-Export | **nicht begonnen** | — | Gesetzlich nötig vor echtem Start |
| Bezahlung/Abo | **nicht begonnen** | — | Nur im `expo/README.md` erwähnt (RevenueCat), kein Code |

## 6. Was beim Start konkret funktioniert (nach Code-Audit; Lauftest „ungeprüft")

- Registrieren, Anmelden, Profil ausfüllen, Avatar wählen
- Feed lesen, liken, speichern, kommentieren — **nur ohne eigene Bilder**
- Stories ansehen/erstellen, Reels ansehen
- Chatten (Text, Realtime), Freunde, blockieren
- Orte/Restaurants durchstöbern und bewerten, Stempel sammeln (ohne echte Absicherung)
- Kaderschmiede komplett inkl. sicherem Check-in
- Rangliste, Ordenshalle, Live-Karte, News
- Admin-Panel komplett (moderieren, News/Orte/Restaurants pflegen, Werbung, Sponsoren)
- **Nicht funktioniert:** eigene Feed-Bilder für andere sichtbar machen, Passwort per E-Mail zurücksetzen, echte Push-Nachrichten

## 7. Nachweis, dass alle Screens erfasst sind

Der vollständige Dateibaum steht in `03_TECHNIK.md` §2. Die dortigen `expo/app/**`-Dateien
entsprechen 1:1 den Tabellen oben (95 Route-Dateien; `modal.tsx` und `+native-intent.tsx`
sind Reste ohne eigene Funktion).
