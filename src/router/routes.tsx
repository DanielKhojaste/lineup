import { lazy } from "react";
import { RouteObject } from "react-router-dom";

const Library = lazy(() => import("../views/Library"));
const Editor = lazy(() => import("../views/Editor"));
const SessionEditor = lazy(() => import("../views/SessionEditor"));
const NotFound = lazy(() => import("../views/NotFound"));

export const routes: RouteObject[] = [
	{ path: "/", element: <Library /> },
	{ path: "/board/:id", element: <Editor /> },
	{ path: "/session/:id", element: <SessionEditor /> },
	{ path: "*", element: <NotFound /> },
];
