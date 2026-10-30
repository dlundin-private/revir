# Revir – instruktioner för Claude Code

## Vad det är
Revir är ett eget territoriespel för barn (6–13 år) som körs helt i webbläsaren.
Spelaren styr fritt i 360°, lämnar ett spår utanför sitt område och tar mark genom
att stänga en slinga. Sju datorstyrda motståndare. Först till 30 % vinner.

Hobbyprojekt. Grundprinciper som alltid gäller:
- Ingen reklam, inga köp, inga konton, ingen pay-to-win, inga nätverksanrop under spel.
- Allt UI på svenska. Typografiska citattecken och apostrofer i synlig text (” ’).
- Ska fungera offline (PWA) och på mobil i både stående och liggande läge.
- Barnvänligt: inget våld utöver att man "slås ut", inga skrämmande bilder.
- Originalitet: Revir har eget namn, egen grafik och egna figurer. Nämn inte andra
  spel vid namn i kod, kommentarer, texter, commit-meddelanden eller filnamn, och
  efterlikna inte andra spels utseende, logotyper eller figurer.

## Köra och testa
- `npm run serve` – statisk server på http://localhost:8080.
- `npm run check` – syntaxkontroll.
- Inget byggsteg. Spelets filer ligger i roten och serveras som de är.

Efter ändringar i spelets filer: höj `VERSION` i `sw.js`, annars får installerade
klienter gamla filer. Nya filer läggs till i `FILES`. Service workern rör bara
cachar som börjar på `revir-`, eftersom adressen kan delas med de andra spelen.

## Driftsättning
GitHub Pages publicerar grenen `main` från roten (`.nojekyll` gör att filerna
serveras som de är). Push till `main` = live efter någon minut på
https://revir.chandler.se. Testa större ändringar på en egen gren först.

## Arkitektur (game.js)
En IIFE med delat tillstånd. Sektioner i filen i ordning:

1. **World** – rutnät 240×240 (`W`, `H`). `owner[i]` = ägare (spelar-id+1),
   `trail[i]` = spårägare, `tseq[i]` = spårets sekvensnummer (för egen-krock).
   Konstanter: `PR` huvudradie, `TR` spårradie, `STEP` rörelsesteg, `SELF_K`.
2. **Themes** – `THEMES` med palett (8 färger, index 0 = spelaren), bakgrund,
   kantfärg, dekor (`deco`) och botarnas emoji/namn. `makeTile()` ritar en
   sömlös bakgrundsruta per tema. Valt tema sparas i localStorage (`revir-theme`).
3. **Territory images** – `cvL`/`cvD` är 240×240-canvasar (ljus färg + kontur).
   `setOwner()` uppdaterar räknare och pixlar. `rebuild()` ritar om allt.
4. **Spelare** – `players[0]` är du (`me`). Rörelse: `update()` vrider mot
   `p.target` med `p.turn` och flyttar i steg om `STEP`; `advance()` gör
   krockkontroll, stämplar spår och anropar `capture()` vid hemkomst.
5. **capture()** – gör spåret till mark och flood-fyller inneslutna ytor inom
   ägarens bounding box.
6. **kill()** – den som slår ut någon ärver offrets mark. Vägg och eget spår
   frigör marken. Skyddade (sköld) kan inte dö.
7. **Power-ups** – `PW`-listan: 0 sköld (5 s), 1 dubbel fart (5 s),
   2 frys andra (3 s), 3 markbomb (radie 10). `items`, `spawnItem()`,
   `pickups()`, `tickItems()`. Ny kraft = ny post i `PW` + gren i `pickups()`
   + vikt i `spawnItem()` + ev. visuell effekt i `render()`.
8. **Bots** – `botThink()` var 80 ms: jaga närliggande fiendespår, annars
   rektangelliknande utflykter (`legA`/`legB`), hem vid hot eller lång tur,
   strålkontroll (`rayClear`) för att undvika vägg och eget spår.
9. **Replay** – ringbuffert `rec` (300 bildrutor). Per spelare 7 floats i `h`:
   x, y, levande, vinkel, sköld kvar, fart kvar, frusen kvar. Marken sparas som
   delade ögonblicksbilder bara när den ändrats. Ändrar du antalet fält: uppdatera
   `id*7` och `Float32Array(56)` överallt.
10. **UI / Render / Loop** – `mode` är `'live'`, `'replay'` eller `'ended'`.
    Vinstkontroll (`GOAL = 0.30`) sker i loopen och anropar `endRound()`.

## Konventioner
- Ren JavaScript, inga ramverk, inga externa beroenden i spelet.
- Färger på sidan via CSS-variabler på `:root` med mörkt läge. Canvas-färger
  kommer från temat.
- Testa på smal mobilskärm (~380 px) och desktop. Styrning: dra med fingret
  (flytande joystick), mus, piltangenter/WASD.
- Håll filer läsbara; dela upp `game.js` i moduler först när det behövs
  (se `docs/BACKLOG.md`).
