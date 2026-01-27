import { useState } from "react";
import Toolbar from "../components/Toolbar";
import Canvas from "../components/Canvas";
// import { Link } from "react-router-dom";

function Home() {
	const [isLoading, setIsLoading] = useState<boolean>(true);

	return (
		<main className="home view">
			<Toolbar />
			<Canvas />
		</main>
	);
}

export default Home;
