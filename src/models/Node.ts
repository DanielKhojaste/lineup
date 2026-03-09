import { clamp } from "../utils/helpers";
import { NodeType } from "./NodeType";

type PositionType = {
	x: number;
	y: number;
};

type BoundsType = {
	width: number;
	height: number;
};

export abstract class Node {
	constructor(
		public readonly id: string,
		public x: number,
		public y: number,
	) {}

	abstract getType(): NodeType;
	public getPosition() {
		return { x: this.x, y: this.y };
	}

	public moveBy(dx: number, dy: number) {
		this.x += dx;
		this.y += dy;
	}

	public moveTo(position: PositionType, bounds: BoundsType) {
		this.x = clamp(position.x, 0, bounds.width);
		this.y = clamp(position.y, 0, bounds.height);
	}
}
