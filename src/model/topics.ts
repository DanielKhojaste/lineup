import { Sport } from "./sports";

/**
 * Suggested topics for sessions, by sport. Coaches can add their own; these
 * are just the common ones so most sessions can be tagged in a click or two.
 */
const GENERAL = [
	"Warm-up",
	"Possession",
	"Attacking transition",
	"Defensive transition",
	"Pressing",
	"Set pieces",
	"Small-sided games",
	"Fitness",
	"Cool-down",
];

export const TOPIC_PRESETS: Record<Sport, string[]> = {
	soccer: [
		"Passing",
		"Receiving",
		"Dribbling",
		"1v1 attacking",
		"1v1 defending",
		"Shooting",
		"Finishing",
		"Crossing",
		"Heading",
		"Build-up play",
		"Combination play",
		"Counter-attack",
		"Defending as a unit",
		"Goalkeeping",
		...GENERAL,
	],
	futsal: [
		"Passing",
		"Receiving",
		"Dribbling",
		"1v1 attacking",
		"1v1 defending",
		"Shooting",
		"Rotations",
		"Pivot play",
		"Power play",
		"Goalkeeping",
		...GENERAL,
	],
	basketball: [
		"Ball handling",
		"Passing",
		"Shooting",
		"Layups",
		"Footwork",
		"Rebounding",
		"Pick and roll",
		"Off-ball movement",
		"Post play",
		"Man-to-man defence",
		"Zone defence",
		"Fast break",
		"Press break",
		"Free throws",
		...GENERAL,
	],
	volleyball: [
		"Serving",
		"Serve receive",
		"Setting",
		"Attacking",
		"Blocking",
		"Digging",
		"Footwork",
		"Rotations",
		"Transition",
		"Out-of-system play",
		"Warm-up",
		"Small-sided games",
		"Fitness",
		"Cool-down",
	],
	handball: [
		"Passing",
		"Catching",
		"Shooting",
		"1v1 attacking",
		"1v1 defending",
		"Feints",
		"Fast break",
		"Pivot play",
		"Wing play",
		"6-0 defence",
		"5-1 defence",
		"Goalkeeping",
		...GENERAL,
	],
	hockey: [
		"Passing",
		"Receiving",
		"Dribbling",
		"Tackling",
		"Shooting",
		"Aerials",
		"Outletting",
		"Penalty corners",
		"Goalkeeping",
		...GENERAL,
	],
};

/** Topics to suggest: the sport's (or general ones), then the coach's own from other sessions. */
export function suggestedTopics(sport: Sport | "", ownTopics: string[] = []): string[] {
	const presets = sport
		? TOPIC_PRESETS[sport]
		: ["Passing", "Receiving", "Dribbling", "Shooting", "Defending", ...GENERAL];
	const seen = new Set<string>();
	return [...presets, ...ownTopics].filter((t) => {
		const key = t.toLowerCase();
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}
