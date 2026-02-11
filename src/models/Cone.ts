import { NodeType } from "./NodeType";
import { Node } from "./Node";

export class Cone extends Node {
	constructor(id: string, x: number, y: number, coneType?: string) {
		super(id, x, y);
	}

	getType(): NodeType {
		return NodeType.Cone;
	}
}
