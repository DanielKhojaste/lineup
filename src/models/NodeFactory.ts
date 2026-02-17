import { NodeType } from "./NodeType";
import { Node } from "./Node";
import { Player } from "./Player";
import { Cone } from "./Cone";

type NodeCreationOptions = {
	[NodeType.Player]: {
		x: number;
		y: number;
		jerseyNumber?: number;
		name?: string;
		position?: string;
	};

	[NodeType.Cone]: {
		x: number;
		y: number;
		coneType?: string;
	};
};

type NodeCreator<T extends NodeType> = (
	options: NodeCreationOptions[T],
) => Node;

type NodeRegistry = {
	[K in NodeType]: NodeCreator<K>;
};

let idCounter = 100;

function generateId(): string {
	idCounter++;

	return `node${idCounter}`;
}

const registry: NodeRegistry = {
	[NodeType.Player]: (options) => {
		return new Player(
			generateId(),
			options.x,
			options.y,
			options.jerseyNumber,
			options.name,
			options.position,
		);
	},

	// DEV: Fix Lint to expand the function parameters below
	[NodeType.Cone]: (options) => {
		return new Cone(generateId(), options.x, options.y, options.coneType);
	},
};

export const NodeFactory = {
	create<T extends NodeType>(type: T, options: NodeCreationOptions[T]): Node {
		const creator = registry[type];

		if (!creator) {
			throw new Error(`Unexpected node type ${type}`);
		}

		return creator(options);
	},
};
