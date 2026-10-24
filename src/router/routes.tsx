import { lazy } from "react";
import { RouteObject } from "react-router-dom";

const Library = lazy(() => import("../views/Library"));
const Editor = lazy(() => import("../views/Editor"));
const NotFound = lazy(() => import("../views/NotFound"));

export const routes: RouteObject[] = [
	{ path: "/", element: <Library /> },
	{ path: "/board/:id", element: <Editor /> },
	{ path: "*", element: <NotFound /> },
];
