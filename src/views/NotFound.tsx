import { Link } from "react-router-dom";

export default function NotFound() {
	return (
		<main className="not-found">
			<h1>Page not found</h1>
			<Link to="/">Back to the board</Link>
		</main>
	);
}
