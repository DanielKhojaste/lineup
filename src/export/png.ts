import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import BoardPreview from "../components/board/BoardPreview";
import { BOARD_HEIGHT, BOARD_WIDTH } from "../model/pitch";
import { Board } from "../model/types";

/**
 * The board's on-screen styling lives in the app stylesheet, which a
 * standalone image can't see, so the rules that matter are inlined here.
 */
const EXPORT_CSS = `
.marker__hover, .marker__selection, .drawing__hit { display: none; }
text { font-family: "IBM Plex Sans", "Segoe UI", Arial, sans-serif; }
.marker__number { font-weight: 700; }
.marker__caption { font-size: 13px; font-weight: 600; fill: #fff; stroke: #0b1a12; stroke-width: 3.5px; stroke-linejoin: round; paint-order: stroke; }
.drawing__text { font-weight: 600; }
`;

/** Render a board to a PNG at `scale` × the board's size (1110 × 740 units). */
export async function boardToPng(board: Board, scale = 2): Promise<Uint8Array> {
	const width = BOARD_WIDTH * scale;
	const height = BOARD_HEIGHT * scale;
	const svg = renderToStaticMarkup(
		createElement(
			BoardPreview,
			{ board, width, height },
			createElement("style", null, EXPORT_CSS),
		),
	);

	const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
	try {
		const image = new Image();
		image.decoding = "async";
		image.src = url;
		await image.decode();

		const canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;
		const context = canvas.getContext("2d");
		if (!context) throw new Error("Couldn't create the image.");
		context.drawImage(image, 0, 0, width, height);

		const blob = await new Promise<Blob | null>((resolve) =>
			canvas.toBlob(resolve, "image/png"),
		);
		if (!blob) throw new Error("Couldn't create the image.");
		return new Uint8Array(await blob.arrayBuffer());
	} finally {
		URL.revokeObjectURL(url);
	}
}
