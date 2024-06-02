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
import { Controller, Status } from './Controller';
import * as Protocol from '../types/Protocol.d';
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
     * Gets an array representation of all {@link Cell}s within a given {@link Rectangle}. The data's structure is defined as per {@link Protocol.CellData}.
     * @param pid - The pid of the {@link Controller} that is querying. Used to determine whether a {@link Cell} is owned by the player or not.
     * @param viewport - The viewport threshold to limit the amount of cells sent to the client around their respective area.
     * @returns An {@link Array<CellData>} containing the found cells.
     */
    getCellsPacket(viewport: Rectangle): Array<Protocol.CellData> {
        const data = [];

        for (const cell of this.world.getQuadtree().query(viewport)) {

            const cellData: Protocol.CellData = [
                cell.getId(),
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
    onConnection(ws: WebSocket<UserData>): void {
        const pid = this.pidIndex;
        this.pidIndex += 1;
        ws.getUserData().pid = pid;

        const newController = new Controller(pid, ws);
        this.world.addController(newController);

        const data: Protocol.ServerData.LOAD_WORLD = this.world.getSetting('WORLD_SIZE');
        newController.sendWS([Protocol.ServerOpcodes.LOAD_WORLD, data]);

        for (const controller of this.world.getControllers()) {
            if (controller === newController) continue;
            const nick = controller.getNick();
            const skinId = controller.getSkinId();
            const inTag = newController.getTeamTag() === controller.getTeamTag();
            const data: Protocol.ServerData.PLAYER_UPDATE = [pid, skinId, nick, inTag];
            controller.sendWS([Protocol.ServerOpcodes.PLAYER_UPDATE, data]);
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
        const pid: number = client.getUserData().pid;
        const controller: Controller = this.world.getControllerByPid(pid);
        const [opcode, data]: [number, any] = JSON.parse(decoder.decode(message));
        switch (opcode) {
            case Protocol.ClientOpcodes.SPAWN:
                if (controller.getStatus() !== 'playing') {
                    controller.setStatus('playing');
                    this.world.spawnPlayerCell(pid);
                }
                break;
            case Protocol.ClientOpcodes.SPECTATE:
                if (controller.getStatus() === 'playing') return;
                const [spectateLock, cellId]: Protocol.ClientData.SPECTATE = data;
                controller.setStatus('spectating');
                // @todo finish spectate mode - set data on controller
                break;
            case Protocol.ClientOpcodes.MOUSE_MOVE:
                const [dx, dy]: Protocol.ClientData.MOUSE_MOVE = data;
                controller.setInput('mouseVector', new Vector2(dx, dy));
                break;
            case Protocol.ClientOpcodes.TOGGLE_FEED:
                const isFeeding: Protocol.ClientData.TOGGLE_FEED = data;
                controller.setInput('isEjecting', isFeeding);
                break;
            case Protocol.ClientOpcodes.SPLIT:
                const macro: Protocol.ClientData.SPLIT = data;
                controller.setInput('toSplit', data);
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
    onClose(ws: WebSocket<UserData>, code: number, message: ArrayBuffer) {
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
                const status: Status = controller.getStatus();

                if (status === 'menu') {
                    const size: number = this.world.getSetting("WORLD_SIZE");
                    viewport = new Square(new Vector2(size/2), size);
                } else if (status === 'playing') {
                    const threshold: number = 500; // @todo: move this into settings somewhere
                    const playerCells: Array<PlayerCell> = this.world.getPlayerCellsByPid(pid);
                    viewport = new Square(Physics.getCellsCenterOfMass(playerCells), threshold);
                } else if (status === 'spectating') {
                    // @todo get spectate data from controller and query respective viewport
                }

                const data: Protocol.ServerData.UPDATE_GAME_STATE = [
                    viewport.getCenter().getX(),
                    viewport.getCenter().getY(),
                    this.world.getTotalMassByPid(pid),
                    0, // @todo: calculate ping per client
                    this.getCellsPacket(viewport),
                ];
                controller.sendWS([Protocol.ServerOpcodes.UPDATE_GAME_STATE, data]);
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