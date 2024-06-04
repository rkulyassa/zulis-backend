import { App, TemplatedApp, WebSocket } from 'uWebSockets.js';
import { World } from './services/World';
import { WorldSettings } from '../types/WorldSettings';
import { WebSocketData } from '../types/WebSocketData';
import { Vector2 } from '../primitives/geometry/Vector2';
import { Rectangle } from '../primitives/geometry/Rectangle';
import { Square } from '../primitives/geometry/Square';
import { PlayerCell } from './cells/PlayerCell';
import { Controller } from './Controller';
import * as Protocol from '../types/Protocol.d';
import * as Physics from './services/Physics';

const decoder = new TextDecoder();

export class GameServer {
    private uWSApp: TemplatedApp;
    private port: number;
    private age: number;
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
        this.age = 0;
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
     * Gets an array representation of all {@link Cell}s within a given {@link Rectangle}. The data's structure is defined as per {@link Protocol.CellData}.
     * @param pid - The pid of the {@link Controller} that is querying. Used to determine whether a {@link Cell} is owned by the player or not.
     * @param viewport - The viewport threshold to limit the amount of cells sent to the client around their respective area.
     * @returns An {@link Array<CellData>} containing the found cells.
     */
    getCellsPacket(viewport: Rectangle): Array<Protocol.CellData> {
        const data = [];

        for (const cell of this.world.getQuadtree().query(viewport)) {
            const ownerPid: number = cell instanceof PlayerCell ? cell.getOwnerPid() : null;
            const cellData: Protocol.CellData = [
                cell.getId(),
                ownerPid,
                cell.getTypeEnum(),
                cell.getPosition().getX(),
                cell.getPosition().getY(),
                cell.getRadius()
            ];

            data.push(cellData);
        }
        return data;
    }

    /**
     * Handles a new incoming connection.
     * @param ws - The incoming connection.
     */
    onConnection(ws: WebSocket<WebSocketData>): void {
        const pid = this.pidIndex;
        this.pidIndex += 1;
        ws.getUserData().pid = pid;

        const newController = new Controller(pid, ws);
        this.world.addController(newController);

        const data: Protocol.ServerData.LOAD_WORLD = this.world.getSetting('WORLD_SIZE');
        newController.sendWS([Protocol.ServerOpcodes.LOAD_WORLD, data]);

        console.log(`Player joined (pid: ${pid})`);
    }

    /**
     * Handles an incoming message.
     * @param client - The respective connection of the message.
     * @param message - The data of the message.
     * @param isBinary
     */
    onMessage(client: WebSocket<WebSocketData>, message: ArrayBuffer, isBinary: boolean): void {
        const pid: number = client.getUserData().pid;
        const controller: Controller = this.world.getControllerByPid(pid);
        const [opcode, data]: [number, any] = JSON.parse(decoder.decode(message));
        switch (opcode) {
            case Protocol.ClientOpcodes.PLAYER_UPDATE:
                const [nick, skinId, teamTag]: Protocol.ClientData.PLAYER_UPDATE = data;
                controller.setNick(nick);
                controller.setSkinId(skinId);
                controller.setTeamTag(teamTag);

                // replicate playerData update to rest of clients
                for (const other of this.world.getControllers()) {
                    const inTag: boolean = teamTag === other.getTeamTag();
                    const replicatedData: Protocol.ServerData.PLAYER_UPDATE = [pid, nick, skinId, inTag];
                    other.sendWS([Protocol.ServerOpcodes.PLAYER_UPDATE, replicatedData]);
                }

                if (!controller.isPlaying()) {
                    controller.setAsPlaying(true);
                    this.world.spawnPlayerCell(pid);
                }
                break;
            case Protocol.ClientOpcodes.SPECTATE:
                if (controller.isPlaying()) return;
                const [spectateLock, cellId]: Protocol.ClientData.SPECTATE = data;
                // @todo finish spectate mode - set data on controller
                break;
            case Protocol.ClientOpcodes.MOUSE_MOVE:
                const [dx, dy]: Protocol.ClientData.MOUSE_MOVE = data;
                controller.setMouseVectorFromValues(dx, dy);
                break;
            case Protocol.ClientOpcodes.TOGGLE_FEED:
                const isFeeding: Protocol.ClientData.TOGGLE_FEED = data;
                controller.setAsEjecting(isFeeding);
                break;
            case Protocol.ClientOpcodes.SPLIT:
                const macro: Protocol.ClientData.SPLIT = data;
                controller.setToSplit(macro+1);
                break;
            case Protocol.ClientOpcodes.STOP_MOVEMENT:
                break;
            case Protocol.ClientOpcodes.FREEZE_MOUSE:
                break;
            case Protocol.ClientOpcodes.LOCK_LINESPLIT:
                break;
            case Protocol.ClientOpcodes.SAVE_REPLAY:
                break;
            default:
                console.log(`Client (pid: ${pid}) called non-existent opcode ${opcode} with data: ${data}`);
                break;
        }
    }

    /**
     * Handles a disconnection.
     * @param ws - The disconnecting connection.
     * @param code
     * @param message 
     */
    onClose(ws: WebSocket<WebSocketData>, code: number, message: ArrayBuffer) {
        const pid: number = ws.getUserData().pid;
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
                const pid: number = controller.getPid();

                let viewport: Square;
                const playerCells: Array<PlayerCell> = this.world.getPlayerCellsByPid(pid);
                if (controller.isPlaying()) {
                    const threshold: number = 1000; // @todo: move this into settings somewhere
                    viewport = new Square(Physics.getCellsCenterOfMass(playerCells), threshold);
                } else {
                    // @todo get spectate data from controller and query respective viewport
                    const size: number = this.world.getSetting('WORLD_SIZE');
                    viewport = new Square(new Vector2(size/2), size);
                }

                const [viewportX, viewportY]: [number, number] = viewport.getCenter().toArray();
                const cells: Array<Protocol.CellData> = this.getCellsPacket(viewport);
                const data: Protocol.ServerData.UPDATE_GAME_STATE = [viewportX, viewportY, cells];
                controller.sendWS([Protocol.ServerOpcodes.UPDATE_GAME_STATE, data]);

                this.age += 1000/this.tps;
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