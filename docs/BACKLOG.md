# Backlog

Idéer, inte löften. Ta en i taget.

## Spel
- Fler superkrafter: magnet som drar till sig ledig mark, spöke (kan köra genom andras spår), krympstråle.
- Svårighetsgrad för botarna (lätt / normal / svår) – styr fart, aggressivitet och hur långt de vågar sig ut.
- Valbart mål: 20 %, 30 % eller 50 %.
- Rundtimer som alternativ: mest mark efter 3 minuter vinner.
- Spelarnamn och egen färg/emoji för "Du".

## Känsla
- Ljud och musik (Web Audio, avstängningsbart, sparas i localStorage).
- Vibration på mobil vid utslagning och upplockning.
- Liten "+X %"-text när man tar mark.

## Teknik
- Dela upp `game.js` i ES-moduler (world, bots, powerups, replay, render, ui, themes) när filen blir för stor att jobba i.
- Automatiska tester av spelmotorn i Node (capture, kill, arv av mark, vinstvillkor) med stubbad canvas.
- Prestanda: rita bara synlig del av territoriebilden på stora skärmar.
