/**
 * The calendar puts sessions on dates. Each entry points at a session in the
 * library; marking it as run (with notes) turns the calendar into a log of
 * what the team actually did.
 */

import { newId } from "./board";
import { isObject, isStr } from "./file";

export type EntryStatus = "planned" | "done" | "cancelled";

/** A training session (from the library), a match, or any other event (a meeting, a tournament day…). */
export type EntryKind = "session" | "match" | "event";

export interface CalendarEntry {
	id: string;
	kind: EntryKind;
	/** A match's opponent, or an event's name; empty for sessions. */
	label: string;
	/** A match played away ("@ Riverside") rather than at home ("vs Riverside"). */
	away: boolean;
	/** Local date, "2026-11-03". */
	date: string;
	/** "18:00", or null when the time doesn't matter. */
	time: string | null;
	/** The session; empty for matches and events. */
	sessionId: string;
	/** Team or age group, so several teams can share a calendar. */
	team: string;
	/** The plan this entry was laid out from, if any. */
	planId: string | null;
	status: EntryStatus;
	/** Notes after the session: how it went, who was there. */
	log: string;
}

/** The colours a season's phases can have; the app turns each into a tint that suits the theme. */
export const PHASE_COLORS = ["grey", "green", "blue", "purple", "amber", "red"] as const;
export type PhaseColor = (typeof PHASE_COLORS)[number];

/** A stretch of the season: "Pre-season", "In-season · Phase 1", "Winter break"… */
export interface SeasonPhase {
	id: string;
	name: string;
	/** First and last day, "2026-07-13". */
	start: string;
	end: string;
	color: PhaseColor;
}

/** A season, drawn as a timeline of its phases above the calendar. */
export interface Season {
	id: string;
	/** "Season 2026–27". */
	name: string;
	start: string;
	end: string;
	phases: SeasonPhase[];
}

export interface CalendarData {
	version: 1;
	entries: CalendarEntry[];
	seasons: Season[];
}

export const EMPTY_CALENDAR: CalendarData = { version: 1, entries: [], seasons: [] };

// ---------------------------------------------------------------- Dates ----

const pad = (n: number) => String(n).padStart(2, "0");

/** A Date's local calendar day as "YYYY-MM-DD". */
export function toISODate(date: Date): string {
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** "YYYY-MM-DD" as a Date at local midnight, or null if it isn't a date. */
export function parseISODate(value: string): Date | null {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (!m) return null;
	const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
	return toISODate(date) === value ? date : null;
}

export function addDays(date: Date, days: number): Date {
	const next = new Date(date);
	next.setDate(next.getDate() + days);
	return next;
}

/** 0 = Monday … 6 = Sunday. */
export function weekdayIndex(date: Date): number {
	return (date.getDay() + 6) % 7;
}

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** The Monday on or before a date. */
export function startOfWeek(date: Date): Date {
	return addDays(date, -weekdayIndex(date));
}

/** The six weeks (42 days, Monday first) shown for a month. */
export function monthGrid(year: number, month: number): Date[] {
	const first = startOfWeek(new Date(year, month, 1));
	return Array.from({ length: 42 }, (_, i) => addDays(first, i));
}

// -------------------------------------------------------------- Entries ----

export function createEntry(
	sessionId: string,
	date: string,
	options: Partial<Omit<CalendarEntry, "id" | "sessionId" | "date">> = {},
): CalendarEntry {
	return {
		id: newId(),
		kind: "session",
		label: "",
		away: false,
		date,
		time: null,
		sessionId,
		team: "",
		planId: null,
		status: "planned",
		log: "",
		...options,
	};
}

/** A match ("vs Riverside", or "@ Riverside" away) or another event on a date. */
export function createEvent(
	kind: "match" | "event",
	date: string,
	label = "",
	options: Partial<Omit<CalendarEntry, "id" | "kind" | "label" | "date">> = {},
): CalendarEntry {
	return createEntry("", date, { kind, label, ...options });
}

/** What an entry is called on the calendar: a match as "vs X" or "@ X", an event by its name. */
export function eventTitle(entry: CalendarEntry): string {
	if (entry.kind === "match") {
		const who = entry.label.trim() || "Match";
		return entry.label.trim() ? `${entry.away ? "@" : "vs"} ${who}` : who;
	}
	return entry.label.trim() || "Event";
}

/** Entries in date and time order (untimed ones first on their day). */
export function sortEntries(entries: CalendarEntry[]): CalendarEntry[] {
	return [...entries].sort(
		(a, b) =>
			a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? ""),
	);
}

/**
 * Lay a plan's sessions out on dates: from `start`, each session goes on the
 * next chosen training day (0 = Monday … 6 = Sunday), in order.
 */
export function layOutSessions(
	sessionIds: string[],
	start: string,
	weekdays: number[],
	options: { time?: string | null; team?: string; planId?: string | null } = {},
): CalendarEntry[] {
	const from = parseISODate(start);
	const days = new Set(weekdays);
	if (!from || days.size === 0) return [];
	const entries: CalendarEntry[] = [];
	let date = from;
	for (const sessionId of sessionIds) {
		while (!days.has(weekdayIndex(date))) date = addDays(date, 1);
		entries.push(
			createEntry(sessionId, toISODate(date), {
				time: options.time ?? null,
				team: options.team ?? "",
				planId: options.planId ?? null,
			}),
		);
		date = addDays(date, 1);
	}
	return entries;
}

/**
 * A plan's weeks on the calendar: week 1's sessions on the training days of
 * the week the plan starts (from the start date on), week 2's on the next
 * week's, and so on. An empty week leaves its week empty. A week with more
 * sessions than training days puts the rest on its last training day.
 */
export function layOutWeeks(
	weeks: string[][],
	start: string,
	weekdays: number[],
	options: { time?: string | null; team?: string; planId?: string | null } = {},
): CalendarEntry[] {
	const from = parseISODate(start);
	const days = [...new Set(weekdays)].sort((a, b) => a - b);
	if (!from || days.length === 0) return [];
	const firstMonday = startOfWeek(from);
	const entries: CalendarEntry[] = [];
	weeks.forEach((sessionIds, week) => {
		const monday = addDays(firstMonday, week * 7);
		const dates = days
			.map((d) => addDays(monday, d))
			// The first week starts on the start date, not before it.
			.filter((date) => date >= from);
		if (!dates.length) return;
		sessionIds.forEach((sessionId, i) => {
			const date = dates[Math.min(i, dates.length - 1)];
			entries.push(
				createEntry(sessionId, toISODate(date), {
					time: options.time ?? null,
					team: options.team ?? "",
					planId: options.planId ?? null,
				}),
			);
		});
	});
	return entries;
}

/** When each session was last run (the latest entry marked done), by session id. */
/**
 * A session's status as shown: one still planned whose date has passed counts
 * as done (it ran), without anyone marking it. Cancelled ones stay cancelled.
 */
export function statusOf(entry: CalendarEntry, today = toISODate(new Date())): EntryStatus {
	return entry.status === "planned" && entry.date < today ? "done" : entry.status;
}

export function lastRunBySession(
	entries: CalendarEntry[],
	today = toISODate(new Date()),
): Map<string, string> {
	const last = new Map<string, string>();
	for (const e of entries) {
		// Only sessions that have run: done, and not in the future.
		if (statusOf(e, today) !== "done" || e.date > today) continue;
		const seen = last.get(e.sessionId);
		if (!seen || e.date > seen) last.set(e.sessionId, e.date);
	}
	return last;
}

// ---------------------------------------------------------------- File -----

const CLOCK = /^([01]?\d|2[0-3]):[0-5]\d$/;

/** Read the calendar file; broken entries are dropped. */
export function parseCalendar(source: string): CalendarData {
	let raw: unknown;
	try {
		raw = JSON.parse(source);
	} catch {
		return EMPTY_CALENDAR;
	}
	if (!isObject(raw) || !Array.isArray(raw.entries)) return EMPTY_CALENDAR;
	// (Older calendars have no seasons, and every entry is a session.)
	const entries = raw.entries.filter(isObject).flatMap((e): CalendarEntry[] => {
		const kind: EntryKind = e.kind === "match" || e.kind === "event" ? e.kind : "session";
		if (!isStr(e.date) || !parseISODate(e.date)) return [];
		// A session needs its session; matches and events stand alone.
		if (kind === "session" && (!isStr(e.sessionId) || !e.sessionId)) return [];
		return [
			{
				id: isStr(e.id) ? e.id : newId(),
				kind,
				label: isStr(e.label) ? e.label.slice(0, 120) : "",
				away: e.away === true,
				date: e.date,
				time: isStr(e.time) && CLOCK.test(e.time) ? e.time : null,
				sessionId: kind === "session" && isStr(e.sessionId) ? e.sessionId : "",
				team: isStr(e.team) ? e.team.slice(0, 120) : "",
				planId: isStr(e.planId) ? e.planId : null,
				status:
					e.status === "done" || e.status === "cancelled" ? e.status : "planned",
				log: isStr(e.log) ? e.log.slice(0, 4000) : "",
			},
		];
	});
	const day = (v: unknown): string | null => (isStr(v) && parseISODate(v) ? v : null);
	const seasons = (Array.isArray(raw.seasons) ? raw.seasons : []).filter(isObject).flatMap((x): Season[] => {
		const start = day(x.start);
		const end = day(x.end);
		if (!start || !end || end < start) return [];
		const phases = (Array.isArray(x.phases) ? x.phases : []).filter(isObject).flatMap((p): SeasonPhase[] => {
			const ps = day(p.start);
			const pe = day(p.end);
			if (!ps || !pe || pe < ps) return [];
			return [
				{
					id: isStr(p.id) ? p.id : newId(),
					name: isStr(p.name) ? p.name.slice(0, 60) : "",
					start: ps,
					end: pe,
					color: PHASE_COLORS.includes(p.color as PhaseColor) ? (p.color as PhaseColor) : "grey",
				},
			];
		});
		return [
			{
				id: isStr(x.id) ? x.id : newId(),
				name: isStr(x.name) ? x.name.slice(0, 60) : "",
				start,
				end,
				phases: phases.sort((a, b) => a.start.localeCompare(b.start)),
			},
		];
	});
	return { version: 1, entries, seasons };
}

/** "today", "yesterday", "12 days ago", "in 3 days", or the date for anything further away. */
export function describeDay(date: string, today = new Date()): string {
	const d = parseISODate(date);
	if (!d) return "";
	const t = parseISODate(toISODate(today))!;
	const days = Math.round((t.getTime() - d.getTime()) / 86_400_000);
	if (days === 0) return "today";
	if (days === 1) return "yesterday";
	if (days === -1) return "tomorrow";
	if (days > 1 && days < 30) return `${days} days ago`;
	if (days < -1 && days > -30) return `in ${-days} days`;
	return d.toLocaleDateString(undefined, {
		day: "numeric",
		month: "short",
		...(d.getFullYear() !== t.getFullYear() ? { year: "numeric" } : {}),
	});
}

/** When each board was last run in a session marked done, by board id. */
export function lastRunByBoard(
	entries: CalendarEntry[],
	boardsOf: (sessionId: string) => string[],
): Map<string, string> {
	const last = new Map<string, string>();
	for (const [sessionId, date] of lastRunBySession(entries)) {
		for (const boardId of boardsOf(sessionId)) {
			const seen = last.get(boardId);
			if (!seen || date > seen) last.set(boardId, date);
		}
	}
	return last;
}

/** The next planned session from today on (not cancelled, not done), or undefined. */
export function nextSession(entries: CalendarEntry[], today = new Date()): CalendarEntry | undefined {
	const from = toISODate(today);
	return sortEntries(entries.filter((e) => e.date >= from && e.status === "planned"))[0];
}

/** A date in a few characters: "Today", "Tomorrow", "Thu 19" within a week, else "3 Dec". */
export function shortDay(date: string, today = new Date()): string {
	const d = parseISODate(date);
	if (!d) return "";
	const days = Math.round((d.getTime() - parseISODate(toISODate(today))!.getTime()) / 86_400_000);
	if (days === 0) return "Today";
	if (days === 1) return "Tomorrow";
	if (days > 1 && days < 7)
		return `${d.toLocaleDateString("en-GB", { weekday: "short" })} ${d.getDate()}`;
	return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** "Thursday 19 November". */
export function longDay(date: string): string {
	const d = parseISODate(date);
	return d ? d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }) : date;
}

// -------------------------------------------------------------- Seasons ----

/** Days from one date to another (both "YYYY-MM-DD"), counting the first and the last. */
export function daysBetween(start: string, end: string): number {
	return Math.round((parseISODate(end)!.getTime() - parseISODate(start)!.getTime()) / 86_400_000) + 1;
}

/** The season around a date; else the next one to start; else the last one. */
export function seasonFor(seasons: Season[], date: string): Season | undefined {
	const sorted = [...seasons].sort((a, b) => a.start.localeCompare(b.start));
	return (
		sorted.find((s) => s.start <= date && date <= s.end) ??
		sorted.find((s) => s.start > date) ??
		sorted[sorted.length - 1]
	);
}

/** The phase a date falls in, if any. */
export function phaseOn(season: Season | undefined, date: string): SeasonPhase | undefined {
	return season?.phases.find((p) => p.start <= date && date <= p.end);
}

/** A season from July to May with the usual phases, to edit from (dates around the given day). */
export function sampleSeason(today = new Date()): Season {
	const y = today.getMonth() >= 6 ? today.getFullYear() : today.getFullYear() - 1;
	const d = (year: number, month: number, day: number) => toISODate(new Date(year, month - 1, day));
	const phase = (name: string, start: string, end: string, color: PhaseColor): SeasonPhase => ({
		id: newId(),
		name,
		start,
		end,
		color,
	});
	return {
		id: newId(),
		name: `Season ${y}–${String(y + 1).slice(2)}`,
		start: d(y, 7, 13),
		end: d(y + 1, 5, 30),
		phases: [
			phase("Pre-season", d(y, 7, 13), d(y, 8, 23), "grey"),
			phase("In-season · Phase 1", d(y, 8, 24), d(y, 12, 13), "green"),
			phase("Winter break", d(y, 12, 14), d(y + 1, 1, 10), "grey"),
			phase("In-season · Phase 2", d(y + 1, 1, 11), d(y + 1, 4, 25), "blue"),
			phase("Tournament", d(y + 1, 4, 26), d(y + 1, 5, 30), "purple"),
		],
	};
}
