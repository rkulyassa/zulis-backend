import { Shape } from './geometry/Shape';
import { Rectangle } from './geometry/Rectangle';
import { Vector2 } from './geometry/Vector2';
import { areIntersecting } from './geometry/Utils';

interface QuadtreeObject {
    getBoundary(): Shape;
}

export class Quadtree<T extends QuadtreeObject> {
    private boundary: Rectangle;
    private maxObjects: number;
    private maxDepth: number;
    private depth: number;
    private divided: boolean;
    private branches: Array<Quadtree<T>|null>;
    private objects: Array<T>;
    
    constructor(boundary: Rectangle, maxObjects: number, maxDepth: number, parent: Quadtree<T> = null) {
        this.boundary = boundary;
        this.maxObjects = maxObjects;
        this.maxDepth = maxDepth;
        this.depth = parent ? parent.depth + 1 : 1;
        this.objects = [];
        this.divided = false;
        this.branches = [null, null, null, null];
    }

    /**
     * The goal here is to insert the object as deep as possible as long as it is fully contained in the branch.
     * If it can no longer go any deeper (i.e. a large cell) even though the tree has more levels, then it just gets added to the deepest possible branch that still fully contains it
     */
    insert(object: T): void {

        // traverse tree until we can't go any deeper (i.e. cell no longer fits)
        if (this.divided) {
            for (const branch of this.branches) {
                if (object.getBoundary().fitsWithin(branch.boundary)) {
                    branch.insert(object);
                    return;
                }
            }
        }

        this.objects.push(object);
        if (!this.divided && this.objects.length > this.maxObjects && this.depth < this.maxDepth) {
            this.split();
        }
    }

    /**
     * Descend along a path of possible branches that might contain the object. If it is found in any, remove it
     * I'm thinking this can be skipped entirely if we store a pointer to the branch that contains the cell in the cell instance itself. That way we can jump directly to the branch we need to remove the cell from
     */
    remove(object: T): void {
    
        // check if branch has object
        const index = this.objects.indexOf(object);

        // remove object if it was found
        if (index !== -1) {
            this.objects.splice(index, 1);
            if (this.divided && this.branches.every(branch => branch && branch.isEmpty())) {
                this.branches = [];
                this.divided = false;
            }
            return;
        }

        // if object not in current branch, descend to the next possible branch
        if (this.divided) {
            for (const branch of this.branches) {
                if (object.getBoundary().fitsWithin(branch.boundary)) {
                    if (branch) branch.remove(object);
                }
            }
        }
    }

    isEmpty(): boolean {
        return this.objects.length === 0 && (this.divided ? this.branches.every(branch => branch.isEmpty()) : true);
    }

    split(): void {
        // create the 4 branches
        const x = this.boundary.getCenter().getX();
        const y = this.boundary.getCenter().getY();
        const w = this.boundary.getWidth();
        const h = this.boundary.getHeight();
        this.branches[0] = new Quadtree(new Rectangle(new Vector2(x - w/4, y - h/4), w/2, h/2), this.maxObjects, this.maxDepth, this);
        this.branches[1] = new Quadtree(new Rectangle(new Vector2(x + w/4, y - h/4), w/2, h/2), this.maxObjects, this.maxDepth, this);
        this.branches[2] = new Quadtree(new Rectangle(new Vector2(x - w/4, y + h/4), w/2, h/2), this.maxObjects, this.maxDepth, this);
        this.branches[3] = new Quadtree(new Rectangle(new Vector2(x + w/4, y + h/4), w/2, h/2), this.maxObjects, this.maxDepth, this);

        // keep a copy of the objects; they will be reinserted later if they don't fit into any of the branches
        const tempObjects = this.objects as Array<T>;
        this.objects = [];
        this.divided = true;

        // redistribute the objects into the new branches
        for (const object of tempObjects) {
            this.insert(object);
        }
    }

    /**
     * Given a range, recursively check the branches that intersect
     */
    query(range: Shape, found: Array<T> = []): Array<T> {
        if (!areIntersecting(this.boundary, range)) return found;

        for (const object of this.objects) {
            if (areIntersecting(range, object.getBoundary())) {
                found.push(object);
            }
        }

        if (this.divided) {
            for (const branch of this.branches) {
                if (branch) branch.query(range, found);
            }
        }

        return found
    }

    // this is just for rendering the tree on the client
    getBranchBoundaries(found: Array<Rectangle> = []): Array<Rectangle> {
        found.push(this.boundary);

        if (this.divided) {
            for (const branch of this.branches) {
                branch.getBranchBoundaries(found);
            }
        }

        return found;
    }

    print(indent: string = ''): void {
        console.log(`${indent}Depth: ${this.depth} | Objects: ${this.objects.length} | Boundary: (${this.boundary.toString()})`);
        
        // Print each object in the current quadtree node
        this.objects.forEach(obj => {
            console.log(`${indent}  Object: ${obj.getBoundary().toString()}`);
        });

        // Recursively print details of each divided branch
        if (this.divided) {
            console.log(`${indent}Divided into:`);
            this.branches.forEach((branch, index) => {
                if (branch) {
                    console.log(`${indent}Branch ${index}:`);
                    branch.print(indent + '  ');
                }
            });
        }
    }
}