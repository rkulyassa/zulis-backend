import { WorldSettings } from '../models/WorldSettings.model';
import { Cell } from './cells/Cell';
import { PlayerCell } from './cells/PlayerCell';
import { Pellet } from './cells/Pellet';
import { EjectedCell } from './cells/EjectedCell';
import { Virus } from './cells/Virus';
import { DeadCell } from './cells/DeadCell';
import { Vector2 } from '../primitives/geometry/Vector2';
import { Quadtree } from '../primitives/Quadtree';
import { Square } from '../primitives/geometry/Square';
import { areaToRadius, areIntersecting } from '../primitives/geometry/Utils';
import { randomInt, randomFromInterval } from '../primitives/Misc';
import { Controller } from './Controller';
import { WorldAction } from '../models/WorldAction.enum';
import * as Physics from './services/Physics';

export class World {
    private readonly settings: WorldSettings;
    private readonly tps: number;
    private cells: Array<Cell>;
    private readonly boundary: Square;
    private quadtree: Quadtree<Cell>;
    private actionQueue: Array<[WorldAction, Cell, any?]>;
    private controllers: Array<Controller>;

    constructor(settings: WorldSettings, tps: number) {
        this.settings = settings;
        this.tps = tps;
        this.cells = new Array<Cell>();
        const size = this.settings.WORLD_SIZE;
        this.boundary = new Square(new Vector2(size/2, size/2), size);
        this.quadtree = new Quadtree(this.boundary, 8, 24);
        this.actionQueue = new Array<[WorldAction, Cell, any?]>();
        this.controllers = new Array<Controller>();

        for (let i = 0; i < this.settings.PELLET_COUNT; i++) this.spawnPellet();
        for (let i = 0; i < this.settings.VIRUS_COUNT; i++) this.spawnVirus();
    }

    getSetting(setting: keyof WorldSettings): number {
        return this.settings[setting];
    }

    getControllers(): Array<Controller> {
        return this.controllers;
    }
    getControllerByPid(pid: number): Controller {
        return this.controllers.find(controller => controller.getPid() === pid);
    }
    addController(controller: Controller): void {
        this.controllers.push(controller);
    }
    removeControllerByPid(pid: number): void {
        this.controllers = this.controllers.filter(controller => controller.getPid() !== pid);
    }

    getQuadtree(): Quadtree<Cell> {
        return this.quadtree;
    }

    /**
     * Enqueues the creation of a {@link PlayerCell} in a random location.
     * @param pid - The pid of the {@link PlayerCell}'s owner.
     */
    spawnPlayerCell(pid: number): void {
        const radius = areaToRadius(this.settings.SPAWN_MASS);
        const position = new Vector2(randomInt(this.settings.WORLD_SIZE), randomInt(this.settings.WORLD_SIZE));
        const newCell = new PlayerCell(pid, radius, position, new Vector2(0));

        for (const cell of this.cells) {
            if (cell instanceof Virus && areIntersecting(newCell.getBoundary(), cell.getBoundary())) {
                this.spawnPlayerCell(pid);
                return;
            }
        }

        this.actionQueue.push([WorldAction.CREATE_CELL, newCell]);
    }

    /**
     * Enqueues the creation of a {@link Pellet} in a random location.
     */
    spawnPellet(): void {
        const radius = areaToRadius(this.settings.PELLET_MASS);
        const position = new Vector2(randomInt(this.settings.WORLD_SIZE), randomInt(this.settings.WORLD_SIZE));
        const pellet = new Pellet(radius, position);
        this.actionQueue.push([WorldAction.CREATE_CELL, pellet]);
    }

    /**
     * Enqueues the creation of a {@link Virus} in a random location.
     * TODO: prevent spawns ontop of players
     */
    spawnVirus(): void {
        const radius = areaToRadius(this.settings.VIRUS_MASS);
        const position = new Vector2(randomInt(this.settings.WORLD_SIZE), randomInt(this.settings.WORLD_SIZE));
        const virus = new Virus(radius, position);
        this.actionQueue.push([WorldAction.CREATE_CELL, virus]);
    }

    /**
     * Gets all {@link PlayerCell}s with specified owner {@link pid}.
     * @param pid - The owner pid to search for.
     * @returns An {@link Array<PlayerCell>} containing the respective {@link PlayerCell}s.
     */
    getPlayerCellsByPid(pid: number): Array<PlayerCell> {
        return this.cells.filter(cell => cell instanceof PlayerCell && cell.getOwnerPid() === pid) as Array<PlayerCell>;
    }

    /**
     * Disconnects all {@link PlayerCell}s with specified ownerPid.
     * Enqueues the deletion of the {@link PlayerCell}s and the creation of {@link DeadCell}s to replace them.
     * @param pid - The ownerPid to disconnect.
     */
    disconnectPlayerCellsByPid(pid: number): void {
        const playerCells = this.getPlayerCellsByPid(pid);
        for (const playerCell of playerCells) {
            this.actionQueue.push([WorldAction.DELETE_CELL, playerCell]);
            const deadCell = new DeadCell(playerCell.getRadius(), playerCell.getPosition(), playerCell.getVelocity());
            this.actionQueue.push([WorldAction.CREATE_CELL, deadCell]);
        }
    }

    /**
     * Splits a parent {@link PlayerCell} with boost in a specified {@link direction}.
     * Enqueues the creation of the new {@link PlayerCell} and update of the parent {@link PlayerCell}.
     * @param cell - The {@link PlayerCell} to be split.
     * @param direction - The {@link Vector2} direction to split the cell towards.
     */
    splitCell(cell: PlayerCell, direction: Vector2): void {
        const pid = cell.getOwnerPid();
        const radius = Math.sqrt((cell.getRadius() * cell.getRadius())/2);
        const position = cell.getPosition().getSum(direction);
        const boost = direction.getMultiple(this.settings.SPLIT_BOOST);
        const newCell = new PlayerCell(pid, radius, position, boost);
        this.actionQueue.push([WorldAction.CREATE_CELL, newCell]);
        this.actionQueue.push([WorldAction.UPDATE_CELL, cell, -newCell.getMass()]);
    }

    /**
     * Ejects an {@link EjectedCell} in a specified {@link direction}.
     * Enqueues the creation of the {@link EjectedCell} and update of the ejecting {@link PlayerCell}.
     * @param cell - The {@link PlayerCell} to eject from.
     * @param direction - The {@link Vector2} direction to eject towards.
     */
    ejectFromCell(cell: PlayerCell, direction: Vector2): void {
        const radius = areaToRadius(this.settings.EJECT_MASS);
        const position = cell.getPosition().getSum(direction.getMultiple(cell.getRadius()));
        const dispersion = randomFromInterval(-this.settings.EJECT_DISPERSION, this.settings.EJECT_DISPERSION);
        const boost = direction.getMultiple(this.settings.EJECT_BOOST).getRotated(dispersion);
        const ejectedCell = new EjectedCell(radius, position, boost, cell);
        this.actionQueue.push([WorldAction.CREATE_CELL, ejectedCell]);
        this.actionQueue.push([WorldAction.UPDATE_CELL, cell, -this.settings.EJECT_MASS])
    }

    /**
     * Pops a {@link PlayerCell}.
     * Enqueues the creation of the popped {@link PlayerCell}s and update of the popping {@link PlayerCell}.
     * @param cell The {@link PlayerCell} to pop.
     */
    popCell(cell: PlayerCell): void {
        const pid = cell.getOwnerPid();
        const cellCount = this.getPlayerCellsByPid(pid).length;
        const poppedCount = this.settings.MAX_CELLS - cellCount;
        if (poppedCount === 0) return;

        const radius = Math.sqrt((cell.getRadius() * cell.getRadius())/poppedCount);
        const position = cell.getPosition();

        let poppedMass = 0;

        for (let i = 0; i < poppedCount; i++) {
            const boostDirection = Vector2.fromAngle(randomFromInterval(0, 2*Math.PI));
            const boost = boostDirection.getMultiple(this.settings.POP_BOOST);
            const poppedCell = new PlayerCell(pid, radius, position.getSum(boostDirection.getNormal()), boost);
            poppedMass += poppedCell.getMass();
            this.actionQueue.push([WorldAction.CREATE_CELL, poppedCell]);
        }

        this.actionQueue.push([WorldAction.UPDATE_CELL, cell, -poppedMass]);
    }

    /**
     * Checks whether a {@link Cell} can eat another, and handles accordingly.
     * Checks two conditions for eating: overlap and size.
     * If successful, enqueues the eat action of the two {@link Cell}s.
     * @param predator - The larger {@link Cell} to eat the {@link prey}.
     * @param prey - The smaller {@link Cell} to be ate by the {@link predator}.
     * @returns Whether the eat was successful.
     */
    resolveEat(predator: Cell, prey: Cell): boolean {
        if (prey.getEater()) return false; // other cell has already been ate in the tick

        let overlapReq: boolean, sizeReq: boolean;

        // calculate overlap requirement
        const d = predator.getPosition().getDifference(prey.getPosition()).getMagnitude();
        const overlap = predator.getRadius() - prey.getRadius() * this.settings.WORLD_EAT_OVERLAP_REQ;
        overlapReq = d <= overlap;

        // calculcate size requirement
        if (predator instanceof PlayerCell && prey instanceof PlayerCell && predator.getOwnerPid() === prey.getOwnerPid()) {
            sizeReq = true; // ignore size requirement if cells are owned by the same player
        } else {
            sizeReq = predator.getMass() > prey.getMass() * this.settings.WORLD_EAT_SIZE_REQ;
        }

        if (!overlapReq || !sizeReq) return false; // both checks must pass

        while(predator.getEater() !== null) { // traverse linked list if predator was already ate in the tick
            predator = predator.getEater();
        }
        if (predator === prey) return false; // @todo: not sure why this is necessary since idk how predator would equal prey?

        this.actionQueue.push([WorldAction.EAT, predator, prey]);
        prey.setEater(predator);

        return true;
    }

    /**
     * Checks whether two {@link PlayerCell}s can merge.
     * @param a - The first {@link PlayerCell}.
     * @param b - The other {@link PlayerCell}.
     * @returns Whether the two {@link PlayerCells} can merge.
     */
    canMerge(a: PlayerCell, b: PlayerCell): boolean {
        const aTime = this.settings.MERGE_TIME + a.getBoundary().getArea() * this.settings.MERGE_TIME_SCALE;
        const bTime = this.settings.MERGE_TIME + b.getBoundary().getArea() * this.settings.MERGE_TIME_SCALE;
        return a.getAge() >= aTime && b.getAge() >= bTime;
    }

    tick(): void {
        // console.log(`\ntick ${Date.now()}\n`);
        // this.quadtree.print();

        while (this.actionQueue.length > 0) {
            const [action, cell, data] = this.actionQueue.shift();
            switch(action) {
                case WorldAction.CREATE_CELL:
                    this.cells.push(cell);
                    break;
                case WorldAction.DELETE_CELL:
                    this.cells.splice(this.cells.indexOf(cell), 1);
                    break;
                case WorldAction.UPDATE_CELL:
                    cell.setRadius(areaToRadius(cell.getMass() + data));
                    break;
                case WorldAction.EAT:
                    let [predator, prey] = [cell, data];
                    predator.setRadius(areaToRadius(predator.getMass() + prey.getMass()));
                    this.cells.splice(this.cells.indexOf(prey), 1);
                    break;
            }
        };
        this.actionQueue.length = 0;

        // handle all connected players' input
        for (const controller of this.controllers) {
            const pid = controller.getPid();
            const mouseVector = controller.getMouseVector();
            const playerCells = this.getPlayerCellsByPid(pid);
            // @todo: store viewport in controller so this doesn't have to be called multiple times
            const targetPoint = Physics.getCellsCenterOfMass(playerCells).getSum(mouseVector);

            for (const cell of playerCells) {

                // set velocity
                // const speed = this.settings.BASE_SPEED * (1/tps) * cell.getRadius() ** -0.4396754;
                // const speed = this.settings.BASE_SPEED * (1/this.tps) * cell.getRadius() ** -0.4396754;
                // const scaledMagnitude = Physics.mapVelocityToExponential(base, cell.getRadius(), 0.001, 0.1);

                // const speed = this.settings.BASE_SPEED * (1/this.tps) * 100/(Math.exp(cell.getRadius()*10));
                const speed = this.settings.BASE_SPEED * (1/this.tps) * Physics.velocityMap(cell.getRadius(), 0, 10000, 0.1, 0.2);
                
                let d = targetPoint.getDifference(cell.getPosition());
                let v = d.getMultiple(speed);
                // if (v.getMagnitude() > this.settings.SPEED_CAP) {
                //     v = v.getNormal().getMultiple(this.settings.SPEED_CAP);
                // }
                // if (d.getMagnitude() === 0) { // cursor in middle
                //     cell.setVelocity(new Vector2(0));
                // }
                cell.setVelocity(v);

                // } else {
                //     let v = d.getMultiple(speed);
                //     // if (v.getMagnitude() > this.settings.SPEED_CAP) {
                //     //     v = v.getNormal().getMultiple(this.settings.SPEED_CAP);
                //     // }
                //     cell.setVelocity(v);
                // }

                // handle ejecting
                if (controller.isEjecting()) {
                    let ejectDelayTick = controller.getEjectTick();
                    if (ejectDelayTick > 0) {
                        controller.setEjectTick(ejectDelayTick - 1000/this.tps);
                    } else {
                        if (d.getMagnitude() === 0) d = new Vector2(1,0); // cursor in middle, feed horizontally
                        if (cell.getMass() >= this.settings.MIN_MASS_TO_EJECT) {
                            this.ejectFromCell(cell, d.getNormal());
                        }
                        controller.setEjectTick(this.settings.EJECT_DELAY);
                    }
                }
            }

            // handle split cells
            let tempCellCount = playerCells.length;
            const toSplit = controller.getToSplit();
            if (toSplit > 0) {
                for (const cell of playerCells) {
                    if (cell.getMass() > this.settings.MIN_MASS_TO_SPLIT && tempCellCount < this.settings.MAX_CELLS) {
                        const splitDirection = targetPoint.getDifference(cell.getPosition()).getNormal();
                        this.splitCell(cell, splitDirection);
                        tempCellCount += 1;
                    }
                }
                controller.setToSplit(toSplit-1);
            }
        }

        // create quadtree
        this.quadtree = new Quadtree(this.boundary, 4, 16);

        for (const cell of this.cells) {
            // cells moved prior to insertion
            cell.stepMotion(this.settings.WORLD_FRICTION);
            cell.handleWallBounce(this.boundary);

            //insert cells
            this.quadtree.insert(cell);

            // tick each cell & update accordingly
            cell.tick(this.tps);
            if (cell instanceof EjectedCell) cell.checkIfExitedParent();
            if (cell instanceof PlayerCell) {
                if (cell.getAge() % this.settings.DECAY_RATE <= 500/this.tps) { // this is 500 instead of 1000 because otherwise it decays in 2 subsequent ticks
                    this.actionQueue.push([WorldAction.UPDATE_CELL, cell, -cell.getMass() * (1-this.settings.DECAY_SCALE)]);
                }
            }
            if (cell instanceof DeadCell && cell.getAge() > this.settings.DEAD_CELL_LIFETIME) {
                this.actionQueue.push([WorldAction.DELETE_CELL, cell]);
            }
            if (cell instanceof EjectedCell && cell.getAge() > this.settings.EJECT_LIFETIME) {
                this.actionQueue.push([WorldAction.DELETE_CELL, cell]);
            }
        }

        // resolve all collisions & game logic (handled in subsequent tick)
        for (const cell of this.cells) {
            const collisions = this.quadtree.query(cell.getBoundary());

            for (const other of collisions) {
                // if (this.cells.indexOf(other) === -1) continue;
                if (cell === other) continue;

                if (cell instanceof PlayerCell) {
                    if (other instanceof PlayerCell) {
                        if (cell.getOwnerPid() === other.getOwnerPid()) {
                            if (this.canMerge(cell, other)) {
                                this.resolveEat(cell, other);
                            } else if (cell.getAge() >= this.settings.SPLIT_RESOLVE_DELAY && other.getAge() >= this.settings.SPLIT_RESOLVE_DELAY) {
                                Physics.resolveCollision(cell, other);
                            }
                        } else {
                            this.resolveEat(cell, other);
                        }
                    }

                    if (other instanceof EjectedCell) {
                        if ((other.hasExitedParent() || other.getAge() > 0)) {
                            this.resolveEat(cell, other);
                            cell.getBoost().add(other.getBoost().getMultiple(this.settings.EJECT_PUSH_MULTIPLIER));
                        }
                    }

                    if (other instanceof Pellet) {
                        if (this.resolveEat(cell, other)) {
                            this.spawnPellet();
                        }
                    }

                    if (other instanceof DeadCell) {
                        this.resolveEat(cell, other);
                    }

                    if (other instanceof Virus) {
                        if (this.resolveEat(cell, other)) {
                            this.popCell(cell);
                            this.spawnVirus();
                        }
                    }
                }

                if (cell instanceof EjectedCell) {
                    if (other instanceof EjectedCell) {
                        Physics.resolveCollision(cell, other);
                    }

                    if (other instanceof Virus) {
                        this.actionQueue.push([WorldAction.DELETE_CELL, cell]);
                        let boost: Vector2;
                        if (cell.getVelocity().getMagnitude() !== 0) {
                            boost = cell.getVelocity().getNormal().getMultiple(this.settings.VIRUS_PUSH_BOOST);
                        } else {
                            boost = new Vector2(1,0).getMultiple(this.settings.VIRUS_PUSH_BOOST);
                        }
                        other.getBoost().add(boost);
                    }
                }

                if (cell instanceof DeadCell && other instanceof DeadCell) {
                    Physics.resolveCollision(cell, other);
                }
            }
        }
    }
}