import { lazy } from "react";
import { RouteObject } from "react-router-dom";

const Editor = lazy(() => import("../views/Editor"));
const NotFound = lazy(() => import("../views/NotFound"));

export const routes: RouteObject[] = [
	{ path: "/", element: <Editor /> },
	{ path: "*", element: <NotFound /> },
];
