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
