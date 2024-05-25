import { App, TemplatedApp, WebSocket } from 'uWebSockets.js';
import { World } from './services/World';
import { WorldSettings } from '../types/WorldSettings';
import { UserData } from "../types/UserData";
import { Vector2 } from '../primitives/geometry/Vector2';
import { Rectangle } from '../primitives/geometry/Rectangle';
import { Square } from '../primitives/geometry/Square';
import { PlayerCell } from './cells/PlayerCell';
import { Pellet } from './cells/Pellet';
import { EjectedCell } from './cells/EjectedCell';
import { Virus } from './cells/Virus';
import { DeadCell } from './cells/DeadCell';
import { CellTypes } from '../types/Enums';
import { Controller } from './Controller';
import * as Protocol from '../types/Protocol';
import * as Physics from './services/Physics';

const decoder = new TextDecoder();

export class GameServer {
    private uWSApp: TemplatedApp;
    private port: number;
    private name: string;
    private region: string;
    private tps: number;
    private capacity: number;
    private pidIndex: number;
    private world: World;
    private liveUpdate: ReturnType<typeof setInterval>;

    constructor(port: number, name: string, region: string, tps: number, capacity: number, worldSettings: WorldSettings) {
        this.uWSApp = App();
        this.port = port;
        this.name = name;
        this.region = region;
        this.tps = tps;
        this.capacity = capacity;
        this.pidIndex = 0;
        this.world = new World(worldSettings, this.tps);
    }

    getPort(): number {
        return this.port;
    }

    getName(): string {
        return this.name;
    }

    getRegion(): string {
        return this.region;
    }

    getCapacity(): number {
        return this.capacity;
    }

    getNumberOfPlayers(): number {
        return this.world.getControllers().length;
    }

    getCellsPacket(pid: number, viewport: Rectangle): Object {
        const data = [];
        let totalMass = 0;
        for (const cell of this.world.getQuadtree().query(viewport)) {
            let cellType;
            if (cell instanceof Pellet) {
                cellType = CellTypes.PELLET;
            } else if (cell instanceof PlayerCell) {
                // TODO: remove distinction? shouldn't matter on client
                if (pid === cell.getOwnerPid()) {
                    cellType = CellTypes.OWNED_CELL;
                    totalMass += cell.getMass();
                } else {
                    cellType = CellTypes.OTHER_CELL;
                }
            } else if (cell instanceof EjectedCell) {
                cellType = CellTypes.EJECTED_CELL;
            } else if (cell instanceof Virus) {
                cellType = CellTypes.VIRUS;
            } else if (cell instanceof DeadCell) {
                cellType = CellTypes.DEAD_CELL;
            }

            data.push([
                cell.getId(),
                cellType,
                cell.getPosition().getX(),
                cell.getPosition().getY(),
                cell.getRadius()
            ]);
        }
        return data;
    }

    onConnection(ws: WebSocket<UserData>): void {
        const pid = this.pidIndex;
        this.pidIndex += 1;
        ws.getUserData().pid = pid;

        this.world.spawnPlayerCell(pid);
        const controller = new Controller(pid, ws);
        this.world.addController(controller);
        controller.sendWS([Protocol.ServerOpcodes.LOAD_WORLD, this.world.getSetting('WORLD_SIZE')]);

        console.log(`Player joined (pid: ${pid})`);
    }

    onMessage(client: WebSocket<UserData>, message: ArrayBuffer, isBinary: boolean): void {
        const controller = this.world.getControllerByPid(client.getUserData().pid);
        const [opcode, data] = JSON.parse(decoder.decode(message));
        switch (opcode) {
            case Protocol.ClientOpcodes.MOUSE_MOVE:
                controller.setInput('mouseVector', new Vector2(data[0], data[1]));
                break;
            case Protocol.ClientOpcodes.TOGGLE_FEED:
                controller.setInput('isEjecting', data);
                break;
            case Protocol.ClientOpcodes.SPLIT:
                // if (this.world.getPlayerCellsByPid(controller.getPid()).length >= this.settings.MAX_CELLS) return;
                controller.setInput('toSplit', data);
                break;
        }
    }

    onClose(ws: WebSocket<UserData>, code: number, message: ArrayBuffer) {
        const pid = ws.getUserData().pid;
        this.world.disconnectPlayerCellsByPid(pid);
        this.world.removeControllerByPid(pid);
        console.log(`Player left (pid: ${pid})`);
    }

    start(): void {
        this.uWSApp.ws('/*', {
            open: this.onConnection.bind(this),
            message: this.onMessage.bind(this),
            close: this.onClose.bind(this)
        }).listen(this.port, (promise) => {
            if (promise) {
                console.log(`WebSocket listening on port ${this.port} for gamemode "${this.name}"`);
            } else {
                console.log(`Failed to listen to port ${this.port}`);
            }
        });

        this.liveUpdate = setInterval(() => {
            this.world.tick(this.tps);

            for (const controller of this.world.getControllers()) {
                const pid = controller.getPid();
                const input = controller.getInput();

                let viewport;
                if (input.playing) {
                    const threshold = 500;
                    const playerCells = this.world.getPlayerCellsByPid(pid);
                    viewport = new Square(Physics.getCellsCenterOfMass(playerCells), threshold);
                } else {
                    const size = this.world.getSetting("WORLD_SIZE");
                    viewport = new Square(new Vector2(size/2), size);
                }

                const cells = this.getCellsPacket(pid, viewport);

                const data = [Protocol.ServerOpcodes.UPDATE_GAME_STATE, [viewport.getCenter().getX(), viewport.getCenter().getY(), cells, this.world.getQuadtree()]];//this.world.getQuadtree().getBranchBoundaries()]];
                controller.sendWS(data);
            }
        }, 1000/this.tps);
    }

    end(): void {
        this.uWSApp.close();
        clearInterval(this.liveUpdate);
    }
}