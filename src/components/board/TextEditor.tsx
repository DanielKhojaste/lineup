import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { TextDrawing } from "../../model/types";
import { useEditor } from "../../state/EditorContext";
import { textBox } from "./geometry";

interface TextEditorProps {
	drawing: TextDrawing;
	onChange: (text: string) => void;
	onDone: () => void;
}

/**
 * Edits a text drawing in place: a textarea laid over the board exactly where
 * the text is drawn. Enter adds a line; Ctrl+Enter, Escape or clicking away finishes.
 */
export default function TextEditor({
	drawing,
	onChange,
	onDone,
}: TextEditorProps) {
	const { boardRef } = useEditor();
	const ref = useRef<HTMLTextAreaElement>(null);
	const [layout, setLayout] = useState<{
		left: number;
		top: number;
		scale: number;
	} | null>(null);
	const box = textBox(drawing);

	useLayoutEffect(() => {
		const svg = boardRef.current;
		const section = svg?.parentElement;
		const matrix = svg?.getScreenCTM();
		if (!svg || !section || !matrix) return;
		const origin = section.getBoundingClientRect();
		const centre = new DOMPoint(box.x + box.width / 2, box.y).matrixTransform(
			matrix,
		);
		setLayout({
			left: centre.x - origin.left,
			top: centre.y - origin.top,
			scale: matrix.a,
		});
	}, [boardRef, box.x, box.y, box.width]);

	// Focus once the textarea exists (it isn't rendered until its position is known).
	const ready = layout !== null;
	useEffect(() => {
		if (!ready) return;
		ref.current?.focus();
		ref.current?.select();
	}, [ready]);

	if (!layout) return null;
	const lines = drawing.text.split("\n");
	const longest = Math.max(4, ...lines.map((l) => [...l].length));

	return (
		<textarea
			ref={ref}
			className="text-editor"
			aria-label="Text on the board"
			value={drawing.text}
			placeholder="Type…"
			rows={Math.max(1, lines.length)}
			spellCheck={false}
			style={{
				left: layout.left,
				top: layout.top,
				fontSize: box.size * layout.scale,
				lineHeight: `${box.lineHeight * layout.scale}px`,
				width: `${longest + 2}ch`,
				color: drawing.color,
			}}
			onChange={(e) => onChange(e.target.value)}
			onBlur={onDone}
			onKeyDown={(e) => {
				if (
					e.key === "Escape" ||
					(e.key === "Enter" && (e.ctrlKey || e.metaKey))
				) {
					e.preventDefault();
					e.stopPropagation();
					e.currentTarget.blur();
				}
			}}
		/>
	);
}
