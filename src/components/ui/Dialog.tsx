import { FormEvent, ReactNode, useEffect, useRef, useState } from "react";
import { Icon } from "../Icon";

interface ModalProps {
	open: boolean;
	title: string;
	onClose: () => void;
	children: ReactNode;
	className?: string;
}

/** A native modal <dialog>: focus is trapped, Escape closes, the backdrop closes. */
export function Modal({
	open,
	title,
	onClose,
	children,
	className,
}: ModalProps) {
	const ref = useRef<HTMLDialogElement>(null);
	const titleId = useRef(
		`dialog-${Math.random().toString(36).slice(2)}`,
	).current;

	useEffect(() => {
		const dialog = ref.current;
		if (!dialog) return;
		if (open && !dialog.open) {
			dialog.showModal();
			// showModal() focuses the first button (the close ×). Move focus to the
			// field or the main action instead, so typing and Enter work straight away.
			dialog
				.querySelector<HTMLElement>("[data-autofocus], input, select, textarea")
				?.focus();
		}
		if (!open && dialog.open) dialog.close();
	}, [open]);

	return (
		<dialog
			ref={ref}
			className={`dialog ${className ?? "dialog--small"}`}
			aria-labelledby={titleId}
			onClose={onClose}
			onClick={(e) => {
				if (e.target === ref.current) onClose();
			}}
		>
			<div className="dialog__inner">
				<header className="dialog__head">
					<h2 id={titleId}>{title}</h2>
					<button
						type="button"
						className="icon-button"
						aria-label="Close"
						onClick={onClose}
					>
						<Icon name="close" size={18} />
					</button>
				</header>
				{open && children}
			</div>
		</dialog>
	);
}

interface ConfirmProps {
	open: boolean;
	title: string;
	message: ReactNode;
	confirmLabel: string;
	danger?: boolean;
	onConfirm: () => void;
	onClose: () => void;
}

export function ConfirmDialog({
	open,
	title,
	message,
	confirmLabel,
	danger,
	onConfirm,
	onClose,
}: ConfirmProps) {
	return (
		<Modal open={open} title={title} onClose={onClose}>
			<div className="dialog__section">
				<p>{message}</p>
				<div className="dialog__actions">
					<button type="button" className="button" onClick={onClose}>
						Cancel
					</button>
					<button
						type="button"
						className={`button ${
							danger ? "button--danger" : "button--primary"
						}`}
						data-autofocus
						onClick={() => {
							onConfirm();
							onClose();
						}}
					>
						{confirmLabel}
					</button>
				</div>
			</div>
		</Modal>
	);
}

interface PromptProps {
	open: boolean;
	title: string;
	label: string;
	initialValue?: string;
	confirmLabel: string;
	/** Return an error message to keep the dialog open. */
	validate?: (value: string) => string | null;
	onSubmit: (value: string) => void;
	onClose: () => void;
}

export function PromptDialog({
	open,
	title,
	label,
	initialValue = "",
	confirmLabel,
	validate,
	onSubmit,
	onClose,
}: PromptProps) {
	return (
		<Modal open={open} title={title} onClose={onClose}>
			<PromptForm
				label={label}
				initialValue={initialValue}
				confirmLabel={confirmLabel}
				validate={validate}
				onSubmit={onSubmit}
				onClose={onClose}
			/>
		</Modal>
	);
}

function PromptForm({
	label,
	initialValue = "",
	confirmLabel,
	validate,
	onSubmit,
	onClose,
}: Omit<PromptProps, "open" | "title">) {
	const [value, setValue] = useState(initialValue);
	const [error, setError] = useState<string | null>(null);

	const submit = (e: FormEvent) => {
		e.preventDefault();
		const clean = value.trim();
		const problem = !clean ? "Enter a name." : validate?.(clean) ?? null;
		if (problem) {
			setError(problem);
			return;
		}
		onSubmit(clean);
		onClose();
	};

	return (
		<form className="dialog__section" onSubmit={submit}>
			<label className="field">
				<span className="field__label">{label}</span>
				<input
					className="field__input"
					value={value}
					maxLength={60}
					data-autofocus
					onChange={(e) => {
						setValue(e.target.value);
						setError(null);
					}}
					aria-invalid={!!error}
				/>
			</label>
			{error && (
				<p className="field__error" role="alert">
					{error}
				</p>
			)}
			<div className="dialog__actions">
				<button type="button" className="button" onClick={onClose}>
					Cancel
				</button>
				<button type="submit" className="button button--primary">
					{confirmLabel}
				</button>
			</div>
		</form>
	);
}
