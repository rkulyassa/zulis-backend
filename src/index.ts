import express from 'express';
import fs from 'fs';
import path from 'path';
import { GameServer } from './core/GameServer';
import Gamemodes from './GameModes.json';

const PORT: number = 9000;
const app: express.Application = express();
const gameServers: Array<GameServer> = [
    new GameServer(PORT+1, 'Mega 1', 'na', 20, 50, Gamemodes.Mega),
    // new GameServer(PORT+2, 'Giga 1', 'eu', 20, 35, Gamemodes.Mega),
];
for (const gameServer of gameServers) gameServer.start();

app.get('/gameservers.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const data = {
        "na": {},
        "eu": {},
        "as": {}
    }
    for (const gameServer of gameServers) {
        data[gameServer.getRegion()][gameServer.getName()] = {
            "players": gameServer.getNumberOfPlayers(),
            "slots": gameServer.getCapacity(),
            "url": `ws://localhost:${gameServer.getPort()}`
        };
    }
    res.send(data);
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
})