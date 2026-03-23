import { Suspense } from "react";
import { BrowserRouter, useRoutes } from "react-router-dom";
import Loader from "../components/Loader";
import { routes } from "./routes";

function RoutesRenderer() {
	return useRoutes(routes);
}

export default function ViewManager() {
	return (
		<BrowserRouter>
			<Suspense fallback={<Loader />}>
				<RoutesRenderer />
			</Suspense>
		</BrowserRouter>
	);
}
