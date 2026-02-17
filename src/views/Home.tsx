import { useState } from "react";
import Toolbar from "../components/Toolbar";
import Canvas from "../components/Canvas";
import { Node } from "../models/Node";
import { Player } from "../models/Player";
import { Cone } from "../models/Cone";
import { NodeFactory } from "../models/NodeFactory";
import { NodeType } from "../models/NodeType";

function Home() {
	const [nodes, setNodes] = useState<Node[]>([
		NodeFactory.create(NodeType.Player, {
			x: 0,
			y: 0,
			jerseyNumber: 14,
			name: "Bonmati",
		}),
		NodeFactory.create(NodeType.Cone, { x: 100, y: 100 }),
	]);
	const [isLoading, setIsLoading] = useState<boolean>(true);

	return (
		<main className="home view">
			<Toolbar nodes={nodes} setNodes={setNodes} />
			<Canvas nodes={nodes} setNodes={setNodes} />
		</main>
	);
}

export default Home;
