import { CSSProperties, RefCallback } from "react";

export interface BaseMarkerProps {
	containerRef?: RefCallback<HTMLDivElement>;
	handleRef?: RefCallback<HTMLDivElement>;
	style?: CSSProperties;
	className?: string;
	onDoubleClick?: () => void;
}
