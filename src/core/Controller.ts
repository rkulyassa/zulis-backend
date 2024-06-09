import { Vector2 } from '../primitives/geometry/Vector2';
import { WebSocket } from 'uWebSockets.js';
import { WebSocketData } from '../types/WebSocketData';

export class Controller {
    private readonly pid: number;
    private readonly ws: WebSocket<WebSocketData>;
    private playing: boolean;
    private nick: string;
    private skinId: string;
    private teamTag: string;
    private mouseVector: Vector2;
    private ejecting: boolean;
    private toSplit: number;
    private ejectTick: number;
    
    constructor(pid: number, ws: WebSocket<WebSocketData>) {
        this.pid = pid;
        this.ws = ws;
        this.nick = `An unnamed cell`;
        this.skinId = 'zulis1';
        this.teamTag = '';
        this.playing = false;
        this.mouseVector = new Vector2(0);
        this.ejecting = false;
        this.ejectTick = 0;
    }

    getPid(): number {
        return this.pid;
    }

    getNick(): string {
        return this.nick;
    }
    setNick(nick: string): void {
        this.nick = nick;
    }

    getSkinId(): string {
        return this.skinId;
    }
    setSkinId(skinId: string): void {
        this.skinId = skinId;
    }

    getTeamTag(): string {
        return this.teamTag;
    }
    setTeamTag(teamTag: string): void {
        this.teamTag = teamTag;
    }

    isPlaying(): boolean {
        return this.playing;
    }
    setAsPlaying(playing: boolean): void {
        this.playing = playing;
    }

    getMouseVector(): Vector2 {
        return this.mouseVector;
    }
    setMouseVectorFromValues(dx: number, dy: number): void {
        this.mouseVector.set(dx, dy);
    }

    isEjecting(): boolean {
        return this.ejecting;
    }
    setAsEjecting(ejecting: boolean): void {
        this.ejecting = ejecting;
    }

    getToSplit(): number {
        return this.toSplit;
    }
    setToSplit(toSplit: number) {
        this.toSplit = toSplit;
    }

    getEjectTick(): number {
        return this.ejectTick;
    }
    setEjectTick(ejectTick: number): void {
        this.ejectTick = ejectTick;
    }

    sendWS(data: ArrayBuffer): void {
        this.ws.send(data, true);
        // @todo: attempt compression
        // this.ws.send(data, true, true);
    }
}