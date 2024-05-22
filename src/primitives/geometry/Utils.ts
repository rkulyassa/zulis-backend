import { Shape } from './Shape';
import { Circle } from './Circle';
import { Rectangle } from './Rectangle';
import { Vector2 } from './Vector2';

export function areIntersecting(a: Shape, b: Shape): boolean {
    if (a instanceof Circle && b instanceof Circle) {
        return intersectsCC(a, b);
    } else if (a instanceof Circle && b instanceof Rectangle) {
        return intersectsCR(a, b);
    } else if (a instanceof Rectangle && b instanceof Circle) {
        return intersectsCR(b, a);
    } else if (a instanceof Rectangle && b instanceof Rectangle) {
        return intersectsRR(a, b);
    }
}

function intersectsCC(a: Circle, b: Circle): boolean {
    const d = b.getCenter().getDifference(a.getCenter());
    const d2 = d.getDotProduct(d);
    const r = (a.getRadius() + b.getRadius());
    return d2 <= r*r;
}

function intersectsCR(a: Circle, b: Rectangle): boolean {
    const closestPoint = new Vector2(
        Math.max(b.getCenter().getX() - b.getWidth() / 2, Math.min(a.getCenter().getX(), b.getCenter().getX() + b.getWidth() / 2)),
        Math.max(b.getCenter().getY() - b.getHeight() / 2, Math.min(a.getCenter().getY(), b.getCenter().getY() + b.getHeight() / 2))
    );
    const d = a.getCenter().getDifference(closestPoint);
    const d2 = d.getDotProduct(d);
    // const dx = a.getCenter().getX() - closestPoint.getX();
    // const dy = a.getCenter().getY() - closestPoint.getY();
    const r2 = a.getRadius() * a.getRadius();
    // const d2 = (dx * dx) + (dy * dy);
    return d2 <= r2;
}

function intersectsRR(a: Rectangle, b: Rectangle): boolean {
    return a.getCenter().getX() - a.getWidth()/2 < b.getCenter().getX() + b.getWidth()/2 &&
           a.getCenter().getX() + a.getWidth()/2 > b.getCenter().getX() - b.getWidth()/2 &&
           a.getCenter().getY() - a.getHeight()/2 < b.getCenter().getY() + b.getHeight()/2 &&
           a.getCenter().getY() + a.getHeight()/2 > b.getCenter().getY() - b.getHeight()/2;
}