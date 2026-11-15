import { Plan, planSessionIds } from "../../model/plan";
import { SPORT_INFO } from "../../model/sports";
import { relativeTime } from "../../utils/time";
import { truncate } from "../../utils/text";
import { ContextMenuEntry, useContextMenu } from "../ui/ContextMenu";
import CardMenuButton from "./CardMenuButton";

/**
 * A plan in the library: its weeks in order (with each one's topic and how
 * many sessions it has) where a board card has its picture, then its title and details.
 */
export default function PlanCard({
	plan,
	onOpen,
	menu,
}: {
	plan: Plan;
	onOpen: () => void;
	menu: () => ContextMenuEntry[];
}) {
	const { openMenu } = useContextMenu();
	const sessions = planSessionIds(plan).length;
	const details = [
		plan.team,
		plan.sport && SPORT_INFO[plan.sport].name,
		`${plan.topics.length} week${plan.topics.length === 1 ? "" : "s"}`,
		`${sessions} session${sessions === 1 ? "" : "s"}`,
		`Edited ${relativeTime(plan.meta.updatedAt)}`,
	].filter(Boolean);
	const topics = plan.topics.slice(0, 6);

	return (
		<article data-card={`p:${plan.id}`} className="board-card plan-card" onContextMenu={(e) => openMenu(e, menu())}>
			<button
				type="button"
				className="board-card__open"
				onClick={onOpen}
				aria-label={`Open ${truncate(plan.meta.title, 60)}`}
				title={plan.meta.title}
			>
				<span className="plan-card__topics" aria-hidden="true">
					{topics.map((topic, i) => (
						<span key={topic.id} className="plan-card__topic">
							<span className="plan-card__number">{i + 1}</span>
							<span className="plan-card__name">
								Week {i + 1}
								{topic.title && <span className="muted"> · {topic.title}</span>}
							</span>
							<span className="plan-card__count">{topic.sessionIds.length}</span>
						</span>
					))}
					{plan.topics.length > topics.length && (
						<span className="plan-card__more">+{plan.topics.length - topics.length} more weeks</span>
					)}
				</span>
				<span className="board-card__title">
					<span className="badge">Plan</span> {plan.meta.title}
				</span>
				<span className="board-card__meta">{details.join(" · ")}</span>
			</button>
			<CardMenuButton title={plan.meta.title} menu={menu} />
		</article>
	);
}
