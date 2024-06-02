import { Vector2 } from "../primitives/geometry/Vector2";
import { Input } from "../types/Input";
import { WebSocket } from 'uWebSockets.js';
import { UserData } from "../types/UserData";

const encoder = new TextEncoder();

export declare type Status = 'menu'|'playing'|'spectating';

export class Controller {
    private pid: number;
    private ws: WebSocket<UserData>;
    private status: Status;
    private nick: string;
    private skinId: string;
    private teamTag: string;
    private input: Input;
    private ejectTick: number;
    
    constructor(pid: number, ws: WebSocket<UserData>) {
        this.pid = pid;
        this.ws = ws;
        this.nick = `Player ${pid}`;
        this.skinId = 'abcdefgh';
        this.teamTag = '';
        this.status = 'menu';
        this.input = {
            mouseVector: new Vector2(0),
            isEjecting: false,
            toSplit: 0
        };
        this.ejectTick = 0;
    }

    getPid(): number {
        return this.pid;
    }

    getStatus(): Status {
        return this.status;
    }
    setStatus(status: Status): void {
        this.status = status;
    }

    getNick(): string {
        return this.nick;
    }

    getSkinId(): string {
        return this.skinId;
    }

    getTeamTag(): string {
        return this.teamTag;
    }

    getInput(): Input {
        return {
            mouseVector: this.input.mouseVector,
            isEjecting: this.input.isEjecting,
            toSplit: this.input.toSplit
        }
    }
    setInput<K extends keyof Input>(input: K, value: Input[K]) {
        this.input[input] = value;
    }

    getEjectTick(): number {
        return this.ejectTick;
    }
    setEjectTick(ejectTick: number): void {
        this.ejectTick = ejectTick;
    }

    sendWS(data: Object): void {
        const packet = encoder.encode(JSON.stringify(data));
        this.ws.send(packet);
    }
}