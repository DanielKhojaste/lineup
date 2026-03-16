// src/router/routes.tsx
import { lazy } from "react";
import { RouteObject } from "react-router-dom";

const Home = lazy(() => import("../views/Home"));
const NotFound = lazy(() => import("../views/NotFound"));

export const routes: RouteObject[] = [
	{
		path: "/",
		element: <Home />,
	},
	{
		path: "/home",
		element: <Home />,
	},
	{
		path: "*",
		element: <NotFound />,
	},
];
