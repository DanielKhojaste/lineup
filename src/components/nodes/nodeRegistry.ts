import { Cone } from "../../models/Cone";
import { NodeType } from "../../models/NodeType";
import { Player } from "../../models/Player";
import ConeMarker from "./ConeMarker";
import PlayerMarker from "./PlayerMarker";

/**
 * Node registry defines the correct marker and necessary props for each node type.
 */
export const NODE_REGISTRY = {
	[NodeType.Player]: {
		Marker: PlayerMarker,
		getNodeProps: (node: Player) => ({
			jerseyNumber: node.jerseyNumber,
			name: node.name,
			position: node.position,
		}),
	},

	[NodeType.Cone]: {
		Marker: ConeMarker,
		getNodeProps: (_node: Cone) => ({}),
	},
};
