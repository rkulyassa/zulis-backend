import { CellType } from "../../models/CellType.enum";

export class PidManager {
    private readonly reservedPids: Array<CellType>;
    private readonly capacity: number;
    private readonly pids: Uint8Array;

    constructor(capacity: number) {
        // reserve pids 0-3 for non-playerCells
        this.reservedPids = [
            CellType.PELLET,
            CellType.EJECTED_CELL,
            CellType.VIRUS,
            CellType.DEAD_CELL
        ];
        this.capacity = capacity;
        this.pids = new Uint8Array(capacity);
    }
  
    /**
     * Gets the lowest unused pid and sets it as used.
     * @returns The lowest unused pid.
     */
    getAvailablePid(): number {
        const offset = this.reservedPids.length;
        for (let i = offset; i < this.capacity; i++) {
            if (this.pids[i] === 0) {
                this.pids[i] = 1;
                return i;
            }
        }
    }

    /**
     * Gets the pids that are in use.
     * @returns An array of the used pids.
     */
    getUsedPids(): Array<number> {
        const usedPids = [];
        const offset = this.reservedPids.length;
        for (let i = offset; i < this.capacity; i++) {
            if (this.pids[i] === 1) {
                usedPids.push(i);
            }
        }
        return usedPids;
    }
  
    /**
     * Sets a pid as unused.
     * @param pid - The pid to release.
     */
    releasePid(pid: number) {
        const offset = this.reservedPids.length;
        this.pids[pid - offset] = 0;
    }

    getReservedPid(cellTypeEnum: CellType): number {
        return this.reservedPids.indexOf(cellTypeEnum);
    }
}