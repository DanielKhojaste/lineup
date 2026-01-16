import { useState } from "react";
import { Link } from "react-router-dom";

function Home() {
	const [isLoading, setIsLoading] = useState<boolean>(true);

	return (
		<main className="home view">
			<h2>Home</h2>
		</main>
	);
}

export default Home;
