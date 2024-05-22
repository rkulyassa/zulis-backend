import { App, TemplatedApp, WebSocket } from 'uWebSockets.js';
import { World } from './services/World';
import { WorldSettings } from '../types/WorldSettings';
import { UserData } from "../types/UserData";
import { Vector2 } from '../primitives/geometry/Vector2';
import { Controller } from './Controller';
import { Rectangle } from '../primitives/geometry/Rectangle';
import { ServerOpcodes } from '../types/Protocol';

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

    onConnection(ws: WebSocket<UserData>): void {
        const pid = this.pidIndex;
        this.pidIndex += 1;
        ws.getUserData().pid = pid;

        this.world.spawnCell(pid);
        const controller = new Controller(pid, ws);
        this.world.addController(controller);
        controller.sendWS([ServerOpcodes.LOAD_WORLD, this.world.getSetting('WORLD_SIZE')]);

        console.log(`Player joined (pid: ${pid})`);
    }

    onMessage(client: WebSocket<UserData>, message: ArrayBuffer, isBinary: boolean): void {
        const controller = this.world.getControllerByPid(client.getUserData().pid);
        const [opcode, data] = JSON.parse(decoder.decode(message));
        this.world.handleMessage(controller, opcode, data);
    }

    onClose(ws: WebSocket<UserData>, code: number, message: ArrayBuffer) {
        const pid = ws.getUserData().pid;
        this.world.disconnectCells(pid);
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
            this.world.tick();

            for (const controller of this.world.getControllers()) {
                const pid = controller.getPid();
                const input = controller.getInput();

                let viewport;
                if (input.playing) {
                    const threshold = 500;
                    viewport = new Rectangle(this.world.getPlayerCenterOfMass(pid), threshold, threshold);
                } else {
                    const size = this.world.getSetting("WORLD_SIZE");
                    viewport = new Rectangle(new Vector2(size/2), size, size);
                }

                const cells = this.world.getCellsPacket(pid, viewport);

                const data = [ServerOpcodes.UPDATE_GAME_STATE, [viewport.getCenter().getX(), viewport.getCenter().getY(), cells, this.world.getQuadtree()]];//this.world.getQuadtree().getBranchBoundaries()]];
                controller.sendWS(data);
            }
        }, 1000/this.tps);
    }

    end(): void {
        this.uWSApp.close();
        clearInterval(this.liveUpdate);
    }
}