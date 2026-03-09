// src/router/routes.tsx
import { lazy } from "react";
import { RouteObject } from "react-router-dom";
import TestHome from "../dev/TestHome";

const Home = lazy(() => import("../views/Home"));
const NotFound = lazy(() => import("../views/NotFound"));

export const routes: RouteObject[] = [
	// DEV: Change default path to Home
	{
		path: "/",
		element: <TestHome />,
	},
	{
		path: "/home",
		element: <Home />,
	},
	{
		path: "/dev",
		element: <TestHome />,
	},
	{
		path: "*",
		element: <NotFound />,
	},
];
