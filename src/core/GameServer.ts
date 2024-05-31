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

    /**
     * Gets a client-specific array representation of all the {@link Cell}s within a given {@link viewport}. The data's structure is defined as per {@link Protocol.ServerOpcodes.UPDATE_GAME_STATE}.
     * @param pid - The pid of the {@link Controller} that is querying. Used to determine whether a {@link Cell} is owned by the player or not.
     * @param viewport - The viewport threshold to limit the amount of cells sent to the client around their respective area.
     * @returns An {@link Array} containing the cell information.
     * @todo Define, with an interface, the data being passed.
     */
    getCellsPacket(pid: number, viewport: Rectangle): Object {
        const data = [];
        let totalMass = 0;
        for (const cell of this.world.getQuadtree().query(viewport)) {
            let cellType;
            let ownerPid;
            if (cell instanceof Pellet) {
                cellType = CellTypes.PELLET;
            } else if (cell instanceof PlayerCell) {
                // @todo remove distinction? shouldn't matter on client?
                if (pid === cell.getOwnerPid()) {
                    cellType = CellTypes.OWNED_CELL;
                    totalMass += cell.getMass();
                } else {
                    cellType = CellTypes.OTHER_CELL;
                }
                ownerPid = cell.getOwnerPid();
            } else if (cell instanceof EjectedCell) {
                cellType = CellTypes.EJECTED_CELL;
            } else if (cell instanceof Virus) {
                cellType = CellTypes.VIRUS;
            } else if (cell instanceof DeadCell) {
                cellType = CellTypes.DEAD_CELL;
            }

            data.push([
                cell.getId(),
                ownerPid,
                cellType,
                cell.getPosition().getX(),
                cell.getPosition().getY(),
                cell.getRadius()
            ]);
        }
        return data;
    }

    /**
     * Handles a new incoming connection.
     * @param ws - The incoming connection.
     */
    onConnection(ws: WebSocket<UserData>): void {
        const pid = this.pidIndex;
        this.pidIndex += 1;
        ws.getUserData().pid = pid;

        this.world.spawnPlayerCell(pid);
        const newController = new Controller(pid, ws);
        this.world.addController(newController);
        newController.sendWS([Protocol.ServerOpcodes.LOAD_WORLD, this.world.getSetting('WORLD_SIZE')]);

        for (const controller of this.world.getControllers()) {
            if (controller === newController) continue;
            const nick = controller.getNick();
            const skinId = controller.getSkinId();
            const inTag = newController.getTeamTag() === controller.getTeamTag();
            controller.sendWS([Protocol.ServerOpcodes.PLAYER_UPDATE, [pid, skinId, nick, inTag]]);
        }

        console.log(`Player joined (pid: ${pid})`);
    }

    /**
     * Handles an incoming message.
     * @param client - The respective connection of the message.
     * @param message - The data of the message.
     * @param isBinary
     */
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
                controller.setInput('toSplit', data);
                break;
        }
    }

    /**
     * Handles a disconnection.
     * @param ws - The disconnecting connection.
     * @param code
     * @param message 
     */
    onClose(ws: WebSocket<UserData>, code: number, message: ArrayBuffer) {
        const pid = ws.getUserData().pid;
        this.world.disconnectPlayerCellsByPid(pid);
        this.world.removeControllerByPid(pid);
        console.log(`Player left (pid: ${pid})`);
    }

    /**
     * Starts the WebSocket server.
     */
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

                let viewport;
                const status = controller.getStatus();

                if (status === 'menu') {
                    const size = this.world.getSetting("WORLD_SIZE");
                    viewport = new Square(new Vector2(size/2), size);
                } else if (status === 'playing') {
                    const threshold = 500;
                    const playerCells = this.world.getPlayerCellsByPid(pid);
                    viewport = new Square(Physics.getCellsCenterOfMass(playerCells), threshold);
                } else if (status === 'spectating') {
                    // @todo
                }

                const cells = this.getCellsPacket(pid, viewport);

                const data = [Protocol.ServerOpcodes.UPDATE_GAME_STATE, [viewport.getCenter().getX(), viewport.getCenter().getY(), cells, this.world.getQuadtree()]];//this.world.getQuadtree().getBranchBoundaries()]];
                controller.sendWS(data);
            }
        }, 1000/this.tps);
    }

    /**
     * Ends the WebSocket server.
     */
    end(): void {
        this.uWSApp.close();
        clearInterval(this.liveUpdate);
    }
}