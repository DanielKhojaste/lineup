import { SVGProps } from "react";

const CIRCLE = "M5 12a7 7 0 1 0 14 0a7 7 0 1 0-14 0";

/** Stroke icons on a 24 × 24 grid. */
export const ICONS = {
	select: "M6 3l12 7.5-5.5 1.5-2.5 5.5z",
	player: CIRCLE,
	keeper: `${CIRCLE}M9.5 12h5`,
	cone: "M12 4l6 15H6zM4 19h16",
	ball: `${CIRCLE}M12 8.5l3 2.2-1.1 3.6h-3.8L9 10.7z`,
	undo: "M9 6L4 11l5 5M4 11h10a5 5 0 0 1 0 10h-3",
	redo: "M15 6l5 5-5 5M20 11H10a5 5 0 0 0 0 10h3",
	settings:
		"M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
	trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
	duplicate: "M8 8h12v12H8zM4 16V4h12",
	front: "M12 20V8M7 13l5-5 5 5M5 4h14",
	back: "M12 4v12M7 11l5 5 5-5M5 20h14",
	plus: "M12 5v14M5 12h14",
	goal: "M3 18V7h18v11M3 7l3 3h12l3-3M6 10v8M18 10v8",
	mannequin: "M12 3a2 2 0 1 0 0.01 0M9 21l1-9-3-3h10l-3 3 1 9",
	pole: "M12 3v18M9 21h6M12 3l5 3-5 3",
	run: "M5 19L18 6M11 6h7v7",
	pass: "M5 19l2.5-2.5M10 14l2.5-2.5M15 9l3-3M11 6h7v7",
	dribble: "M3 15c1.5-3 3 3 4.5 0s3 3 4.5 0 3 3 4.5 0M18 12l3 3-3 3",
	line: "M5 19L19 5",
	zone: "M4 6h16v12H4z",
	pen: "M4 20l4-1L19 8l-3-3L5 16zM14 7l3 3",
	text: "M5 6h14M12 6v13M9 19h6",
	eraser: "M8 20h12M4 15l9-9 6 6-7 7H8z",
	rotate: "M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7",
	more: "M3.8 12a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0-2.4 0zM10.8 12a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0-2.4 0zM17.8 12a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0-2.4 0z",
	search: "M5 11a6 6 0 1 0 12 0a6 6 0 1 0-12 0M20 20l-4.5-4.5",
	grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
	folder:
		"M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
	inbox: "M4 13l2-8h12l2 8M4 13v6h16v-6M4 13h5l1 2h4l1-2h5",
	chevronLeft: "M15 5l-7 7 7 7",
	download: "M12 4v11M7 10l5 5 5-5M5 20h14",
	close: "M6 6l12 12M18 6L6 18",
	check: "M5 12l5 5L20 7",
};

export type IconName = keyof typeof ICONS;

interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
	name: IconName;
	size?: number;
	/** Fill for closed shapes, e.g. a team colour on a player icon. */
	fillColor?: string;
}

export function Icon({ name, size = 20, fillColor, ...rest }: IconProps) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={1.8}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
			focusable="false"
			{...rest}
		>
			<path d={ICONS[name]} fill={fillColor ?? "none"} />
		</svg>
	);
}
