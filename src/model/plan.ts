/**
 * Plans: a season (or any block of training) as topics in order, each with
 * its sessions in order. Plans have no dates, so one plan can be reused every
 * season or shared; the calendar lays a plan out on dates.
 */

import { newId } from "./board";
import {
	BoardFileError,
	decodeDocumentText,
	encodeDocument,
	foldersFrom,
	isObject,
	isNum,
	isStr,
} from "./file";
import { isSport, Sport } from "./sports";

export const PLAN_SCHEMA_VERSION = 1;
export const PLAN_EXTENSION = "lineup-plan";

/**
 * One week of a plan, with its sessions in order. (Stored in `topics` for
 * history: a plan's weeks were first called topics.)
 */
export interface PlanTopic {
	id: string;
	/** What the week works on, e.g. "Pressing", "Transition"; none is fine. */
	topics: string[];
	notes: string;
	/** Sessions in the order they're meant to run. The same session can appear more than once. */
	sessionIds: string[];
}

export interface Plan {
	schemaVersion: typeof PLAN_SCHEMA_VERSION;
	docType: "plan";
	id: string;
	meta: {
		title: string;
		tags: string[];
		/** Library folders it's in (none, one or several). */
		folders: string[];
		createdAt: string;
		updatedAt: string;
	};
	/** Who it's for, e.g. "U12 Girls". */
	team: string;
	sport: Sport | "";
	description: string;
	topics: PlanTopic[];
}

export function createTopic(topics: string[] = []): PlanTopic {
	return { id: newId(), topics, notes: "", sessionIds: [] };
}

export function createPlan(title = "Untitled plan"): Plan {
	const now = new Date().toISOString();
	return {
		schemaVersion: PLAN_SCHEMA_VERSION,
		docType: "plan",
		id: newId(),
		meta: { title, tags: [], folders: [], createdAt: now, updatedAt: now },
		team: "",
		sport: "",
		description: "",
		topics: [createTopic()],
	};
}

/** "Week 2", or "Week 2 · Pressing, Transition" when the week has topics. */
export function weekLabel(week: number, topics: string[]): string {
	return topics.length ? `Week ${week} · ${topics.join(", ")}` : `Week ${week}`;
}

/** A week's topics from a file: the list, or the one topic plans had before. */
function weekTopics(t: Record<string, unknown>): string[] {
	const list = Array.isArray(t.topics)
		? t.topics.filter(isStr).map((x) => x.trim().slice(0, 40)).filter(Boolean)
		: [];
	const old = isStr(t.title) ? t.title.trim().slice(0, 40) : "";
	return [...new Set(old && !list.includes(old) ? [old, ...list] : list)].slice(0, 12);
}

/** Every session of a plan in running order (week by week). */
export function planSessionIds(plan: Plan): string[] {
	return plan.topics.flatMap((t) => t.sessionIds);
}

// ---------------------------------------------------------------- Files ----

export function encodePlanFile(plan: Plan): Uint8Array {
	return encodeDocument(plan);
}

export function decodePlanFile(bytes: Uint8Array): Plan {
	return parsePlan(decodeDocumentText(bytes));
}

const text = (v: unknown, max = 2000) => (isStr(v) ? v.slice(0, max) : "");

export function parsePlan(source: string): Plan {
	let raw: unknown;
	try {
		raw = JSON.parse(source);
	} catch {
		throw new BoardFileError("This file isn't a Lineup plan.");
	}
	if (!isObject(raw) || raw.docType !== "plan" || !isNum(raw.schemaVersion))
		throw new BoardFileError("This file isn't a Lineup plan.");
	if (raw.schemaVersion > PLAN_SCHEMA_VERSION)
		throw new BoardFileError(
			"This plan was made with a newer version of Lineup. Update the app to open it.",
		);

	const fresh = createPlan();
	const meta = isObject(raw.meta) ? raw.meta : {};
	const topics = Array.isArray(raw.topics)
		? raw.topics.filter(isObject).map(
				(t): PlanTopic => ({
					id: isStr(t.id) ? t.id : newId(),
					topics: weekTopics(t),
					notes: text(t.notes),
					sessionIds: Array.isArray(t.sessionIds)
						? t.sessionIds.filter(isStr)
						: [],
				}),
			)
		: [];

	return {
		...fresh,
		id: isStr(raw.id) ? raw.id : fresh.id,
		meta: {
			title:
				isStr(meta.title) && meta.title.trim() ? meta.title : "Untitled plan",
			tags: Array.isArray(meta.tags) ? meta.tags.filter(isStr) : [],
			folders: foldersFrom(meta),
			createdAt: isStr(meta.createdAt) ? meta.createdAt : fresh.meta.createdAt,
			updatedAt: isStr(meta.updatedAt) ? meta.updatedAt : fresh.meta.updatedAt,
		},
		team: text(raw.team, 120),
		sport: isSport(raw.sport) ? raw.sport : "",
		description: text(raw.description),
		topics: topics.length ? topics : fresh.topics,
	};
}
