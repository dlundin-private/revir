# Revir

Ett territoriespel för barn i webbläsaren. Kör ut från ditt område, rita en slinga
och kom hem för att ta marken. Den som kör på ditt spår slår ut dig. Först till
30 % av banan vinner.

Inga konton, ingen reklam, inga köp. Spelet fungerar offline och kan läggas på
hemskärmen som en app.

## Kom igång

```bash
npm run serve      # enkel statisk server på http://localhost:8080
```

Öppna sedan adressen i webbläsaren. Service workern (offlineläget) körs bara över
http/https, inte om du dubbelklickar på `index.html`.

## Publicera

GitHub Pages publicerar grenen `main` från roten. Push till `main` och spelet är
live efter någon minut på https://revir.chandler.se.

## Installera på mobilen

Öppna spelets adress, och välj sedan:

- **iPhone/iPad (Safari):** Dela → Lägg till på hemskärmen
- **Android (Chrome):** menyn ⋮ → Installera app / Lägg till på startskärmen

Efter första besöket fungerar spelet i flygplansläge.

## Uppdatera spelet

Ändra spelets filer och höj `VERSION` i `sw.js` (t.ex. `revir-v3`).
Annars fortsätter installerade kopior att visa den gamla versionen.

## Struktur

```
index.html             sidan och gränssnittet
style.css              utseende, ljust och mörkt läge
game.js                hela spelet (värld, botar, superkrafter, repris, rendering)
sw.js                  offline-cache
manifest.webmanifest   app-inställningar för hemskärmen
icons/                 appikoner
.nojekyll              GitHub Pages serverar filerna som de är
CNAME                  egen domän, revir.chandler.se
docs/BACKLOG.md        idéer framåt
CLAUDE.md              instruktioner för Claude Code
```
