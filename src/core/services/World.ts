import { WorldSettings } from '../../types/WorldSettings';
import { Cell } from '../cells/Cell';
import { PlayerCell } from '../cells/PlayerCell';
import { Pellet } from '../cells/Pellet';
import { EjectedCell } from '../cells/EjectedCell';
import { Virus } from '../cells/Virus';
import { Vector2 } from '../../primitives/geometry/Vector2';
import { Quadtree } from '../../primitives/Quadtree';
import { Rectangle } from '../../primitives/geometry/Rectangle';
import { areIntersecting } from '../../primitives/geometry/Utils';
import { randomInt, randomFromInterval } from '../../primitives/Misc';
import { Controller } from '../Controller';
import { WorldActions, CellTypes } from '../../types/Enums';
import { ClientOpcodes } from '../../types/Protocol';
import { DeadCell } from '../cells/DeadCell';

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

    addController(controller: Controller): void {
        this.controllers.push(controller);
    }

    getControllers(): Array<Controller> {
        return this.controllers;
    }

    getControllerByPid(pid: number): Controller {
        return this.controllers.find(controller => controller.getPid() === pid);
    }

    removeControllerByPid(pid: number): void {
        this.controllers = this.controllers.filter(controller => controller.getPid() !== pid);
    }

    getQuadtree(): Quadtree<Cell> {
        return this.quadtree;
    }

    getCellsByPid(pid: number): Array<PlayerCell> {
        return this.cells.filter(cell => cell instanceof PlayerCell && cell.getOwnerPid() === pid) as Array<PlayerCell>;
    }

    disconnectCells(pid: number): void {
        for (const cell of this.cells) {
            if (cell instanceof PlayerCell && cell.getOwnerPid() === pid) {
                this.actions.push([WorldActions.DELETE_CELL, cell]);
                this.actions.push([WorldActions.CREATE_CELL, new DeadCell(this.settings, cell.getRadius(), cell.getPosition(), cell.getVelocity())]);
            }
        }
    }

    spawnCell(pid: number): void {
        const radius = Math.sqrt(this.settings.SPAWN_MASS/Math.PI);
        const spawnPos = new Vector2(randomInt(this.settings.WORLD_SIZE), randomInt(this.settings.WORLD_SIZE));
        const newCell = new PlayerCell(this.settings, pid, radius, spawnPos, new Vector2(0));

        for (const cell of this.cells) {
            if (cell instanceof Virus && areIntersecting(newCell.getBoundary(), cell.getBoundary())) {
                this.spawnCell(pid);
                return;
            }
        }

        this.actions.push([WorldActions.CREATE_CELL, newCell]);
    }

    spawnPellet(): void {
        const radius = Math.sqrt(this.settings.PELLET_MASS/Math.PI);
        const spawnPos = new Vector2(randomInt(this.settings.WORLD_SIZE + radius), randomInt(this.settings.WORLD_SIZE - radius));
        const pellet = new Pellet(this.settings, radius, spawnPos);
        this.actions.push([WorldActions.CREATE_CELL, pellet]);
    }

    spawnVirus(): void {
        const radius = Math.sqrt(this.settings.VIRUS_MASS/Math.PI);
        const spawnPos = new Vector2(randomInt(this.settings.WORLD_SIZE), randomInt(this.settings.WORLD_SIZE));
        const virus = new Virus(this.settings, radius, spawnPos);
        this.actions.push([WorldActions.CREATE_CELL, virus]);
    }

    getCellsPacket(pid: number, viewport: Rectangle): Object {
        const data = [];
        let totalMass = 0;
        for (const cell of this.quadtree.query(viewport)) {
            // console.log(cell.getId(), cell.getEater());
            let cellType;
            if (cell instanceof Pellet) {
                cellType = CellTypes.PELLET;
            } else if (cell instanceof PlayerCell) {
                // TODO: remove distinction?
                if (pid === cell.getOwnerPid()) {
                    cellType = CellTypes.OWNED_CELL;
                    totalMass += cell.getMass();
                } else {
                    cellType = CellTypes.OTHER_CELL;
                }
            } else if (cell instanceof EjectedCell) {
                cellType = CellTypes.EJECTED_CELL;
            } else if (cell instanceof Virus) {
                cellType = CellTypes.VIRUS;
            } else if (cell instanceof DeadCell) {
                cellType = CellTypes.DEAD_CELL;
            }

            data.push([
                cell.getId(),
                cellType,
                cell.getPosition().getX(),
                cell.getPosition().getY(),
                cell.getRadius()
            ]);
        }
        // console.log(totalMass);
        return data;
    }

    getPlayerCenterOfMass(pid: number): Vector2 {
        const ownedCells = this.getCellsByPid(pid);
        const center = new Vector2(0, 0);
        let M = 0;
        for (const cell of ownedCells) {
            const m = cell.getMass();
            center.add(cell.getPosition().getMultiple(m));
            M += m;
        }
        center.multiply(1/M);
        return center;
    }

    resolveCollision(a: Cell, b: Cell): void {
        const d = b.getPosition().getDifference(a.getPosition());
        const n = d.getNormal();
        const r = a.getRadius() + b.getRadius();
        const am = a.getMass();
        const bm = b.getMass();
        const m = am + bm;
        
        const overlap = (r - d.getMagnitude())/2;
        const aM = n.getMultiple(overlap * bm/m);
        const bM = n.getMultiple(overlap * am/m);

        a.getPosition().subtract(aM);
        b.getPosition().add(bM);
    }

    // TODO: move to Cell class?
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
        if (predator === prey) return; // not sure why this is necessary but it is lol
        this.actions.push([WorldActions.EAT, predator, prey]);
        prey.setEater(predator);
        if (predator instanceof PlayerCell && prey instanceof Pellet) this.spawnPellet();
    }

    ejectFromCell(cell: PlayerCell, direction: Vector2): void {
        const radius = Math.sqrt(this.settings.EJECT_MASS/Math.PI);
        const spawnPos = cell.getPosition().getSum(direction.getMultiple(cell.getRadius()));
        const dispersion = randomFromInterval(-this.settings.EJECT_DISPERSION, this.settings.EJECT_DISPERSION);
        const boost = direction.getMultiple(this.settings.EJECT_BOOST).getRotated(dispersion);
        const ejectedCell = new EjectedCell(this.settings, radius, spawnPos, boost, cell);
        this.actions.push([WorldActions.CREATE_CELL, ejectedCell]);
        this.actions.push([WorldActions.UPDATE_CELL, cell, -this.settings.EJECT_MASS])
    }
    
    splitCell(cell: PlayerCell, direction: Vector2): void {
        const radius = Math.sqrt((cell.getRadius() * cell.getRadius())/2);
        const pid = cell.getOwnerPid();
        const position = cell.getPosition().getSum(direction);
        const boost = direction.getMultiple(this.settings.SPLIT_BOOST);
        const newCell = new PlayerCell(this.settings, pid, radius, position, boost);
        this.actions.push([WorldActions.CREATE_CELL, newCell]);
        this.actions.push([WorldActions.UPDATE_CELL, cell, -newCell.getMass()]);
    }

    popCell(cell: PlayerCell): void {
        const playerCells = this.getCellsByPid(cell.getOwnerPid());
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

    handleMessage(controller: Controller, opcode: number, data: any): void {
        switch (opcode) {
            case ClientOpcodes.MOUSE_MOVE:
                controller.setInput('mouseVector', new Vector2(data[0], data[1]));
                break;
            case ClientOpcodes.TOGGLE_FEED:
                controller.setInput('isEjecting', data);
                break;
            case ClientOpcodes.SPLIT:
                if (this.getCellsByPid(controller.getPid()).length >= this.settings.MAX_CELLS) return;
                controller.setInput('toSplit', data);
                break;
        }
    }

    tick(): void {
        // console.log(`\ntick ${Date.now()}\n`);
        // this.quadtree.print();

        // physical cell updates - done separately as to not interfere with collision detection. hence the need for WorldActions system
        const logging = {
            creation: false,
            deletion: false,
            updates: false,
            eating: false
        }
        while (this.actions.length > 0) {
            const [action, cell, data] = this.actions.shift();
            switch(action) {
                case WorldActions.CREATE_CELL:
                    this.cells.push(cell);
                    if (logging.creation) console.log('Creating cell:', cell.toString());
                    break;
                case WorldActions.DELETE_CELL:
                    this.cells.splice(this.cells.indexOf(cell), 1);
                    if (logging.deletion) console.log('Deleting cell:', cell.toString());
                    break;
                case WorldActions.UPDATE_CELL:
                    const og = cell.toString();
                    cell.setRadius(Math.sqrt((cell.getMass() + data)/Math.PI));
                    if (logging.updates) console.log('Updating cell:', og, 'gaining', data.toString(), 'mass');
                    break;
                case WorldActions.EAT:
                    let [predator, prey] = [cell, data];
                    predator.setRadius(Math.sqrt((predator.getMass() + prey.getMass())/Math.PI));
                    this.cells.splice(this.cells.indexOf(prey), 1);
                    break;
            }
        };
        this.actions.length = 0;

        // handle all connected players' input
        for (const controller of this.controllers) {
            const pid = controller.getPid();
            const input = controller.getInput();

            const targetPoint = this.getPlayerCenterOfMass(pid).getSum(input.mouseVector);

            for (const cell of this.getCellsByPid(pid)) {

                // set velocity
                const speed = this.settings.BASE_SPEED * (1/this.tps) * cell.getRadius() ** -0.5;
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
                        let direction = targetPoint.getDifference(cell.getPosition());
                        if (direction.getMagnitude() === 0) direction = new Vector2(1,0); // cursor in middle, feed horizontally
                        if (cell.getMass() >= this.settings.MIN_MASS_TO_EJECT) {
                            this.ejectFromCell(cell, direction.getNormal());
                        }
                        controller.setEjectTick(this.settings.EJECT_DELAY);
                    }
                }
            }

            // handle split cells
            if (input.toSplit > 0) {
                for (const cell of this.getCellsByPid(pid)) {
                    if (cell.getMass() > this.settings.MIN_MASS_TO_SPLIT) {
                        this.splitCell(cell, targetPoint.getDifference(cell.getPosition()).getNormal());
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
            if (cell instanceof PlayerCell || cell instanceof EjectedCell || cell instanceof DeadCell) cell.tick(this.tps);
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
            if (this.cells.indexOf(cell) === -1) continue;

            const collisions = this.quadtree.query(cell.getBoundary());

            for (const other of collisions) {
                if (this.cells.indexOf(other) === -1) continue;
                if (cell === other) continue;

                if (cell instanceof PlayerCell) {
                    if (other instanceof PlayerCell) {
                        if (cell.getOwnerPid() === other.getOwnerPid()) {
                            if (cell.canMerge() && other.canMerge()) {
                                if (cell.canEat(other)) {
                                    this.resolveEat(cell, other);
                                }
                            } else if (!cell.isSplitting() && !other.isSplitting()) {
                                this.resolveCollision(cell, other);
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
                        this.resolveCollision(cell, other);
                    }

                    if (other instanceof Virus) {
                        other.setBoost(cell.getBoost().getNormal().getMultiple(this.settings.VIRUS_PUSH_BOOST));
                        this.actions.push([WorldActions.DELETE_CELL, cell]);
                    }
                }

                if (cell instanceof DeadCell && other instanceof DeadCell) {
                    this.resolveCollision(cell, other);
                }
            }
        }
    }
}