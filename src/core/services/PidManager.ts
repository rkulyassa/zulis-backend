import { CellType } from "../../models/CellType.enum";

export class PidManager {
    private reservedPids: Array<CellType>;
    private capacity: number;
    private pids: Uint8Array;

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
        for (let i = 0; i < this.capacity; i++) {
            if (this.pids[i] === 0) {
                this.pids[i] = 1;
                return i + offset;
            }
        }
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