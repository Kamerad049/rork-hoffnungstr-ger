# 06_PLAN.md — Geplantes, Offenes, Empfehlung

> Erstellt: 2026-10-02. Prioritäten: **muss** (vor echtem Start), **soll** (kurz danach), **kann** (später).

---

## 1. Geplant, aber NICHT gebaut

| Priorität | Was | Stand der Planung | Beleg |
|---|---|---|---|
| muss | **Zentraler Medien-Upload-Dienst** (`expo/lib/mediaUpload.ts`): Client-Komprimierung (max 1440 px, JPEG ~0,7 → ~300 KB), Thumbnail (~400 px), Direkt-Upload Handy→Storage, Bucket `media` mit Ordner `posts/{user_id}/`, **Start ohne Videos** | Vollständig durchdacht & beschlossen | `HANDOVER.md` §7; Nutzer gab konzeptionell „Go", Umsetzung wurde verschoben |
| muss | **SMTP für E-Mails** (z. B. Resend) — Passwort-Reset | Angebot, nicht eingerichtet | `05_KRITISCH.md` §1 #3 |
| muss | **Datenschutzerklärung/Impressum echt befüllen + Konto-Löschung** | offen | `05_KRITISCH.md` §1 #1/#2 |
| muss | **Stempel-Verifikation 3 Stufen** (Bronze: GPS-Plausibilität + Teleport-/Zeit-in-Zone-Prüfung serverseitig · Silber: App-Foto + EXIF + GPS-Spoofing-Block · Gold: Orts-Quiz/QR/NFC) | Modell beschlossen, DB-Felder skizziert (`places.verification_level`, `collected_stamps.verified_at/verification_data`) | `HANDOVER.md` §11 |
| muss | Demo-Orte entfernen | ein Zeilen-Eingriff | `expo/hooks/useContent.ts` Zeilen 11/109 |
| soll | **Remote-Push** (Expo Push Token + Edge Function) | Ansatz bekannt | `05_KRITISCH.md` §2 #6 |
| soll | Admin-Bild-Upload komprimieren (gleicher Dienst wie oben) | Teil des Upload-Dienstes | `05_KRITISCH.md` §2 #8 |
| soll | Rangsystem sichtbar aufwerten; R2 als Storage-Upgrade bei Wachstum | Option dokumentiert | `HANDOVER.md` §7 Punkt 7 |
| kann | Spiele-Tab zurück in die Tab-Leiste | Code fertig, nur `href` setzen | `expo/app/(tabs)/_layout.tsx` Zeilen 53–99 |
| kann | Spotify-Integration (OAuth) | offen | `expo/components/NowPlayingWidget.tsx` |
| kann | PWA/Website als zweiter Zugang | Inhaber will zuerst native App (Entscheidung 2026-10-02) | `01_IDEE.md` §6 |
| kann | RevenueCat-Abo/Monetarisierung | nur erwähnt | `expo/README.md` |

## 2. Offene Entscheidungen — NUR der Inhaber kann das (Fragenliste)

1. **Videos im Feed?** Start ohne Videos oder mit hartem Limit (z. B. 15–30 s / 50 MB)? (Kosten!)
2. **Thumbnails im Feed** einbauen — einverstanden? (Nutzer-Zustimmung stand noch aus)
3. **Spotify-Widget:** weiterverfolgen oder endgültig streichen?
4. **Spiele-Tab:** wann zurück in die Tab-Leiste?
5. **Monetarisierung:** Soll es überhaupt ein Abo geben? Wenn ja, was ist Premium?
6. **Splash/Branding:** `heldentum-splash.jpg` einbinden? (`expo/app.json` Zeile 13)
7. **Stempel-Verifikation:** Ab welcher Stufe für welche Orte? (Ordnet der Inhaber Orte in Bronze/Silber/Gold ein)
8. **E-Mail-Anbieter** für SMTP (Empfehlung stand: Resend) — welchen will er?
9. **App-Store-Name/Altersfreigabe/Kategorie** für die Store-Einträge.
10. **R2-Wechsel:** erst bei welchen monatlichen Kosten umschalten?

## 3. Empfehlung: die nächsten 10 Schritte (Reihenfolge + Aufwand)

| # | Schritt | Warum zuerst | Aufwand (grob) |
|---|---|---|---|
| 1 | `expo/lib/mediaUpload.ts` bauen + Feed-Anbindung reparieren | Größter kaputter Kern-Feature; Kostenrisiko gleichzeitig abgedeckt | 1–2 Arbeitstage |
| 2 | Demo-Orte entfernen + Splash branden | 10-Minuten-Aufräumen mit sichtbarem Effekt | < 1 h |
| 3 | SMTP einrichten (Resend) + Passwort-Reset testen | Sonst ist jeder vergessene Login ein Support-Fall | 1–2 h |
| 4 | Datenschutzerklärung/Impressum echt befüllen + Konto-Löschung bauen | Rechtliche Pflicht vor echten Nutzern | 1 Tag (+ Rechtstext vom Inhaber beschaffen) |
| 5 | Stempel-Verifikation Stufe 1+2 (serverseitige Plausibilität, Spoofing-Block, EXIF) | Vertrauenswürdigkeit des Kern-Features | 2–3 Tage |
| 6 | Remote-Push (Expo Push + Edge Function) | Engagement/Bindung | 1–2 Tage |
| 7 | Crash-Monitoring + minimale Analytics (z. B. Sentry) | Ohne Zahlen fliegt man blind | 0,5 Tag |
| 8 | Policies-Review (alle 47 Tabellen) + `.env.example` | Sicherheits-Freibrief vor Start | 1 Tag |
| 9 | Erster Store-Build (EAS) auf eigenem Rechner + interne Testrunde | Noch nie gelaufen — früh risiken sehen | 1–2 Tage |
| 10 | Orts-Quiz für Gold-Orte + Spiele-Tab-Rückkehr | Wachstums-/Freizeit-Features danach | 1–2 Tage je nach Umfang |

Begründung der Reihenfolge: Erst den kaputten Kern (1) und Pflichten (3/4) erledigen, dann
Vertrauen ins Kern-Versprechen (5), dann Bindung (6/7), erst danach Wachstums-Sachen (10).
