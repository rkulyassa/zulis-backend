import * as uWS from 'uWebSockets.js';
import { World } from './World';
import { WorldSettings } from '../types/WorldSettings';
import { WebSocketData } from '../types/WebSocketData';
import { Vector2 } from '../primitives/geometry/Vector2';
import { Rectangle } from '../primitives/geometry/Rectangle';
import { Square } from '../primitives/geometry/Square';
import { PlayerCell } from './cells/PlayerCell';
import { Controller } from './Controller';
import { Region } from '../types/Region.enum';
import { SmartBuffer } from '../primitives/SmartBuffer/SmartBuffer';
import { PidManager } from './services/PidManager';
import * as Protocol from '../types/Protocol.d';
import * as Physics from './services/Physics';

const decoder = new TextDecoder();
let smartBuffer = new SmartBuffer();

export class GameServer {
    private static portOffset: number = 1;
    private readonly uWSApp: uWS.TemplatedApp;
    private readonly port: number;
    private age: number;
    private readonly name: string;
    private readonly region: Region;
    private readonly tps: number;
    private readonly capacity: number;
    private readonly pidManager: PidManager;
    private readonly world: World;
    private liveUpdate: ReturnType<typeof setInterval>;

    constructor(basePort: number, name: string, region: Region, tps: number, capacity: number, worldSettings: WorldSettings) {
        this.uWSApp = uWS.App();
        this.port = basePort + GameServer.portOffset++;
        this.age = 0;
        this.name = name;
        this.region = region;
        this.tps = tps;
        this.capacity = capacity;
        this.pidManager = new PidManager(capacity);
        this.world = new World(worldSettings, this.tps);
    }

    getPort(): number {
        return this.port;
    }

    getName(): string {
        return this.name;
    }

    getRegion(): Region {
        return this.region;
    }
    getRegionAsString(): string {
        switch (this.region) {
            case Region.NA:
                return 'na';
            case Region.EU:
                return 'eu';
            case Region.AS:
                return 'as';
        }
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
    getCellsData(viewport: Rectangle): Array<Protocol.CellData> {
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
    onConnection(ws: uWS.WebSocket<WebSocketData>): void {
        const pid = this.pidManager.getAvailablePid();
        ws.getUserData().pid = pid;

        const newController = new Controller(pid, ws);
        this.world.addController(newController);

        smartBuffer = new SmartBuffer(3);
        smartBuffer.writeUInt8(Protocol.ServerOpcodes.LOAD_WORLD);
        smartBuffer.writeUInt16(this.world.getSetting('WORLD_SIZE'));
        smartBuffer.setOffset(0);
        newController.sendWS(smartBuffer.getView().buffer);

        console.log(`Player joined (pid: ${pid})`);
    }

    /**
     * Handles an incoming message.
     * @param client - The respective connection of the message.
     * @param message - The data of the message.
     * @param isBinary
     */
    onMessage(client: uWS.WebSocket<WebSocketData>, message: ArrayBuffer, isBinary: boolean): void {
        const pid: number = client.getUserData().pid;
        const controller: Controller = this.world.getControllerByPid(pid);
        const data: SmartBuffer = SmartBuffer.fromBuffer(message);
        const opcode: number = data.readUInt8();

        switch (opcode) {
            case Protocol.ClientOpcodes.PLAYER_UPDATE:
                const [nick, skinId, teamTag]: Protocol.ClientData.PLAYER_UPDATE = [
                    data.readStringNT(),
                    data.readStringNT(),
                    data.readStringNT(),
                ];
                controller.setNick(nick);
                controller.setSkinId(skinId);
                controller.setTeamTag(teamTag);

                // replicate playerData update to rest of clients
                for (const other of this.world.getControllers()) {
                    smartBuffer = new SmartBuffer();
                    smartBuffer.writeUInt8(Protocol.ServerOpcodes.PLAYER_UPDATE);
                    smartBuffer.writeUInt8(pid);
                    smartBuffer.writeStringNT(nick);
                    smartBuffer.writeStringNT(skinId);
                    const inTag: boolean = teamTag === other.getTeamTag();
                    smartBuffer.writeUInt8(+ inTag);
                    other.sendWS(smartBuffer.getView().buffer);
                }

                if (!controller.isPlaying()) {
                    controller.setAsPlaying(true);
                    this.world.spawnPlayerCell(pid);
                }
                break;
            case Protocol.ClientOpcodes.SPECTATE:
                if (controller.isPlaying()) return;
                const [spectateLock, cellId]: Protocol.ClientData.SPECTATE = [
                    !!data.readUInt8(),
                    data.readUInt8()
                ];
                // @todo finish spectate mode - set data on controller
                break;
            case Protocol.ClientOpcodes.MOUSE_MOVE:
                const [dx, dy]: Protocol.ClientData.MOUSE_MOVE = [
                    data.readUInt8(),
                    data.readUInt8()
                ];
                controller.setMouseVectorFromValues(dx, dy);
                break;
            case Protocol.ClientOpcodes.TOGGLE_FEED:
                const isFeeding: Protocol.ClientData.TOGGLE_FEED = !!data.readUInt8();
                controller.setAsEjecting(isFeeding);
                break;
            case Protocol.ClientOpcodes.SPLIT:
                const macro: Protocol.ClientData.SPLIT = data.readUInt8();
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
    onClose(ws: uWS.WebSocket<WebSocketData>, code: number, message: ArrayBuffer) {
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
                console.log(`GameServer running on ws://localhost:${this.port} for gamemode "${this.name}" in region "${this.region}"`);
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

                smartBuffer = new SmartBuffer();
                smartBuffer.writeUInt8(Protocol.ServerOpcodes.UPDATE_GAME_STATE);
                const [viewportX, viewportY]: [number, number] = viewport.getCenter().toArray();
                smartBuffer.writeUInt16(viewportX);
                smartBuffer.writeUInt16(viewportY);
                const cellsData: Array<Protocol.CellData> = this.getCellsData(viewport);
                for (const cellData of cellsData) {
                    smartBuffer.writeUInt16(cellData[0]);
                    smartBuffer.writeUInt8(cellData[1]);
                    smartBuffer.writeUInt8(cellData[2]);
                    smartBuffer.writeUInt16(cellData[3]);
                    smartBuffer.writeUInt16(cellData[4]);
                    smartBuffer.writeUInt16(cellData[5]);
                }
                // smartBuffer.writeStringNT(JSON.stringify(cellsData));
                controller.sendWS(smartBuffer.getView().buffer);

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