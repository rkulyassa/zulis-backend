export function msToTicks(ms: number, tps: number): number {
    return ms / 1000 / tps;
}

export function ticksToMs(ticks: number, tps: number): number {
    return ticks * 1000 / tps;
}

export function randomInt(max: number): number {
    return Math.floor(Math.random() * (max + 1));
}

export function randomIntFromInterval(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

export function randomFromInterval(min: number, max: number): number {
    return Math.random() * (max - min) + min;
}

export function q_rsqrt(number) {
    const buffer = new ArrayBuffer(4);
    const f32 = new Float32Array(buffer);
    const ui32 = new Uint32Array(buffer);
    f32[0] = number;
    ui32[0] = 0x5F3759DF - (ui32[0] >> 1);
    const x = f32[0];
    return x * (1.5 - 0.5 * x * x * number);
}