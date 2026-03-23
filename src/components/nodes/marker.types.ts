import { RefCallback, CSSProperties } from "react";

export interface BaseMarkerProps {
	containerRef?: RefCallback<HTMLDivElement>;
	handleRef?: RefCallback<HTMLDivElement>;
	style?: CSSProperties;
	className?: string;
}
