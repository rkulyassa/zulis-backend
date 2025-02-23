import express from 'express';
import fs from 'fs';
import path from 'path';
import { GameServer } from './core/GameServer';
import Gamemodes from './GameModes.json';

const PORT: number = 9000;
const app: express.Application = express();
const gameServers: Array<GameServer> = [
    new GameServer(PORT, 'Mega 1', 'EU', 60, 50, Gamemodes.Mega),
    new GameServer(PORT, 'Mega 2', 'EU', 20, 45, Gamemodes.Mega),
    new GameServer(PORT, 'Mega 3', 'EU', 20, 35, Gamemodes.Mega),
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

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
});