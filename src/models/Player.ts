import { NodeType } from "./NodeType";
import { Node } from "./Node";

export class Player extends Node {
	constructor(
		id: string,
		x: number,
		y: number,
		public jerseyNumber?: number,
		public name?: string,
		public position?: string,
	) {
		super(id, x, y);
	}

	getType(): NodeType {
		return NodeType.Player;
	}
}
