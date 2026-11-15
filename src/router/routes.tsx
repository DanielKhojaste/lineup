import { lazy } from "react";
import { RouteObject } from "react-router-dom";

const Library = lazy(() => import("../views/Library"));
const Editor = lazy(() => import("../views/Editor"));
const SessionEditor = lazy(() => import("../views/SessionEditor"));
const ThemePreview = lazy(() => import("../views/ThemePreview"));
const PlanEditor = lazy(() => import("../views/PlanEditor"));
const Calendar = lazy(() => import("../views/Calendar"));
const NotFound = lazy(() => import("../views/NotFound"));

export const routes: RouteObject[] = [
	{ path: "/", element: <Library /> },
	{ path: "/board/:id", element: <Editor /> },
	{ path: "/session/:id", element: <SessionEditor /> },
	{ path: "/plan/:id", element: <PlanEditor /> },
	{ path: "/calendar", element: <Calendar /> },
	{ path: "/themes", element: <ThemePreview /> },
	{ path: "*", element: <NotFound /> },
];
