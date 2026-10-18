# 04_DATEN.md — Datenbank: Modell, Regeln, Inhalt

> Erstellt: 2026-10-02. Quelle der Wahrheit für Spalten/Typen: **`UEBERGABE/schema.sql`**
> (Kopie von `expo/supabase/COMPLETE_SCHEMA.sql`, idempotent, TEIL 0–49).
> Diese Datei beschreibt jede Tabelle mit Zweck, Beziehungen und den wichtigsten Feldern;
> **alle** Felder mit Typ/Standard stehen in `schema.sql` (dort je Tabelle als `CREATE TABLE`).

---

## 1. Überblick

- Anbieter: **Supabase** (PostgreSQL + Auth + Storage + Realtime), Projekt-Ref `cyrjtpnjclwchhorqwkr` (Adresse in `expo/.env`, Name `EXPO_PUBLIC_SUPABASE_URL`).
- **47 Tabellen** (gezählt in `expo/supabase/COMPLETE_SCHEMA.sql`: 47 × `CREATE TABLE`).
- **RLS (Row Level Security) auf allen Tabellen aktiv** (TEIL 47). Admin-Rechte = `users.is_admin = true`, geprüft über die SECURITY-DEFINER-Funktion `public.is_admin()` (TEIL 48).
- Rollen: `anon` (nicht angemeldet), `authenticated` (angemeldet), Admin (Feld `is_admin`).

## 2. Zugriffsregeln (Kurzfassung; vollständige Policies: `schema.sql` ab TEIL 49)

| Wer | Darf |
|---|---|
| `anon` | Fast nichts lesen (öffentliche Inhalte wie Orte/News **ungeprüft** — Policies je Tabelle in `schema.sql` prüfen) |
| `authenticated` | Eigene Zeilen lesen/schreiben (Eigentümer = `auth.uid()`), öffentliche Inhalte (Posts, Orte, Restaurants, News, Ranking) aller lesen |
| Admin (`is_admin`) | Über `is_admin()` alles lesen/löschen/ändern (Moderation, Verwaltung) |
| Storage-Bucket `admin-uploads` | Öffentlich lesbar; Schreiben nur mit angemeldetem Nutzer (Admin-Uploads) |

Anmeldeverfahren: Supabase **Auth mit E-Mail + Passwort** (`expo/providers/AuthProvider.ts`).
Kein SMTP eingerichtet → Passwort-Reset- und Verifizierungs-Mails funktionieren nicht.

## 3. Migrationen / Schemaänderungen in Reihenfolge (ausführbar im Supabase-SQL-Editor)

1. `expo/supabase/COMPLETE_SCHEMA.sql` — Grundschema (ersetzt die alten `SCHRITT_1…5`- und `COMPLETE_SETUP.sql`/`KOMPLETT_AUSFUEHREN.sql`, die nur noch Historie sind).
2. `expo/supabase/orders_migration.sql` — Orden-Definitionen/-Verknüpfung (Tabelle `orders`, `user_orders`).
3. `expo/supabase/migration_posts_fields.sql` — Zusatzfelder an `posts` (u. a. Ort, Markierungen).
4. `expo/supabase/migration_kaderschmiede.sql` — Kaderschmiede-Basis.
5. `expo/supabase/migration_checkin.sql` — sicherer Kader-Check-in (Codes/Tokens).
6. `expo/supabase/migration_moderation_actions.sql` — Moderations-Aktionen/Eskalation.
7. `expo/supabase/migration_promotions_tables.sql` — Werbe-Tabellen.
8. `expo/supabase/migration_promotions_rls.sql` — RLS für Werbe-Tabellen.

(Echte Ausführungsreihenfolge im Live-Projekt: **unbekannt**; obige Reihenfolge ist die empfohlene für einen Neuaufbau.)

## 4. Tabellen (47) — Zweck, Schlüsselfelder, Beziehungen

### Nutzer & Profil
| Tabelle | Zweck / Schlüsselfelder |
|---|---|
| `users` | Profil: `id` (= auth-User, UUID), display_name, bio, avatar_url, gender, religion, rank, xp, birthplace, residence, bundesland, `is_admin` (bool), Privatsphäre-Felder. Zentrale Beziehung zu fast allem. |
| `user_values` | Charakter-Werte pro Nutzer (6 Werte) — wird in der App laut Audit immer `0` gelesen. |
| `privacy_settings` | 10 Sichtbarkeits-Schalter je Nutzer. |
| `user_orders` | Verdiente Orden: user_id → `orders`. |
| `orders` | 29 Orden-Definitionen (Stufen Bronze bis „Legendaer"). |

### Social / Feed
| Tabelle | Zweck / Schlüsselfelder |
|---|---|
| `posts` | Feed-Posts: user_id, content, **media_urls (text[])**, media_type, location, tagged_user_ids. ⚠️ hier landen aktuell lokale `file:///`-URIs (siehe `05_KRITISCH.md`). |
| `post_likes` | Like: post_id + user_id (eindeutig). |
| `post_comments` | Kommentare zu `posts`. |
| `favorites` | Gespeicherte Inhalte. |
| `stories` | Stories: user_id, media_url, expires_at (24 h). |
| `story_viewers` | Wer welche Story sah. |
| `reel_comments`, `reel_comment_likes`, `reel_bookmarks` | Reel-Interaktionen. |
| `chat_messages` | 1:1-Nachrichten: sender_id, receiver_id, content, type (text/voice), read_at. Realtime aktiviert. |
| `friendships` | Bestätigte Freundschaften (beide user_ids). |
| `friend_requests` | Offene Anfragen (status pending/accepted/declined). |
| `blocked_users` | Blockierungen. |
| `inbox_notifications` | In-App-Benachrichtigungen. |
| `push_notifications` | Push-Verlauf (Admin) — **nur Einträge, kein echter Versand**. |
| `live_locations` | Geteilter Live-Standort: user_id, lat/lng, accuracy, expires_at, audience. |

### Orte, Küche, Inhalt
| Tabelle | Zweck / Schlüsselfelder |
|---|---|
| `places` | Historische Orte: name, description, lat/lng, bundesland, image_url, XP-Wert. ⚠️ keine Verifikations-Stufe (Geplant, `05_KRITISCH.md`). |
| `collected_stamps` | Stempel: user_id + place_id + check-in-Daten (GPS, Foto-Referenz). |
| `restaurants` | Küche: Name, Ort, Küchenrichtung, Bild. |
| `reviews` | Bewertungen für Ort/Restaurant (rating, text). |
| `review_votes` | Hilfreich-Stimmen auf Bewertungen. |
| `news` | Admin-News (title, body, image, published). |
| `submissions` | Nutzer-Empfehlungen neuer Orte/Restaurants (Status-Workflow). |
| `sponsors` | Sponsoren (Logo, Link). |
| `promotions`, `promotion_impressions`, `promotion_clicks`, `promotion_daily_stats` | Werbe-Kampagnen + Messung. |
| `spotify_tracks` | Gecachte Spotify-Titel (Feature ausgeschaltet). |

### Kaderschmiede (Fitness)
| Tabelle | Zweck / Schlüsselfelder |
|---|---|
| `kaderschmiede_trupps`, `kaderschmiede_trupp_members` | Trupps + Mitgliedschaften (Rollen). |
| `kaderschmiede_trupp_meetings`, `kaderschmiede_meeting_attendees` | Treffen + Anwesenheit (Check-in-Codes/Token). |
| `kaderschmiede_activities`, `kaderschmiede_activity_participants` | Trainings-Aktivitäten + Teilnahme. |
| `kaderschmiede_challenges`, `kaderschmiede_challenge_participants`, `kaderschmiede_challenge_results` | Challenges + Ergebnisse. |
| `kaderschmiede_workout_logs` | Trainings-Logbuch. |
| `kaderschmiede_checkins`, `kaderschmiede_checkin_entries` | Sichere Check-ins (Token `KADER:{id}:{epoch}:{nonce}`, GPS-Werte). |

## 5. Welche Daten liegen real darin?

(Audit-Stand 2026-09/10; **keine personenbezogenen Inhalte hier wiedergegeben**)

| Art | Menge/Art |
|---|---|
| Nutzerkonten | 2 (davon 1 Admin). Test-Daten des Inhabers — **keine echten Fremdnutzer** |
| Orte | wenige echte + **3 Demo-Orte nur im Code** (`expo/hooks/useContent.ts`, nicht in DB) |
| Restaurants, News, Orden-Definitionen | Seed-Daten aus den SQL-Skripten vorhanden |
| Posts/Stories/Chat/Meldungen | Test-Daten aus Entwicklungs-/Preview-Nutzung (gering) |
| Alles zusammen | **Testphase-Datenbank; keine Migration/Anonymisierung nötig**, aber auch kein echter Nutzerbestand |

## 6. Schema-Definitionsdatei

- `UEBERGABE/schema.sql` — vollständiges `CREATE TABLE`-SQL aller 47 Tabellen inkl. Indizes, RLS-Aktivierung, `is_admin()` und allen Policies (TEIL 0–49).
