# TRICK OR CUFF: THE GREAT HEIST

*Tiny flying thieves grab cash in their own colour and escape through the gate before the giant police catch them. 1-minute rounds.*

A real-time first-person multiplayer game for 2–8 players. Players join from any phone or laptop with a room code. No login or install is needed.

## Rules
- **Police**: 1 police for 2–4 players, 2 police for 5–8. Police are about 6 m tall and catch thieves by touching them from the front or sides. Each police officer wears glasses that turn **red** when they have a real line of sight to a thief. While the glasses are red, the officer runs 4.5 → 7 m/s and its footsteps get heavier. When the thief ducks behind a building, the glasses go back to blue and the speed drops back to normal.
- **Thieves**: about 1 m tall. **Hold to fly** (Space, mouse button, or the big button on a phone). Release to glide down. Flying uses energy, which refills when you stand on the ground or a rooftop.
- **Colour money**: each round, every thief gets a random colour of their own. Three bills of that colour are spread far apart across the city: two on the ground and one on a rooftop, bridge or platform. Only two are needed. Touching a bill collects it automatically. Bills of other colours can't be picked up.
- **Escape**: a thief with 2 bills can use the gate. The gate is in the far north-west corner, diagonal from where thieves start. Stand inside it for 3 seconds to escape. Each thief wins or loses on their own.
- **Police speed levels**: every time a thief collects their first bill, all police go up one speed level (+0.5 m/s to both normal and chase speed).
- The round ends when every thief has escaped or been caught, or when the 1 minute runs out. Thieves who escaped win, and police win if no thief escaped.
- **Fair rotation**: police are picked from the players who have been police the fewest times this session, at random among ties, and never the same player twice in a row when that can be avoided. The history resets only in a new room.

The server is authoritative. It runs the line-of-sight raycasts against the city geometry, checks movement speed (normal vs chase), and decides money pickups (own colour only), speed levels, captures, each thief's escape timer, role rotation and results.

## Run locally
Double-click `start-game.bat` (Windows), or run `npm install` and then `npm start`. Then open http://localhost:3000.

## Deploy (Render, free)
1. Push this folder to a GitHub repository.
2. On render.com, choose New → Web Service. Set Build Command to `npm install`, Start Command to `npm start`, and Instance Type to Free.
3. Share the https://….onrender.com link.
