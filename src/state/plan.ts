import { createTopic, Plan, PlanTopic } from "../model/plan";
import { commit, History, HistoryAction, historyAction } from "./history";

export type PlanState = History<Plan>;

export type PlanAction =
	| HistoryAction
	| {
			type: "updatePlan";
			patch: Partial<Pick<Plan, "team" | "sport" | "description">> & {
				title?: string;
			};
	  }
	| { type: "addTopic"; topic?: PlanTopic; index?: number }
	| { type: "updateTopic"; id: string; patch: Partial<Pick<PlanTopic, "topics" | "notes">> }
	| { type: "removeTopic"; id: string }
	| { type: "moveTopic"; id: string; index: number }
	/** Add sessions to a topic at `index` (the end when missing). */
	| { type: "addSessions"; topicId: string; sessionIds: string[]; index?: number }
	| { type: "removeSession"; topicId: string; index: number }
	/** Move one session, within a topic or to another one. */
	| {
			type: "moveSession";
			from: { topicId: string; index: number };
			to: { topicId: string; index: number };
	  };

function withTopics(state: PlanState, topics: PlanTopic[]): PlanState {
	return commit(state, { ...state.present, topics });
}

export function planReducer(state: PlanState, action: PlanAction): PlanState {
	const handled = historyAction(state, action);
	if (handled) return handled;
	const plan = state.present;
	const topics = plan.topics;
	const update = (id: string, f: (t: PlanTopic) => PlanTopic) =>
		withTopics(
			state,
			topics.map((t) => (t.id === id ? f(t) : t)),
		);

	switch (action.type) {
		case "updatePlan": {
			const { title, ...rest } = action.patch;
			return commit(state, {
				...plan,
				...rest,
				meta: title === undefined ? plan.meta : { ...plan.meta, title },
			});
		}

		case "addTopic": {
			const topic = action.topic ?? createTopic();
			const at = Math.max(0, Math.min(topics.length, action.index ?? topics.length));
			return withTopics(state, [...topics.slice(0, at), topic, ...topics.slice(at)]);
		}

		case "updateTopic":
			return update(action.id, (t) => ({ ...t, ...action.patch }));

		case "removeTopic":
			return topics.some((t) => t.id === action.id)
				? withTopics(
						state,
						topics.filter((t) => t.id !== action.id),
					)
				: state;

		case "moveTopic": {
			const from = topics.findIndex((t) => t.id === action.id);
			const to = Math.max(0, Math.min(topics.length - 1, action.index));
			if (from === -1 || from === to) return state;
			const next = [...topics];
			const [moved] = next.splice(from, 1);
			next.splice(to, 0, moved);
			return withTopics(state, next);
		}

		case "addSessions":
			if (action.sessionIds.length === 0) return state;
			return update(action.topicId, (t) => {
				const at = Math.max(
					0,
					Math.min(t.sessionIds.length, action.index ?? t.sessionIds.length),
				);
				return {
					...t,
					sessionIds: [
						...t.sessionIds.slice(0, at),
						...action.sessionIds,
						...t.sessionIds.slice(at),
					],
				};
			});

		case "removeSession":
			return update(action.topicId, (t) => ({
				...t,
				sessionIds: t.sessionIds.filter((_, i) => i !== action.index),
			}));

		case "moveSession": {
			const { from, to } = action;
			const source = topics.find((t) => t.id === from.topicId);
			const target = topics.find((t) => t.id === to.topicId);
			const id = source?.sessionIds[from.index];
			if (!source || !target || id === undefined) return state;
			if (source === target && from.index === to.index) return state;
			const next = topics.map((t) => ({ ...t, sessionIds: [...t.sessionIds] }));
			const src = next.find((t) => t.id === from.topicId)!;
			const dst = next.find((t) => t.id === to.topicId)!;
			src.sessionIds.splice(from.index, 1);
			dst.sessionIds.splice(
				Math.max(0, Math.min(dst.sessionIds.length, to.index)),
				0,
				id,
			);
			return withTopics(state, next);
		}
	}
	return state;
}
