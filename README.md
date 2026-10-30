# Revir

Ett territoriespel för barn i webbläsaren. Kör ut från ditt område, rita en slinga
och kom hem för att ta marken. Den som kör på ditt spår slår ut dig. Först till
30 % av banan vinner.

Inga konton, ingen reklam, inga köp. Spelet fungerar offline och kan läggas på
hemskärmen som en app.

## Kom igång

```bash
npm install
npm run dev        # Cloudflare-miljö lokalt (wrangler dev)
# eller
npm run serve      # enkel statisk server på http://localhost:8080
```

Öppna sedan adressen i webbläsaren. Service workern (offlineläget) körs bara över
http/https, inte om du dubbelklickar på `index.html`.

## Publicera

```bash
npx wrangler login   # första gången
npm run deploy
```

Spelet hamnar på `https://revir.<ditt-konto>.workers.dev`. Egen domän kopplas i
Cloudflare-panelen under Workers → revir → Settings → Domains & Routes.

## Installera på mobilen

Öppna spelets adress, och välj sedan:

- **iPhone/iPad (Safari):** Dela → Lägg till på hemskärmen
- **Android (Chrome):** menyn ⋮ → Installera app / Lägg till på startskärmen

Efter första besöket fungerar spelet i flygplansläge.

## Uppdatera spelet

Ändra filerna i `public/` och höj `VERSION` i `public/sw.js` (t.ex. `revir-v2`).
Annars fortsätter installerade kopior att visa den gamla versionen.

## Struktur

```
public/
  index.html             sidan och gränssnittet
  style.css              utseende, ljust och mörkt läge
  game.js                hela spelet (värld, botar, superkrafter, repris, rendering)
  sw.js                  offline-cache
  manifest.webmanifest   app-inställningar för hemskärmen
  _headers               cache-regler på Cloudflare
  icons/                 appikoner
docs/BACKLOG.md          idéer framåt
CLAUDE.md                instruktioner för Claude Code
wrangler.toml            Cloudflare Workers-konfiguration
```
