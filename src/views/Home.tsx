import { useState } from "react";
import Toolbar from "../components/Toolbar";
import Canvas from "../components/Canvas";
import { Node } from "../models/Node";
import { Player } from "../models/Player";
import { Cone } from "../models/Cone";

function Home() {
	// TODO: Use NodeFactory to create nodes
	const [nodes, setNodes] = useState<Node[]>([
		new Player("node101", 0, 0, 14, "Bonmati"),
		new Cone("node102", 100, 100),
	]);
	const [isLoading, setIsLoading] = useState<boolean>(true);

	return (
		<main className="home view">
			<Toolbar />
			<Canvas nodes={nodes} setNodes={setNodes} />
		</main>
	);
}

export default Home;
