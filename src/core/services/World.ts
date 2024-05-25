import { WorldSettings } from '../../types/WorldSettings';
import { Cell } from '../cells/Cell';
import { PlayerCell } from '../cells/PlayerCell';
import { Pellet } from '../cells/Pellet';
import { EjectedCell } from '../cells/EjectedCell';
import { Virus } from '../cells/Virus';
import { Vector2 } from '../../primitives/geometry/Vector2';
import { Quadtree } from '../../primitives/Quadtree';
import { Rectangle } from '../../primitives/geometry/Rectangle';
import { areaToRadius, areIntersecting } from '../../primitives/geometry/Utils';
import { randomInt, randomFromInterval } from '../../primitives/Misc';
import { Controller } from '../Controller';
import { WorldActions } from '../../types/Enums';
import { DeadCell } from '../cells/DeadCell';
import * as Physics from './Physics';

export class World {
    private settings: WorldSettings;
    private tps: number;
    private cells: Array<Cell>;
    private boundary: Rectangle;
    private quadtree: Quadtree<Cell>;
    private actions: Array<[WorldActions, Cell, any?]>;
    private controllers: Array<Controller>;

    constructor(settings: WorldSettings, tps: number) {
        this.settings = settings;
        this.tps = tps;
        this.cells = new Array<Cell>();
        const size = this.settings.WORLD_SIZE;
        this.boundary = new Rectangle(new Vector2(size/2, size/2), size, size);
        this.quadtree = new Quadtree(this.boundary, 4, 16);
        this.actions = new Array<[WorldActions, Cell, any?]>();
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
     * Queues the creation of a {@link PlayerCell} in a random location.
     * @param pid - The pid of the cell's owner.
     */
    spawnPlayerCell(pid: number): void {
        const radius = areaToRadius(this.settings.SPAWN_MASS);
        const spawnPos = new Vector2(randomInt(this.settings.WORLD_SIZE), randomInt(this.settings.WORLD_SIZE));
        const newCell = new PlayerCell(this.settings, pid, radius, spawnPos, new Vector2(0));

        for (const cell of this.cells) {
            if (cell instanceof Virus && areIntersecting(newCell.getBoundary(), cell.getBoundary())) {
                this.spawnPlayerCell(pid);
                return;
            }
        }

        this.actions.push([WorldActions.CREATE_CELL, newCell]);
    }

    /**
     * Spawns a pellet in a random location.
     */
    spawnPellet(): void {
        const radius = areaToRadius(this.settings.PELLET_MASS);
        const spawnPos = new Vector2(randomInt(this.settings.WORLD_SIZE), randomInt(this.settings.WORLD_SIZE));
        const pellet = new Pellet(this.settings, radius, spawnPos);
        this.actions.push([WorldActions.CREATE_CELL, pellet]);
    }

    /**
     * Spawns a virus in a random location.
     * TODO: prevent spawns ontop of players
     */
    spawnVirus(): void {
        const radius = areaToRadius(this.settings.VIRUS_MASS);
        const spawnPos = new Vector2(randomInt(this.settings.WORLD_SIZE), randomInt(this.settings.WORLD_SIZE));
        const virus = new Virus(this.settings, radius, spawnPos);
        this.actions.push([WorldActions.CREATE_CELL, virus]);
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
     * Disconnects all {@link PlayerCell}s with corresponding ownerPid.
     * Queues the deletion of the {@link PlayerCell}s and the creation of {@link DeadCell}s to replace them.
     * @param pid - The ownerPid to disconnect.
     */
    disconnectPlayerCellsByPid(pid: number): void {
        const playerCells = this.getPlayerCellsByPid(pid);
        for (const playerCell of playerCells) {
            this.actions.push([WorldActions.DELETE_CELL, playerCell]);
            this.actions.push([WorldActions.CREATE_CELL, new DeadCell(this.settings, playerCell.getRadius(), playerCell.getPosition(), playerCell.getVelocity())]);
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
        const newCell = new PlayerCell(this.settings, pid, radius, position, boost);
        this.actions.push([WorldActions.CREATE_CELL, newCell]);
        this.actions.push([WorldActions.UPDATE_CELL, cell, -newCell.getMass()]);
    }

    /**
     * Ejects an {@link EjectedCell} in a specified {@link direction}.
     * Enqueues the creation of the {@link EjectedCell} and update of the ejecting {@link PlayerCell}.
     * @param cell - The {@link PlayerCell} to eject from.
     * @param direction - The {@link Vector2} direction to eject towards.
     */
    ejectFromCell(cell: PlayerCell, direction: Vector2): void {
        const radius = areaToRadius(this.settings.EJECT_MASS);
        const spawnPos = cell.getPosition().getSum(direction.getMultiple(cell.getRadius()));
        const dispersion = randomFromInterval(-this.settings.EJECT_DISPERSION, this.settings.EJECT_DISPERSION);
        const boost = direction.getMultiple(this.settings.EJECT_BOOST).getRotated(dispersion);
        const ejectedCell = new EjectedCell(this.settings, radius, spawnPos, boost, cell);
        this.actions.push([WorldActions.CREATE_CELL, ejectedCell]);
        this.actions.push([WorldActions.UPDATE_CELL, cell, -this.settings.EJECT_MASS])
    }

    popCell(cell: PlayerCell): void {
        const playerCells = this.getPlayerCellsByPid(cell.getOwnerPid());
        const poppedCount = this.settings.MAX_CELLS - playerCells.length;
        if (poppedCount === 0) return;

        const pid = cell.getOwnerPid();
        const radius = Math.sqrt((cell.getRadius() * cell.getRadius())/poppedCount);
        const position = cell.getPosition();

        let poppedMass = 0;

        for (let i = 0; i < poppedCount; i++) {
            const boostDirection = Vector2.fromAngle(randomFromInterval(0, 2*Math.PI));
            const boost = boostDirection.getMultiple(this.settings.POP_BOOST);
            const poppedCell = new PlayerCell(this.settings, pid, radius, position.getSum(boostDirection.getNormal()), boost);
            poppedMass += poppedCell.getMass();
            this.actions.push([WorldActions.CREATE_CELL, poppedCell]);
        }

        this.actions.push([WorldActions.UPDATE_CELL, cell, -poppedMass]);
    }

    /**
     * Moves the {@link Cell} out of the wall and handles velocity.
     * @param cell - The {@link Cell} to resolve.
     */
    resolveWallCollision(cell: Cell): void {
        const size = this.settings.WORLD_SIZE;
        const x = cell.getPosition().getX();
        const y = cell.getPosition().getY();

        if (x < 0) {
            cell.getPosition().setX(0);
            if (cell instanceof EjectedCell || Virus) cell.getBoost().flipX();
            if (cell instanceof EjectedCell) cell.setExitedParent(true);
        }
        if (x > size) {
            cell.getPosition().setX(size);
            if (cell instanceof EjectedCell || Virus) cell.getBoost().flipX();
            if (cell instanceof EjectedCell) cell.setExitedParent(true);
        }
        if (y < 0) {
            cell.getPosition().setY(0);
            if (cell instanceof EjectedCell || Virus) cell.getBoost().flipY();
            if (cell instanceof EjectedCell) cell.setExitedParent(true);
        }
        if (y > size) {
            cell.getPosition().setY(size);
            if (cell instanceof EjectedCell || Virus) cell.getBoost().flipY();
            if (cell instanceof EjectedCell) cell.setExitedParent(true);
        }
    }

    resolveEat(predator: Cell, prey: Cell): void {
        while(predator.getEater() !== null) {
            predator = predator.getEater();
        }
        if (predator === prey) return; // move this out of here?, not sure why this is necessary since predator would never equal prey?
        this.actions.push([WorldActions.EAT, predator, prey]);
        prey.setEater(predator);
        if (predator instanceof PlayerCell && prey instanceof Pellet) this.spawnPellet();
    }

    tick(tps: number): void {
        // console.log(`\ntick ${Date.now()}\n`);
        // this.quadtree.print();

        while (this.actions.length > 0) {
            const [action, cell, data] = this.actions.shift();
            switch(action) {
                case WorldActions.CREATE_CELL:
                    this.cells.push(cell);
                    break;
                case WorldActions.DELETE_CELL:
                    this.cells.splice(this.cells.indexOf(cell), 1);
                    break;
                case WorldActions.UPDATE_CELL:
                    cell.setRadius(areaToRadius(cell.getMass() + data));
                    break;
                case WorldActions.EAT:
                    let [predator, prey] = [cell, data];
                    predator.setRadius(areaToRadius(predator.getMass() + prey.getMass()));
                    this.cells.splice(this.cells.indexOf(prey), 1);
                    break;
            }
        };
        this.actions.length = 0;

        // handle all connected players' input
        for (const controller of this.controllers) {
            const pid = controller.getPid();
            const input = controller.getInput();
            const playerCells = this.getPlayerCellsByPid(pid);
            const targetPoint = Physics.getCellsCenterOfMass(playerCells).getSum(input.mouseVector);

            for (const cell of playerCells) {

                // set velocity
                const speed = this.settings.BASE_SPEED * (1/tps) * cell.getRadius() ** -0.5;
                let d = targetPoint.getDifference(cell.getPosition());
                if (d.getMagnitude() === 0) { // cursor in middle
                    cell.setVelocity(new Vector2(0));
                } else {
                    let v = d.getNormal().getMultiple(speed);
                    if (v.getMagnitude() > this.settings.SPEED_CAP) {
                        v = v.getNormal().getMultiple(this.settings.SPEED_CAP);
                    }
                    cell.setVelocity(v);
                }

                // handle ejecting
                if (input.isEjecting) {
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
            if (input.toSplit > 0) {
                for (const cell of playerCells) {
                    if (cell.getMass() > this.settings.MIN_MASS_TO_SPLIT) {
                        const splitDirection = targetPoint.getDifference(cell.getPosition()).getNormal();
                        this.splitCell(cell, splitDirection);
                    }
                }
                controller.setInput("toSplit", input.toSplit-1);
            }

            // handle split cells
            // for (let i = input.toSplit; i > 0; i--) {
            //     for (const cell of this.getCellsByPid(pid)) {
            //         if (cell.getMass() > this.settings.MIN_MASS_TO_SPLIT) {
            //             this.splitCell(cell, targetPoint.getDifference(cell.getPosition()).getNormal());
            //         }
            //     }
            // }
            // controller.setInput("toSplit", 0);
        }

        // create quadtree
        this.quadtree = new Quadtree(this.boundary, 4, 16);

        for (const cell of this.cells) {
            // cells moved prior to insertion
            cell.stepMotion();
            this.resolveWallCollision(cell);

            //insert cells
            this.quadtree.insert(cell);

            // tick each cell & update accordingly
            cell.tick(this.tps);
            if (cell instanceof EjectedCell) cell.checkIfExitedParent();
            if (cell instanceof PlayerCell) {
                if (cell.getAge() % this.settings.DECAY_RATE <= 500/this.tps) { // this is 500 instead of 1000 because otherwise it decays in 2 subsequent ticks
                    this.actions.push([WorldActions.UPDATE_CELL, cell, -cell.getMass() * (1-this.settings.DECAY_SCALE)]);
                }
            }
            if (cell instanceof DeadCell && cell.getAge() > this.settings.DEAD_CELL_LIFETIME) {
                this.actions.push([WorldActions.DELETE_CELL, cell]);
            }
        }

        // resolve all collisions & game logic (handled in subsequent tick)
        for (const cell of this.cells) {
            // if (this.cells.indexOf(cell) === -1) continue;

            const collisions = this.quadtree.query(cell.getBoundary());

            for (const other of collisions) {
                // if (this.cells.indexOf(other) === -1) continue;
                if (cell === other) continue;

                if (cell instanceof PlayerCell) {
                    if (other instanceof PlayerCell) {
                        if (cell.getOwnerPid() === other.getOwnerPid()) {
                            if (cell.canMerge() && other.canMerge()) {
                                if (cell.canEat(other)) {
                                    this.resolveEat(cell, other);
                                }
                            } else if (!cell.isSplitting() && !other.isSplitting()) {
                                Physics.resolveCollision(cell, other);
                            }
                        } else if (cell.canEat(other)) {
                            this.resolveEat(cell, other);
                        }
                    }

                    if (other instanceof EjectedCell) {
                        if ((other.hasExitedParent() || other.getAge() > 0) && cell.canEat(other)) {
                            this.resolveEat(cell, other);
                        }
                    }

                    if (other instanceof Pellet) {
                        if (cell.canEat(other)) {
                            this.resolveEat(cell, other);
                        }
                    }

                    if (other instanceof DeadCell) {
                        if (cell.canEat(other)) {
                            this.resolveEat(cell, other);
                        }
                    }

                    if (other instanceof Virus) {
                        if (cell.canEat(other)) {
                            this.resolveEat(cell, other);
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
                        other.setBoost(cell.getBoost().getNormal().getMultiple(this.settings.VIRUS_PUSH_BOOST));
                        this.actions.push([WorldActions.DELETE_CELL, cell]);
                    }
                }

                if (cell instanceof DeadCell && other instanceof DeadCell) {
                    Physics.resolveCollision(cell, other);
                }
            }
        }
    }
}