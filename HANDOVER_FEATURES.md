# HOFFNUNGSTRÄGER — Vollständiges Feature-Inventar (Deep-Dive)

> **Ergänzung zu `HANDOVER.md`.** Dieses Dokument beschreibt ALLES, was bislang existiert —
> jeder Screen, jede Interaktion, jedes versteckte Feature, jede Demo-/Mock-Stelle.
> Es ist so geschrieben, dass eine neue KI (z.B. Claude Code) ohne Rückfragen weiterarbeiten kann.
>
> **Stand:** 2026-09-01 · **Codebase:** `expo/` (~91.000 LOC, ~90 Screens, 20 Provider, ~45 Komponenten)
>
> **Stack:** Expo SDK 54 · RN 0.81.5 · TypeScript strict · expo-router (Dateisystem-Routing) ·
> React Query 5 · Supabase (auth + DB + Realtime) · `@nkzw/create-context-hook` ·
> lucide-react-native · expo-haptics/-location/-notifications/-av/-camera/-image-picker ·
> react-native-maps + react-native-svg · bun als Paketmanager.
>
> **Datenfluss:** App ↔ Supabase direkt (RLS-geschützt). **Kein echtes Backend** —
> `expo/backend/trpc/` ist ein Demo-Restand (in-memory, Plaintext-Passwörter), wird von keinem
> echten Flow genutzt.
>
> **Design (bindend):** Dark-Theme `#141416`/`#0f0f10`, Gold `#BFA35D`, Cream `#E8DCC8`,
> **KEIN BLAU** (Nutzer-Vorgabe). Inter-Fonts. Haptics bei Aktionen.

---

## 1. Screens-Verzeichnis

### 1.1 Root (`expo/app/`)

| Datei | ~Zeilen | Beschreibung |
|---|---|---|
| `_layout.tsx` | 252 | Root: Fonts (Inter 400–700), SplashScreen, QueryClient (staleTime 5 min), tRPC-Provider, Theme→Alert→Auth-Provider-Kette, `AuthGate` (lädt die 10 „deferred"-Provider erst nach Interactions), `RootLayoutNav` mit **Auth-Redirect-Logik** (nicht eingeloggt → `/login`, eingeloggt auf Auth-Seite → `/`). Notification-Handler (Banner+Sound+Badge), OfflineBanner, AlertRoot, ErrorBoundary. Perf-Tracing (`markTime`, `printReport` nach 5 s). Web: console.warn/error-Filter. Stack-Optionen: login/register als fullScreenModal ohne Gesture, story-viewer fullScreenModal fade, submit-suggestion modal. |
| `login.tsx` | 905 | Login: E-Mail/Passwort (Supabase `signInWithPassword`), Passwort-vergessen-Flow (`resetPasswordForEmail` — **ohne SMTP tot**), animierte Eingaben, Error-Handling mit deutschen Meldungen. |
| `register.tsx` | 668 | Registrierung: Name/E-Mail/Passwort + **Gender- & Religions-Auswahl** (wird in `users.gender/religion` gespeichert). Username wird automatisch generiert (`name_+timestamp`). |
| `user-profile.tsx` | 1813 | Fremdes Profil: Hero mit Avatar (inkl. Flaggen-Badge, Story-Ring), Rank-Pill, Bio, Values-Chips (15 Werte mit Icons), Geburtsort/Wohnort/Bundesland, Gender/Religion/Kreuz-Chips, Orden-Vorschau, Stats (Beiträge/Freunde/Stempel), Folgen/Entfolgen, Freundesanfrage, **Blockieren**, Direkt-Chat-Einstieg, Tabs posts/tagged. **Achtung:** `userReels` und `taggedReels` sind **hart auf `[]` gesetzt** (leeres useMemo) — Tagged-Tab zeigt nie Reels. Fallback auf „mock user" aus UserCache (`getUserById`). NowPlayingWidget importiert (gated). |
| `user-posts.tsx` | 290 | Beiträge eines fremden Users als Grid/Liste. |
| `user-friends.tsx` | 462 | Freundesliste eines Users (aus `FriendsProvider.loadFriendsForUser`, Cache). |
| `user-stamps.tsx` | 457 | Stempel-Pass eines Users; enthält `TODO`-Markierung (L.39) und „hidden"-Kommentare (Stempel-Detail-Ansicht). |
| `user-reel-feed.tsx` | 1523 | Vertikales Reel-Feed (Fullscreen, Paging/Snap), Video-/Foto-Wiedergabe, Reaktionen (4 Typen), Kommentare, Bookmark, Share, Tag-Info; öffnet via `initialPostId` auch für eigene Posts (wird vom Profil-Grid benutzt!). |
| `direct-chat.tsx` | 774 | 1:1-Chat: Realtime-Nachrichten, Editieren/Zurückziehen (nur ungelesen), Read-Receipts (via `simulatePartnerRead` **lokal simuliert**), Sprachnachrichten-Bubble, Nachrichten-Anfrage-Flow („Annehmen/Ablehnen"), System-Messages. |
| `story-viewer.tsx` | 1114 | Story-Viewer: Auto-Advance (5 s, `STORY_DURATION_SECONDS`), Progress-Bars, Tap links/rechts, Swipe-Down zum Schließen (PanResponder), **FlipClock-Viewer** (Story-Metadatum `showClock/clockTime`), Poll-Anzeige, Wetter-Badge, Erwähnungen, Viewern-Liste, Eigene Stories löschen, ReportModal. |
| `submit-suggestion.tsx` | 623 | Vorschlag einreichen (Ort/Restaurant) mit Formular, Bild-Upload, Kategorie, Begründung → `submissions`-Tabelle (Status pending). |
| `moderation-history.tsx` | 510 | Historie der Moderationsmaßnahmen gegen den eigenen Account + **Widerspruch einlegen** (AppealModal). |
| `location-posts.tsx` | 339 | Alle Posts zu einem Ort (Location-Filter). |
| `+not-found.tsx` | 51 | 404-Screen. |
| `modal.tsx`, `+native-intent.tsx` | je 5–6 | Platzhalter/Intent-Handler (leer). |

### 1.2 Tab-Leiste (`(tabs)/_layout.tsx`, 107)

Sichtbare Tabs: **Start, Feed, Stempel, Ranking, Profil, Kader, Karte**.
Versteckt (`href: null`): **inbox, spiele, places, cuisine** (Spiele-Tab bewusst versteckt —
Absicht, kann zurückkommen!). Places/Cuisine sind weiterhin routbar (Deep-Links von Home).

### 1.3 `(tabs)/(home)/`

| Datei | ~Zeilen | Beschreibung |
|---|---|---|
| `index.tsx` | 328 | Startseite: News-Karten, Leitsatz des Tages (aus `mocks/leitsaetze.ts`, 365 deutsche „Leitsätze" für Tag 1–365!), Links zu Orte/Restaurants. Pull-to-refresh, Error/Empty-States. |
| `article.tsx` | 300 | News-Artikel-Detailansicht (Bild, Text, Autor, Datum). |
| `activity.tsx` | 562 | Aktivitäts-/Aktuelles-Übersicht (Aktivitäten-Feed des Heimat-Themenkreises). |

### 1.4 `(tabs)/feed/`

| Datei | ~Zeilen | Beschreibung |
|---|---|---|
| `index.tsx` | 657 | Haupt-Feed: StoryBar oben, FeedCards (mit SponsoredCards nach `feed_position` + Frequency-Cap), FAB zum Erstellen. Pull-to-refresh. |
| `create.tsx` | 1994 | **Post-Composer mit Mini-Foto-Editor**: Image-Picker, **Pinch-Zoom & Drag des Bildes im 4:5-Frame**, 20+ Filter-Presets (Portra 400, Cinema, Mood … als Gradient-/Vignette-Layer mit Opacity-Slider), Text-Overlay mit verschiebbarer Position, Location-Auswahl via `useLocationSearch` (Nominatim), User-Tagging (Freunde-Suche), Onboarding-Gesture-Hint (einmalig, AsyncStorage-Key `@editor_gesture_hint_dismissed`). **BUG (bekannt): speichert nur lokalen Geräte-URI → andere Nutzer sehen kein Bild.** |
| `create-story.tsx` | 1551 | Story-Erstellung: Text/BG-Color/Font-Auswahl, Bild mit Skalierung/Offset (imageScale/OffsetX/Y, textX/Y/Scale), **Poll-Erstellung**, Wetter-Anzeige-Anhang, Uhrzeit-Anhang (FlipClock), Mention-Auswahl; Long-Press auf Edit-Button → Haptic (L.811). |
| `post-detail.tsx` | 1160 | Post-Detail: **Long-Press auf Bild → Reaktions-Picker** (animated Overlay), Kommentare mit Antworten, Likes, Profil-Link, Share. |
| `comments.tsx` | 619 | Kommentar-Thread (Laden, Posten, Antworten). |
| `activity.tsx` | 562 | Aktivitäts-Feed (wer hat geliked/kommentiert/gefolgt/erwähnt/geteilt) — lokal aus Provider-States aggregiert, `ActivityType`-Labels deutsch. |
| `image-viewer.tsx` | 197 | Vollbild-Bildbetrachter. |
| `_layout.tsx` | 58 | Stack-Config für Feed-Unterseiten. |

### 1.5 `(tabs)/cuisine/` (versteckt im Tab-Bar, aber routbar)

- `index.tsx` (213): Restaurant-Liste mit Suche/Filter (Küche, Preis).
- `[id].tsx` (412): Restaurant-Detail mit Bildern, Karten-Koordinaten, Bewertungen (ReviewSection), Favoriten-Toggle, Stempel-Bezug.
- `map.tsx` (100): react-native-maps Karte mit Restaurant-Markern.

### 1.6 `(tabs)/places/` (versteckt)

- `index.tsx` (219): Orte-Liste (Kategorien: Denkmal, Gedenkstätte, Historische Stätte, Natur, Schloss/Burg, Kirche, Museum), Filter nach Bundesland/Kategorie. **Präpendet 3 Demo-„Brandenburger Tor"-Orte** (useContent).
- `[id].tsx` (467): Ort-Detail: Bild-Galerie, Beschreibung, Karte, Bewertungen (Sterne + Thumbs), Favorit, **Stempel einsammeln** → WaxSealCeremony-Animation.
- `map.tsx` (100): Karten-Ansicht der Orte.

### 1.7 `(tabs)/stamps/`

- `index.tsx` (343): Stempel-Pass-Übersicht: Sammlung als Grid, Fortschritt, Rang-Anzeige.
- `checkin.tsx` (588): Stempel-Check-in vor Ort: **GPS-Verifikation** (Distanz zum Ort), Foto-Aufnahme (expo-camera) als Beleg, `collectStamp()` → WaxSeal-Zeremonie.

### 1.8 `(tabs)/ranking/`

- `index.tsx` (399): **Rangliste (Top 100 nach XP)**: Podium (Top 3 mit Gold/Silber/Bronze-Medaillen), eigene Position hervorgehoben, RankIcons (15 Ränge), EP-Anzeige.

### 1.9 `(tabs)/profile/`

| Datei | ~Zeilen | Beschreibung |
|---|---|---|
| `index.tsx` | 1820 | **Eigenes Profil (Kern-Screen)** — Details inkl. Easter Eggs siehe Kapitel 6. Hero: Avatar (mit Story-Ring + animierter WavingFlag-Badge bei aktiver Fahne, Glow-Ring), Name/@username, Gender/Religion/Kreuz-Chips, **Rank-Pill (aufklappbarer Fortschrittsbalken via Animated, zeigt „X% bis <Rang>", EP = stamps×50)**, Bio, Values-Row, Orts-Chips, Live-Location-Banner, **Fahne hissen/einholen** (24 h, Flaggen-Counter „X Patrioten"), Stats (Beiträge/Freunde/Stempel, animiert gestaffelt), Ordenshalle-Preview, **4 Tabs (Beiträge/Markiert/Archiv/Gespeichert) mit animiertem Tab-Indikator**; Saved-Tab hat Sichtbarkeits-Umschalter (public/friends/private — nur lokal in Provider-State, **nicht in DB**). Grid-Items: Press-Scale-Animation + **Long-Press → Archivieren/Löschen/Wiederherstellen** (Custom Alert). Spotify-Widget `{false && …}` gated. |
| `edit.tsx` | 1016 | Profil-Bearbeitung: Name, Bio, Avatar (Upload/Generator), Geburtsort/Wohnort (+PLZ via Nominatim-Suche), Bundesland, Values-Auswahl (15), Gender/Religion/Kreuz-Stil, `showGender/showReligion/showSunDial`-Toggles (**Sonnenuhr-Toggle mit testID `toggle-show-sundial`**, Erklärungstext „Die Sonnenuhr ist nur für dich sichtbar und zeigt Sonnenauf- & -untergang basierend auf deinem Wohnort."). |
| `avatar-generator.tsx` | 660 | Prozeduraler Avatar-Generator (Stile/Farben, seeded, speicherbar als Bild). |
| `settings.tsx` | 437 | Einstellungen: Privatsphäre-Link, Account, **Admin-Panel-Einstieg (gated auf `user.isAdmin`)**, Logout. |
| `privacy.tsx` | 630 | 10 Privatsphäre-Schalter (`privacy_settings`-Tabelle): showPosts/Friends/Stamps, feedPostVisibility, storyVisibility, showBirthplace/Residence/Bundesland/Values, allowTagging — jeder auf `everyone/friends/private`. |
| `friends.tsx` | 590 | Eigene Freunde + Anfragen (annehmen/ablehnen/zurückziehen), Suche, Entfernen, Blockieren. |
| `messages.tsx` | 1596 | Chat-Inbox: Konversationsliste + **Nachrichtenanfragen** (accept/decline), ungelesen-Badges, zuletzt gelesen-Status. |
| `chats.tsx` / `chat.tsx` | 217 / 17 | Ältere/Wrapper-Chat-Routen (chat.tsx delegiert zu direct-chat). |
| `ordenshalle.tsx` | 634 | **Ordenshalle**: alle Orden nach Kategorie/Tier, verdient/gesperrt (Lock-Overlay), Tier-Filter, Detail mit OrdenCeremony-Animation, Tier-Statistik. |
| `saved.tsx` | 344 | Gespeicherte Beiträge-Übersicht. |
| `support.tsx` | 363 | Support/Feedback-Formular. |
| `datenschutz.tsx` | 168 | **Statische** Datenschutzerklärung (Text). |
| `impressum.tsx` | 210 | **Statisches** Impressum (Text). |
| `_layout.tsx` | 31 | Stack. |

### 1.10 `(tabs)/kaderschmiede/` (Fitness-Plattform „Kader")

| Datei | ~Zeilen | Beschreibung |
|---|---|---|
| `index.tsx` | 725 | Kader-Dashboard: Wochen-Streak, Workout-Zähler, upcoming Activities, aktive Challenges, Deutschland-Karte (GermanyMap mit Aktivitätszahlen je Bundesland, tapbar → Filter), Eincheck-CTA. |
| `lobby.tsx` | 3484 | **Live-Racing-Lobby (größter Screen!)**: Phasen `setup→waiting→countdown→go→racing→…`, 1v1/Team-Modus, Distanz 1K/2K/5K mit animierter RoutePreview (Scan/Glow-Effekte), Ready-Check, Countdown, **GPS-Rennen** (1 s GPS-Intervall, Distanz-Coverage, Pace), **Spectator-Modus** (max 20, Polling 2 s), **Cheer-Reaktionen** (🔥⚡💪👏📯 mit Anzeige-Dauer), Aufgabe (surrender), Sieg/Niederlage-Screens. Teilweise in-memory/Sessions lokal simuliert. |
| `checkin.tsx` | 1971 | **Sicheres Training-Check-in**: Host erzeugt 6-stelligen Code + QR; Teilnehmer scannt; Token-Format `KADER:{id}:{epoch}:{nonce}` mit **30 s Rotation / 60 s Gültigkeit**; GPS-Verifikation: max 50 m Distanz zum Host, max 100 m Accuracy, **GPS-Spoofing-Erkennung (`location.mocked` → BLOCKIERT)**; bereits-eingecheckt-Prüfung (lokal + DB). |
| `trupps.tsx` | 477 | Trupp-Liste (offene/beigetretene), Filter nach Sport. |
| `trupp-detail.tsx` | 859 | Trupp-Detail: Mitglieder (Leader/Member), Motto, Wochenziel, Streak, Treffen (Teilnahme an/ab), Beitreten/Verlassen. |
| `create-trupp.tsx` | 675 | Trupp-Erstellung: Name, Motto, Sport, Stadt/PLZ/Bundesland, Beschreibung, Logo-Upload (**ohne Komprimierung**), offen/geschlossen. |
| `challenges.tsx` | 570 | Challenge-Liste (1v1/Gruppe/Stadt/Bundesland). |
| `challenge-detail.tsx` | 621 | Challenge-Detail: Ziel/Wert/Ende, Teilnehmer, Ergebnis einreichen (Wert + proofUrl), Leaderboard der Ergebnisse. |
| `create-challenge.tsx` | 477 | Challenge-Erstellung (Titel, Typ, Sport, Zeitraum, Ziel+Einheit). |
| `activity-detail.tsx` | 539 | Trainings-Activity-Detail: Teilnehmer, Join/Leave, Karte, Level. |
| `create-activity.tsx` | 462 | Activity-Erstellung (Ort via Nominatim-Suche, Datum, Level, max. Teilnehmer, wiederkehrend). |
| `map.tsx` | 593 | Deutschland-SVG-Karte mit Aktivitäts-Bubbles je Bundesland (GermanyMap-Komponente). |

### 1.11 `(tabs)/livemap/`

- `index.tsx` (1891): **Live-Karte**: Stylische Deutschland-SVG-Karte (kein native maps!) mit pulsierenden Markern (Double-Pulse-Animation) für eigene + geteilte Freundes-Standorte; **Teilen starten**: Audience (Freunde/spezifische Nutzer-Auswahl mit Suche), Dauer (15 min/1 h/3 h/1 Tag), **Präzision (exakt/approximiert — auf 2 Dezimalen gerundet, Accuracy=1000)**; Restzeit-Countdown; Polling alle 30 s; Web-Geolocation-Fallback; ausführliche deutsche Fehler-Dialoge (Berechtigung verweigert, GPS aus, Tipp „Karten öffnen um GPS zu wecken").

### 1.12 `(tabs)/spiele/` (**Tab versteckt — Code bleibt erhalten**)

| Datei | ~Zeilen | Beschreibung |
|---|---|---|
| `index.tsx` | 463 | Spiele-Hub: GameCards mit Stagger-Entrance, „BALD"-Badge für nicht verfügbare Spiele (Schiffe versenken `available:false`). |
| `create-room.tsx` | 446 | Raum-Erstellung: Spiel-Typ, max Spieler, privat/öffentlich, Einstellungen (Turn-Timer 20 s, Zugrichtung, Auto-Pair-Remove) → LobbyEngine. |
| `lobby.tsx` | 709 | Game-Lobby: Mitgliederliste, Ready-Toggle, Invite-Code, Countdown (3-2-1), **„Fill with Bots"** (Bot-Namen: Schatten-AI, Kartenkönig, Meister Fuchs, Der Stratege), Rematch. |
| `connect-four.tsx` | 1240 | **Vier Gewinnt**: 7×6-Brett, Drop-Animation (fallende Scheibe), Win-Erkennung (4 Richtungen) mit Winning-Cells-Highlight, Draw, **Bot-Gegner** (Gewinn-Check → Block-Check → Zentrum → Random). |
| `shadow-cards.tsx` | 2203 | **„Der Schatten" (Schwarzer-Peter-Variante)**: Deck 6 Farben×Paare + 1 Schattenkarte 🌑, Deal, Auto-Paar-Abgleich, Ziehen aus Nachbarhand (**wählbar per Tap oder Random**), Zug-Timer mit Auto-Play, Hand-Reorder (Drag) + kosmetisches Mischen, Eliminierungs-Reihenfolge, Verlierer = letzte Hand. Bot-Züge mit Delay 1,2–2,7 s. |

### 1.13 `(tabs)/inbox/` (versteckt im Tab-Bar, via Badge/Deep-Link erreichbar)

- `index.tsx` (627): **Postfach**: Benachrichtigungen (`inbox_notifications`) inkl. **Audio-Nachrichten** (AudioPlayer mit Play/Pause/Pulse, Duration), Moderations-Warnungen („Beitrag entfernt" → Link zu Widerspruch), Alle-lesen, Löschen, Alles löschen, „vor X Min"-Zeitstempel.

### 1.14 `admin/` (17 Screens, Einstieg gated auf `users.is_admin`)

| Datei | Beschreibung |
|---|---|
| `_layout.tsx` (77) | Admin-Stack (Auth/Role-Check). |
| `index.tsx` (646) | Dashboard: Kacheln mit Zählern (News, Orte, Restaurants, Posts, User, Push), pulsierender „offene Reports"-Badge, gestaffelte Entrance-Animationen. |
| `news.tsx` (520) | News-CRUD (+ deleteAll). |
| `places.tsx` / `restaurants.tsx` (437/449) | CRUD mit AdminImagePicker (Multi-Upload, **ohne Komprimierung**), Koordinaten. |
| `posts.tsx` (260) | Alle Posts einsehen/löschen (auch deleteAll). |
| `users.tsx` (738) | Nutzerverwaltung: Suche, Details, **Long-Press zur Auswahl**, Löschen/Bannen/Entbannen. |
| `reports.tsx` (1990) | Meldungs-Center: Status-Filter, Details, Restriktionen verhängen (comment/like/post/full-ban mit Eskalationsstufen), ThreatGauge pro User, Moderator-Zuweisung. |
| `submissions.tsx` (935) | User-Vorschläge prüfen: genehmigen (→ places/restaurants übernehmen) / ablehnen mit Grund. |
| `moderators.tsx` (859) | Moderatoren ernennen (3 Rollen: moderator/super_moderator/admin), granulare Permissions-Toggles, Hauptadmin-Schutz (`HAUPTADMIN_ID='admin'`). |
| `moderation-actions.tsx` (530) | Entfernte Posts: Snapshots, **Wiederherstellen / endgültig löschen**, Appeals reviewen. |
| `push.tsx` (791) / `push-detail.tsx` (504) / `push-history.tsx` (348) | Push-Komposer (Titel, Text, **Audio-Anhang-Aufnahme/Upload**, Empfänger all/einzeln) → **nur lokale Notification + DB-Zeile** (kein echtes Remote-Push!). History & Detail mit Receipts (leer). |
| `sponsors.tsx` (565) | Sponsoren-CRUD (Logo, Website, Kontakt). |
| `promotions.tsx` (870) | Werbungen-CRUD: Typ (sponsor/internal/creator/event), Titel, Content, Media, CTA, **Feed-Position**, Start/Ende, Status. |
| `promotion-analytics.tsx` (567) | Analytics: Impressions/Clicks/CTR/Frequency, Daily-Stats, **Aggregation per RPC (`aggregate_promotion_daily_stats`) triggern**, **CSV-Export**. |

---

## 2. Provider-Verzeichnis (`expo/providers/`)

Alle via `createContextHook`. Tier 1 (immer geladen): Theme, Alert, Auth.
Tier 2 (deferred, nach Interactions, flach verkettet via `composeProviders`): Friends, Social,
Posts, Chat, Stories, Reels, LiveLocation, Spotify, Moderation, Promotion.
Spiele-Engines: Lobby, ConnectFour, ShadowCards (nested). Admin separat.

| Provider | State | Supabase-Tabellen | AsyncStorage-Keys | Kern-Funktionen |
|---|---|---|---|---|
| **AuthProvider** | user{id,name,email,isAdmin}, session, stayLoggedIn | `users` | `auth_stay_logged_in` | login, register (inkl. gender/religion), logout, forceLogout, resetPassword; getSession mit 10 s Timeout, Profil-Retry |
| **ThemeProvider** | colors, isDark | — | — | useColorScheme-basiert (beide Themes praktisch identisch dark) |
| **AlertProvider** | visible, config | — | — | showAlert(title, msg, buttons, type), dismissAlert |
| **PostsProvider** | allPosts/archived/saved (Sets), commentsCache, savedVisibility | `posts`, `post_likes`, `post_comments` | `posts_saved_ids`, `posts_archived_ids`, `posts_disabled_comments_ids` | createPost (❗lokaler URI), toggleLike (optimistic + rollback), addComment/loadComments, editPost (inkl. location/tags), deletePost, archive/unarchive, savePost, toggleCommentsDisabled, loadMorePosts (Range-Paging) |
| **FriendsProvider** | friends, requests sent/recv, blockedUsers(+blockedAt), allUsersState, otherUserFriendsCache, leaderboard | `friendships`, `friend_requests`, `blocked_users`, `users` | — | send/cancel/accept/reject request, removeFriend, block/unblock (Rollback-Pattern), loadFriendsForUser, leaderboard-Query (top 100 nach xp) |
| **SocialProvider** | profile (bio, values, Orte, gender/religion/crossStyle, **showSunDial**), privacy, flagHoistedAt | `users`, `user_values`, `privacy_settings` | — | updateProfile, updatePrivacy, **hoistFlag/lowerFlag (24 h Fahne)**, isFlagActive, flagCount-Query, canViewContent |
| **ChatProvider** | messages per partner, hasMore/loadingMore maps | `chat_messages` (Realtime INSERT/UPDATE/DELETE mit Filtern) | — | sendMessage, **sendVoiceMessage (nur Text-Platzhalter „🎤 Sprachnachricht (Ns)" + lokale URI — Audio wird NICHT hochgeladen!)**, editMessage/recallMessage (nur ungelesen, Rollback), markMessagesRead, **simulatePartnerRead (Fake!)**, deleteConversation, loadConversation/loadOlderMessages (Paging 30), messageRequests-Flow (accept nur lokal in State!) |
| **StoriesProvider** | ownStories, externalGroups, viewedStories | `stories`, `story_viewers` | — | createStory (inkl. textPos, metadata JSON), deleteStory, markStoryViewed, getStoryViewers; 24 h Expiry |
| **ReelsProvider** | userReels, savedReels, comments/likes-Caches, reelReactions | `reels`, `reel_bookmarks`, `reel_comments`, `reel_comment_likes` | — | createReel (❗lokale URI, DB-Fehler wird ignoriert und lokal fortgesetzt), reactions **nur lokal (nicht persistiert!)**, archive/unarchive/delete, bookmark-Toggle |
| **LiveLocationProvider** | isSharing, myLocation, shareSettings, friendLocations, remainingTime | `live_locations` (upsert/delete) | — | startSharing/stopSharing (Web + Native-Pfade, GPS-Graceful-Degradation High→Lowest→lastKnown), uploadMyLocation (approximate-Rounding), fetchFriendLocations (Client-seitige Audience-Filterung!), Polling-Gate activate/deactivatePolling; exportiert latLngToSvg, haversineDistance |
| **SpotifyProvider** | settings (enabled, visibility, allowedUserIds), currentTrack | `spotify_tracks` (nur Lesen) | `spotify_settings` | getTrackForUser (❗gibt für Fremde immer `null` zurück — Feature funktional nur für sich selbst), canUserSeeMyMusic |
| **ModerationProvider** | reports, moderators, restrictions, spamLog, moderationActions, moderationAppeals, removedPostIds | `reports`, `moderators`, `user_restrictions`, `moderation_actions`, `moderation_appeals`, `posts`, `inbox_notifications`, RPC `admin_delete_post` | `admin_removed_post_ids` | submitReport, updateReportStatus, **autoHandleSpam (Eskalation: 30 min comment → 1 h like → 24 h post → 7 d full ban)**, addModerator/Permissions/Remove, adminRemovePost (Snapshot + Delete + Inbox-Notify), submitAppeal, **reviewAppeal (accepted → Post-Restore aus Snapshot; rejected → permanent delete + Notify)**, getUserViolationStats (Threat-Level), isPostModerated |
| **PromotionProvider** | sponsors, promotions, activePromotions, Impression-Batching | `sponsors`, `promotions`, `promotion_impressions`, `promotion_clicks`, `promotion_daily_stats`, RPC `aggregate_promotion_daily_stats` | — | trackImpression (Session-Dedup, **Frequency-Cap 3/Tag**, Flush nach 5 s / on background / beforeunload), trackClick, shouldShowPromotion, CRUD-Sponsors/Promotions, getPromotionAnalytics, exportAnalyticsCsv |
| **AdminProvider** | news/places/restaurants/posts/pushHistory/allUsers | `news`, `places`, `restaurants`, `posts`, `users`, `push_notifications` | — | CRUD + deleteAll* (via `neq id`), deleteUser/banUser/unbanUser, addPushNotification (lokal + DB + Inbox) |
| **KaderschmiedeProvider** | activities, trupps, challenges, workoutLogs, Filter, activeCheckIn, user name/avatar Caches | `kaderschmiede_activities`, `_activity_participants`, `_trupps`, `_trupp_members`, `_trupp_meetings`, `_meeting_attendees`, `_challenges`, `_challenge_participants`, `_challenge_results`, `_workout_logs`, `_checkins`, `_checkin_entries` | — | join/leave/create Activity, Trupp-CRUD + join/leave, Challenge-CRUD + submitResult, addWorkoutLog, Meeting attend/leave/create, **Check-in-Sicherheit: 6-stelliger Code, Token `KADER:{id}:{epoch}:{nonce}` (30 s Rotation, 60 s Gültigkeit), 50 m Radius, 100 m max Accuracy, mocked-GPS-Block**, startCheckIn (DB-Fallback → lokale Session), refreshCheckIn/refreshData |
| **LobbyEngine** | currentRoom, members (inkl. Bots), currentSession, countdown | `game_rooms`, `game_room_members`, `game_sessions` (Writes best-effort, Errors ignoriert) | — | createRoom (Invite-Code 6-stellig, 10 min Expiry), joinRoom, leaveRoom (Host→cancelled), toggleReady, canStart, startGame (3-2-1-Countdown), endSession, **addBot/fillWithBots, rematch** |
| **ConnectFourEngine** | board 7×6, currentPlayer, phase, winningCells, dropAnimation | — (rein lokal) | — | initGame, makeMove/confirmDrop (Anim-then-commit), Bot-Logik (Win→Block→Center→Random), endSession-Callback |
| **ShadowCardsEngine** | gameState (players/hands/phases), turnTimeLeft | — (rein lokal) | — | generateDeck/shuffle/findPairs, performDraw (chosenIndex oder random), Auto-Pair-Remove, Turn-Timer-AutoPlay, Bot-Delays, shuffleMyHand (kosmetisch), reorderMyHand |
| **DeferredProviders / composeProviders** | — | — | — | Mounten nach `InteractionManager.runAfterInteractions`; reduceRight-Komposition |

---

## 3. Komponenten-Verzeichnis (`expo/components/`)

| Komponente | Zweck |
|---|---|
| **FeedCard** (1261) | Herzstück-Feed-Karte: Bild-Karte mit Gradient-Overlay oder Text-Post mit Gradient-Mustern/Quote-Mark, Avatar+RankIcon, **Double-Tap-Heart-Animation**, **Long-Press → Kontextmenü** (Melden/Speichern/Archivieren/Bearbeiten/Löschen je Rechte), Reaktions-Leiste, Kommentare-Vorschau, Location-Tag, Tagged-User. |
| **PostCard** (323) | Kompakte Listen-Karte für Posts (Orte-/User-Kontexte). |
| **NewsCard** (158) | News-Teaser (Bild, Titel, Datum). |
| **PlaceCard** / **RestaurantCard** (184/208) | Listen-Karten für Orte/Restaurants (Bild, Rating, Stadt). |
| **SponsoredCard** | Werbe-Karte (Promotion) mit CTA → trackClick; Impressions via Visibility. |
| **OrdenBadge** (317) | Medaillen-Badge (3 Größen): Tier-Gradient (bronze/silber/gold/legendär), Glow-Ring-Loop bei gold/legendär, Lock-Overlay wenn unverdient, Tier-Dot, Press-Scale + Haptic. |
| **OrdenCeremony** (400) | **Vollbild-Ordens-Verleihung**: 12 Lichtstrahlen, 24 Partikel-Explosion, drehende Medaille, Ribbon („GOLD" etc.), +EP-Pill, „Orden annehmen"-Button; Haptics success→heavy. |
| **WaxSealStamp** (234) | Prozedural generierter Wachssiegel-SVG (organische Blob-Path mit 12 Bumps), Radial-Gradients, Shine-Loop; Farben red/gold/black. |
| **WaxSealCeremony** (277) | **Stempel-Zeremonie**: Siegel „schlägt auf" (Scale 2.2→Spring), Impact-Flash, Screen-Shake, 16 Wachstropfen-Partikel, Ribbon „GESIEGELT", Ortsname, „Stempel gesammelt!". |
| **RankIcon** (81) | Icon-Mapper für 30 Lucide-Icons (Rang-Icons), Fallback Eye. |
| **QuoteCard** (62) | „Leitsatz des Tages"-Karte (Tag X von 365). |
| **NowPlayingWidget** (239) | Spotify-„Hört gerade"-Widget: animierter Equalizer (4 Bars), Album-Art, Progress-Bar, Deep-Link zur Spotify-URL. **Nirgends gerendert (`{false && …}`).** |
| **FloatingReactions** (153) | 9 schwebende Reaktions-Icons (Respekt/Anerkennung/Zuspruch/Verbundenheit/Ehre als custom SVGs) in **Schwarz/Rot/Gold**, Wobble/Scale/Rotation, Lifetime ~1,8–2,4 s. |
| **ReactionIcons** | Custom-SVG-Icon-Set (Respekt=Schild+Schwerter, Anerkennung=Stern, Zuspruch=Arm, Verbundenheit, Ehre). |
| **RadarChart** (174) | SVG-Radar (5 Ringe, 6 Achsen = CHARACTER_DIMENSIONS), animierter Entrance, Legende. |
| **GermanyMap** (174) | SVG-Deutschlandkarte (16 Bundesländer-Pfade), Fill je nach Aktivitätszahl, pulsierende Dots, tapbare Count-Badges. |
| **WavingFlag** (115) | Animierte Schwarz-Rot-Gold-Flagge (6 Spalten, gestaffelte Wave-Loops). |
| **ThreatGauge** | Halbkreis-Gauge mit 24 Balken + Nadel für Moderations-„Bedrohungslevel" (grün/orange/rot). |
| **GenderIcon** (92) | SVG-Gender-Symbole (♂/♀, gold). |
| **LatinCrossIcon** / **OrthodoxCrossIcon** | Custom-SVG-Kreuze (lateinisch mit Spitze; orthodox mit Querbalken) für das Religion-Feature. |
| **BrezelIcon** / **BrezelRatingIcon** | Custom-SVG-Brezel als Rating-Stern-Ersatz (Restaurant-Kontext, filled/unfilled). |
| **MonumentIcon** / **MonumentRatingIcon** | Custom-SVG-Denkmal (Säulen+Giebel) als Rating-Icon (Orts-Kontext). |
| **StoryBar** (353) | Story-Leiste (eigenes + Fremde, Viewed-Ring, Variante `reels`), **„+"-Button öffnet animiertes Menü (Beitrag erstellen / Story erstellen)**. |
| **StoryRing** (55) | Avatar-Ring (viewed/unviewed). |
| **ReviewSection** (588) | Bewertungen: StarRating, Kommentarliste, Thumbs up/down, eigene Review abgeben (einmal pro Target). |
| **StarRating** / **Skeleton** | Sterne-Rating / Lade-Skeletons. |
| **ReportModal** | Meldungs-Modal (8 Gründe mit Emoji, Detailtext) → ModerationProvider.submitReport. |
| **AppealModal** (473) | Widerspruchs-Modal gegen Moderationsmaßnahme (Text, Absenden → moderation_appeals). |
| **AdminDeleteModal** (357) | Admin-Lösch-Modal: Grund + Details Pflicht, Snapshot-Hinweis, ruft adminRemovePost. |
| **AdminImagePicker** (383) | Multi-Bild-Picker + Upload in Supabase-Storage (`admin-uploads`), **keine Komprimierung**. |
| **EditPostModal** (916) | Post-Bearbeitung: Text, **Location via Nominatim-Suche**, Tags, User-Tagging. |
| **CustomAlert** (312) | App-eigener Alert-Ersatz: Typ-Icons (info/warning/error/success), Scale/Fade-Animation, Backdrop-Dismiss nur ohne Buttons. |
| **AlertRoot** | Rendert CustomAlert global aus AlertProvider. |
| **OfflineBanner** (97) | Slide-in „Keine Internetverbindung" / „Wieder verbunden" (Poll `google.com/generate_204` alle 15 s). |
| **ErrorBoundary** (105) | Class-Component-ErrorScreen mit „Erneut versuchen". |
| **OptimizedImage** (59) | expo-image-Wrapper mit Blurhash-Placeholdern (dark/warm), Web-Cache-Policy, `OptimizedAvatar`-Ableitung. |
| **VoiceMessageBubble** | Sprachnachricht-Bubble (Play/Pause, Pulse, Progress) — funktioniert nur lokal (Audio-URI bleibt device-lokal). |
| **chat/ChatHeader** (126) | Chat-Kopf (Avatar, Name, Online-Status-Platz). |
| **chat/ChatInputArea** (620) | Eingabe: Textfeld, **Sprachnachricht-Recording (expo-av)**, Senden, Haptics. |
| **chat/ChatMessageItem** (279) | Message-Bubble: **Long-Press → Menü** (Bearbeiten/Zurückziehen/Kopieren), Read-Receipts, System-Messages, edited/recalled-Marker. |
| **chat/types.ts** | Chat-Typen. |

---

## 4. Hooks-Verzeichnis (`expo/hooks/`)

| Hook | Zweck |
|---|---|
| `useContent` | News/Places/Restaurants-Queries; **präpendet `DEMO_PLACES` (3× Brandenburger Tor)**; update-Funktionen. |
| `useLocationSearch` | Nominatim-OSM-Suche (400 ms Debounce, min. 2 Zeichen, `countrycodes=de,at,ch`, 10 Default-Suggestions, AbortController). |
| `useStampPass` | Stempel-Collection + **15-Rang-System** (Neuling→Deutscher Patriot, Schwellen 0–130 Stempel), nextRank, Progress vs. `places`-Count. |
| `useReviews` | Reviews + Votes (up/down, exklusiv), addReview, hasUserReviewed, `useTargetReviews` (Ø-Rating). |
| `useFavorites` | Favoriten-Toggle (place/restaurant/post/reel) mit optimistischem temp-ID-Pattern. |
| `useNotifications` | Inbox-Notifications (add/markRead/markAll/delete/clearAll, unreadCount). |
| `useOrden` | Orden-Definitionen aus DB (`orders`) mit **Fallback auf lokale `ORDEN_DEFINITIONS`**, earned map, Tier-Counts, `useUserOrdenQuery` für Fremde. |
| `useUserLookup` | useUserLookup (single), useUsersLookup (Batch à 50), useLeaderboard, usePrefetchUsers. |
| `useNetworkStatus` (`useOnlineManager`) | Online-Check (Web: navigator.onLine; Native: HEAD-Ping alle 15 s). |
| `useCanEditContent` | true wenn isAdmin ODER Moderator mit editPosts-Permission. |

---

## 5. Konstanten / Datendefinitionen (`expo/constants/`)

- **types.ts (556):** Alle Domänen-Typen (Place, Restaurant, Review, SocialUser, FeedPost,
  Story+Metadata (poll/weather/clock), ChatMessage, Reel, SpotifyTrack, Submission,
  Sponsor/Promotion, ModerationAction/Appeal). Konstanten: 16 Bundesländer, 7 PlaceCategories,
  **15 PERSONAL_VALUES** (Ehre, Treue, Verantwortung, Heimat, Familie, Freiheit, Stärke,
  Disziplin, Glaube, Mut, Tradition, Zusammenhalt, Respekt, Aufrichtigkeit, Demut),
  Gender ('mann'/'frau'/leer), Religion (4 + leer), CrossStyle,
  **4 Reaktionen (respekt 🫡 / anerkennung 🏆 / zuspruch 💪 / verbundenheit 🤝)**,
  ActivityType-Labels, 9 Moderations-Gründe.
- **orden.ts (375):** 4 Tiers (bronze/silber/gold/legendaer mit Farbsystemen), 5 Kategorien
  (Aktivität, Gemeinschaft, Entdecker, Inhalt, Extrem Selten). **29 Orden-Definitionen**, u. a.:
  Dauerbrenner I–III + „Ewige Flamme" (7/14/30/100 Tage-Streak), Frühaufsteher, Nachtwache,
  Fahnenträger, Wortführer I–II + „Volkstribun", Standhafter/Unbeugsamer („Verteidigungen"),
  Bruderschaft/Volksheld (Freunde), Wandersmann/Pilger/Kreuzritter (Stempel),
  Bundesland-/Deutschlandkenner, Chronist-Reihe, Geschmackswächter/Denkmalpfleger,
  **Urgestein, Meister aller Klassen, Phönix** (Extrem Selten, bis 10.000 EP).
  Dazu CHARACTER_DIMENSIONS (6 Achsen fürs Radar: Disziplin, Beständigkeit, Gemeinschaft,
  Entdeckergeist, Wortstärke, Einfluss).
- **games.ts (199):** 3 Spiele (shadow_cards, vier_gewinnt, schiffe_versenken `available:false`),
  Lobby-/Session-Typen, CardSuits (⚔️🛡️👑🔥⛰️🦅) + 🌑-Schattenkarte,
  `generateDeck/shuffleDeck/findPairs`.
- **kaderschmiede.ts (233):** Trupp/Challenge/Workout/CheckIn-Typen, 6 Sportkategorien
  (Calisthenics, Kampfsport, Ausdauer, Eisbaden, Kraftsport, Wandern), Level, Challenge-Typen
  (1v1/Gruppe/Stadt/Bundesland), **Check-in-Konstanten (50 m Radius, 30 s Token-Rotation,
  60 s Gültigkeit, 100 m max GPS-Accuracy)**, Racing-Typen (RacerPosition, SpectatorInfo,
  CheerMessage 🔥⚡💪👏📯), BUNDESLAND_COORDS.
- **colors.ts:** Vollständiges Theme (light/dark nahezu identisch dunkel), Gold/Cream-Palette, matte*-Tokens.
- **germany_map_data.ts:** SVG-Pfade für 16 Bundesländer (viewBox 586×793) + Label-Koordinaten.
- **queryKeys.ts:** Zentrale React-Query-Keys.
- **fonts.ts:** Inter-Schrift-Token.

---

## 6. Versteckte / besondere Features & Easter Eggs

1. **☀️ Sonnenuhr (SunDial) — das Profil-Easter Egg (`components/SunDial.tsx`, 488 Zeilen):**
   - Umschließt den Profil-Avatar: 60 Mini-Dots im Kreis (Radius 84), Tag/Nacht-Arc je nach
     Sonnenstand, Sunrise/Sunset-Marker.
   - **Berechnet Sonnenzeit astronomisch selbst** (Deklination-Formel, kein API-Call!) —
     basierend auf **Wohnort-Breitengrad**: über 60 Städte (Berlin→Weimar) plus **Wien, Zürich,
     Salzburg, Graz, Innsbruck, Linz, Bern**; Fallback 51.0°.
   - Die Sonne/Mond-Icon wandert real über den Tag (Update alle 30 s), pulsiert + glüht (Loops).
   - **Interaktion: Tippen auf die Sonne (52 px Hit-Area) togglet mit Haptic-Light ein
     Info-Overlay** mit exakten Sonnenaufgangs-/untergangszeiten (formatiert) + aktueller
     Uhrzeit-Tooltip. (Nur Tap — kein Long-Press.)
   - Gated auf `profile.showSunDial !== false` (DB-Feld `users.show_sundial`, Toggle in
     edit.tsx) — Default an.
2. **Fahne hissen** (Profil): 24 h „Flagge zeigen" mit animierter WavingFlag, Glow-Ring um
   Avatar, Counter „X Patrioten aktiv" (DB-Query), Tap auf Banner → Alert mit Dauer +
   „Fahne einholen"-Bestätigung. Eigener Orden „Fahnenträger" (30×) referenziert es.
3. **Long-Press-Interaktionen:** Profil-Grid-Items (Archivieren/Löschen/Wiederherstellen),
   FeedCard (Kontextmenü), post-detail-Bild (**Long-Press → Reaktions-Picker**),
   Chat-Nachrichten (Bearbeiten/Zurückziehen), admin/users (Auswahl), create-story (Haptic auf Edit).
4. **Double-Tap** im FeedCard → Heart-Pop-Animation.
5. **Zeremonien:** OrdenCeremony (Strahlen/Partikel) & WaxSealCeremony (Screen-Shake,
   Impact-Flash, Wachstropfen) als Belohnungs-Momente.
6. **Sichere Check-ins** (Kaderschmiede): rotierende QR-Token, GPS-Spoofing-Erkennung,
   Entfernungs-Gate — Anti-Cheat-Design (siehe auch §7 in HANDOVER.md für die Stempel-Pläne).
7. **Spiele-Tab versteckt** (`href: null`) aber voll funktional inkl. Bot-Gegner.
8. **Inbox-Tab versteckt** (Badge-gesteuert), enthält Audio-Nachrichten-Player.
9. **Leitsätze des Tages**: 365 handgeschriebene Sprüche (`mocks/leitsaetze.ts` + CSV) für die Startseite.
10. **Fakultativ:** Story-FlipClock (Uhrzeit-Anhang), Story-Polls, Wetter-Badge, prozeduraler
    Avatar-Generator, Ordenshalle mit Lock-Zuständen.

---

## 7. Demo / Mock / Unfertig-Markierungen (vollständige Liste)

| Stelle | Problem |
|---|---|
| `hooks/useContent.ts` | **DEMO_PLACES**: 3 Brandenburger-Tor-Varianten werden allen echten Orten vorangestellt — entfernen, sobald echte Daten da sind. |
| `app/(tabs)/profile/index.tsx` (~L.954) | Spotify-Widget: `{false && spotifySettings.enabled && …}` — **bewusst tot**, keine OAuth-Anbindung; `SpotifyProvider.getTrackForUser` liefert für Fremde eh immer `null`. |
| `app/(tabs)/_layout.tsx` | Spiele-Tab `href: null` (bewusst versteckt). |
| `user-profile.tsx` (~L.284/289) | `userReels`/`taggedReels` hart `[]`; Fallback „mockUser" aus UserCache. |
| `ChatProvider` | `simulatePartnerRead` (Read-Receipts gefaked); `sendVoiceMessage` speichert nur Text-Platzhalter + **lokale URI (Audio wird nie hochgeladen)**; acceptMessageRequest nur im RAM. |
| `ReelsProvider` | Reel-Reaktionen nur lokal (kein DB-Write); `createReel` ignoriert DB-Fehler; Media-URIs lokal. |
| `PostsProvider.createPost` | **Feed-Bild-Upload kaputt** — lokaler `file:///`-URI landet in DB. Priorisiertes TODO (Fix-Plan: HANDOVER.md §7). |
| `useOrden`/characterValues | `characterValues` immer `[0,0,0,0,0,0]` (RadarChart ohne echte Werte). |
| `PostsProvider.savedVisibility` | Sichtbarkeits-Umschalter nur State, keine DB/Enforcement. |
| Push (`AdminProvider.addPushNotification`) | Nur lokale Notification + DB-Zeile; kein Expo-Push/Remote. |
| Passwort-Reset | Kein SMTP konfiguriert → Flow tot. |
| `expo/backend/trpc/` + `lib/trpc.ts` | Demo-Restand (in-memory, Plaintext-Passwörter), wird produktiv nicht benutzt — Kandidat für Entfernung. |
| `expo/mocks/leitsaetze.*` | Bewusst statischer Inhalt (365 Sprüche) — keine Tabelle. |
| `admin/push-detail` | Receipts immer leer. |
| Media-Uploads (AdminImagePicker, create-trupp) | Ohne Komprimierung; geplanter zentraler `lib/mediaUpload.ts`-Dienst (HANDOVER.md §7) **nicht umgesetzt**. |
| Kaderschmiede lobby (racing) | Teil der Session-Logik läuft lokal/in-memory (Bots/States), DB-Writes best-effort. |
| `user-stamps.tsx` | `TODO`-Markierung (L.39); Stempel-Detail-Ansicht „hidden". |

---

## 8. Supabase-Tabellen-Katalog (~47 Tabellen)

Vollständiges, idempotentes Schema: **`expo/supabase/COMPLETE_SCHEMA.sql`** (Referenz), plus
`COMPLETE_SETUP.sql`, `KOMPLETT_AUSFUEHREN.sql`, Schritte 1–5 (Tabellen/Constraints/Funktionen/
RLS/Index+Seed) und Einzel-Migrationen (`migration_kaderschmiede.sql`, `migration_checkin.sql`,
`migration_moderation_actions.sql`, `migration_posts_fields.sql`,
`migration_promotions_tables.sql`/`_rls.sql`, `orders_migration.sql`).

| Tabelle | Zweck |
|---|---|
| `users` | Profile (display_name, username, bio, avatar_url, rank, rank_icon, xp, stamp/post/friend_count, birthplace(+plz), residence(+plz), bundesland, gender, religion, cross_style, show_gender/religion/**sundial**, flag_hoisted_at, is_admin, banned) |
| `user_values` | Persönliche Werte (1 Zeile je Wert) |
| `privacy_settings` | 10 Privatsphäre-Flags (everyone/friends/private) |
| `friendships`, `friend_requests`, `blocked_users` | Sozialgraph |
| `posts`, `post_likes`, `post_comments` | Feed (media_urls[], media_type, location, tagged_user_ids, tags, is_archived, comments_disabled) |
| `stories`, `story_viewers` | 24-h-Stories (bg_color, font_family, text_x/y/scale, image offsets, metadata JSON) |
| `chat_messages` | DMs (from/to, read, read_at, edited, recalled, is_system) |
| `reels`, `reel_bookmarks`, `reel_comments`, `reel_comment_likes` | Reels |
| `news`, `places`, `restaurants`, `reviews`, `review_votes`, `favorites`, `collected_stamps` | Content & Stempel-Pass |
| `inbox_notifications`, `push_notifications` | Postfach (inkl. audio_uri) & Admin-Push |
| `submissions` | User-Vorschläge (Ort/Restaurant, Review-Workflow) |
| `live_locations` | Live-Standort (upsert je user, expires_at, audience, specific_user_ids) |
| `spotify_tracks` | Current-Track (nur gelesen, von außen zu befüllen) |
| `reports`, `moderators`, `user_restrictions`, `moderation_actions` (mit post_snapshot), `moderation_appeals` | Moderation komplett |
| `sponsors`, `promotions`, `promotion_impressions`, `promotion_clicks`, `promotion_daily_stats` | Werbung/Analytics (+ RPC `aggregate_promotion_daily_stats`, `admin_delete_post`, `is_admin()`) |
| `orders`, `user_orders` | Orden-Katalog & Errungene |
| `kaderschmiede_activities` + `_activity_participants`, `_trupps` + `_trupp_members` + `_trupp_meetings` + `_meeting_attendees`, `_challenges` + `_challenge_participants` + `_challenge_results`, `_workout_logs`, `_checkins` + `_checkin_entries` | Fitness-Plattform (Check-in: code, host_gps, token_epoch, is_mocked, distance_to_host) |
| `game_rooms`, `game_room_members`, `game_sessions` | Spiele-Lobby (best-effort, Fehler werden ignoriert) |
| Storage-Buckets | `admin-uploads` (Admin-Bilder); geplanter `media`-Bucket (Posts) fehlt noch |

**Bekannte Konten (aus HANDOVER.md):** Admin `maverick.offiziell@gmail.com` (`is_admin: true`);
Admin-Einstieg in-app: Profil → Einstellungen → „Admin Panel".

---

## 9. Nächste Schritte (empfohlene Reihenfolge laut HANDOVER.md)

1. Media-Upload-Dienst (`lib/mediaUpload.ts`: Komprimierung + Thumbnail + Storage-Bucket) —
   behebt Feed-Bilder, Reels, Voice, Trupp-Logos (Plan: HANDOVER.md §7).
2. SMTP einrichten (z.B. Resend) für Passwort-Reset.
3. Remote-Push (Expo Push Token + Edge Function) statt nur lokal.
4. Demo-Orte + tRPC-Backend entfernen; Entscheidungen: Spotify, Spiele-Tab, Videos.
5. Stempel-Verifikation: Dreistufen-Modell (HANDOVER.md §11) umsetzen.
