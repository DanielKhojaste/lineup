// Copies the version in VERSION (the one place it's set) into package.json,
// package-lock.json, src-tauri/tauri.conf.json and src-tauri/Cargo.toml.
// Cargo.lock follows on the next build.
//
//   npm run version:sync        copy VERSION everywhere
//   npm run version:check       fail if anything is out of step (for CI)
import { readFileSync, writeFileSync } from "node:fs";

const check = process.argv.includes("--check");
const version = readFileSync("VERSION", "utf8").trim();
if (!/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(version)) {
	console.error(`VERSION doesn't hold a version number: "${version}"`);
	process.exit(1);
}

const files = [
	{
		path: "package.json",
		get: (t) => JSON.parse(t).version,
		set: (t) => t.replace(/("version":\s*")[^"]+(")/, `$1${version}$2`),
	},
	{
		path: "package-lock.json",
		get: (t) => JSON.parse(t).version,
		// The project's own version: at the top and under packages[""].
		set: (t) =>
			t
				.replace(/^(\{\s*"name":\s*"lineup",\s*"version":\s*")[^"]+/, `$1${version}`)
				.replace(/("packages":\s*\{\s*"":\s*\{\s*"name":\s*"lineup",\s*"version":\s*")[^"]+/, `$1${version}`),
	},
	{
		path: "src-tauri/tauri.conf.json",
		get: (t) => JSON.parse(t).version,
		set: (t) => t.replace(/("version":\s*")[^"]+(")/, `$1${version}$2`),
	},
	{
		path: "src-tauri/Cargo.toml",
		get: (t) => /^\s*version\s*=\s*"([^"]+)"/m.exec(t)?.[1],
		set: (t) => t.replace(/^(\s*version\s*=\s*")[^"]+(")/m, `$1${version}$2`),
	},
];

let behind = 0;
for (const f of files) {
	const text = readFileSync(f.path, "utf8");
	const current = f.get(text);
	if (current === version) continue;
	behind++;
	if (check) console.error(`${f.path} is at ${current}, VERSION says ${version}`);
	else {
		writeFileSync(f.path, f.set(text));
		console.log(`${f.path}: ${current} → ${version}`);
	}
}
if (check && behind) process.exit(1);
if (!behind) console.log(`Everything is at ${version}.`);
