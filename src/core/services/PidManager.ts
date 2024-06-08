export class PidManager {
    private capacity: number;
    private pids: Uint8Array;

    constructor(capacity: number) {
        this.capacity = capacity;
        this.pids = new Uint8Array(capacity);
    }
  
    /**
     * Gets the lowest unused pid and sets as used.
     * @returns The lowest unused pid.
     */
    getAvailablePid(): number {
        for (let i = 0; i < this.capacity; i++) {
            if (this.pids[i] === 0) {
                this.pids[i] = 1;
                return i;
            }
        }
    }
  
    /**
     * Sets a pid as unused
     * @param pid The pid to release
     */
    releasePid(pid: number) {
        this.pids[pid] = 0;
    }
}