import { NodeType } from "./NodeType";

export abstract class Node {
	constructor(
		public readonly id: string,
		public x: number,
		public y: number,
	) {}

	abstract getType(): NodeType;

	public moveBy(dx: number, dy: number) {
		this.x += dx;
		this.y += dy;
	}
}
