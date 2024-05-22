import { Vector2 } from "../primitives/geometry/Vector2";
import { Input } from "../types/Input";
import { WebSocket } from 'uWebSockets.js';
import { UserData } from "../types/UserData";

const encoder = new TextEncoder();

export class Controller {
    private pid: number;
    private ws: WebSocket<UserData>;
    private input: Input;
    private ejectTick: number;
    
    constructor(pid: number, ws: WebSocket<UserData>) {
        this.pid = pid;
        this.ws = ws;
        this.input = {
            playing: true,
            mouseVector: new Vector2(0),
            isEjecting: false,
            toSplit: 0
        };
        this.ejectTick = 0;
    }

    getPid(): number {
        return this.pid;
    }

    setInput<K extends keyof Input>(input: K, value: Input[K]) {
        this.input[input] = value;
    }

    getInput(): Input {
        return {
            playing: this.input.playing,
            mouseVector: this.input.mouseVector,
            isEjecting: this.input.isEjecting,
            toSplit: this.input.toSplit
        }
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