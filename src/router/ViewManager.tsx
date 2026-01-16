// src/router/ViewManager.tsx
import { Suspense } from "react";
import { BrowserRouter, useRoutes } from "react-router-dom";
import { routes } from "./routes";
import Loader from "../components/Loader";

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
