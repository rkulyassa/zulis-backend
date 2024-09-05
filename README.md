# Zulis.io Backend

The goal here was to build a game similar to [Agar.io](https://agar.io). Unfortunately, some of the other devs left the project and it never came to fruition. Despite that, what's seen here is my personal contribution to what would've been a cool game, including, but not limited to, the following:
- Web server to manage game servers and worlds (`src/index.ts`)
- Websocket server to manage user connections and game state relay (`src/core/GameServer.ts`)
- Custom physics system with classes to handle all game logic, entities, etc. (everything else in `src/core`). An amalgamation of data structures are manipulated every tick to keep track of the game state
- Geometry & collision system (`src/primitives/geometry`)
- Quadtree algorithm for space partitioning (`src/primitives/Quadtree.ts`) Had a lot of fun with this one!
- ArrayBuffer/packet constructor package (`src/primitives/SmartBuffer`) Credit to [Fohz67](https://github.com/fohz67)

A live demo can't be provided as our frontend (Angular + PixiJS) will likely remain private. I'm not really in control of that since I didn't build it. With that being said, the protocol is laid out in `src/models/Protocol.model.ts` and it's usage is documented well throughout with TSDoc, so it wouldn't be very difficult for someone to build a new frontend for it if they stumbled across this.

I'll lay this to rest some screen recordings from the development stages in no particular order:


https://github.com/user-attachments/assets/ca068fb5-d3b8-4303-9dca-bd8a5814d478



https://github.com/user-attachments/assets/6841bb9c-7e26-4cc0-8e18-5e6779364b52



https://github.com/user-attachments/assets/1ad68ec6-95dd-471c-bc00-88ca0d3fdfce

