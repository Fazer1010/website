"""Assemble the static site: src/partials + src/pages -> *.html in the project root.

Run:  python tools/build.py
Each page in src/pages starts with a small front matter block (key: value lines)
followed by a line containing only '---', then the page body.
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
PARTIALS = SRC / "partials"
PAGES = SRC / "pages"


def read(path: pathlib.Path) -> str:
    return path.read_text(encoding="utf-8")


def parse(page_text: str):
    if "\n---\n" not in page_text:
        raise ValueError("page is missing the '---' front matter separator")
    front, body = page_text.split("\n---\n", 1)
    meta = {}
    for line in front.strip().splitlines():
        key, _, value = line.partition(":")
        meta[key.strip()] = value.strip()
    return meta, body


def main() -> int:
    parts = {name: read(PARTIALS / f"{name}.html") for name in ("head", "nav", "footer", "scripts")}
    built = 0
    for page in sorted(PAGES.glob("*.html")):
        meta, body = parse(read(page))
        slug = page.stem
        meta.setdefault("slug", slug)
        meta.setdefault("nav", slug)
        html = parts["head"] + parts["nav"] + body + parts["footer"] + parts["scripts"]
        for key, value in meta.items():
            html = html.replace("{{" + key + "}}", value)
        # mark the active navigation link
        html = re.sub(
            r'data-nav="' + re.escape(meta["nav"]) + '"',
            lambda m: m.group(0) + ' aria-current="page"',
            html,
        )
        leftover = re.findall(r"{{\w+}}", html)
        if leftover:
            print(f"warning: {slug}.html has unfilled placeholders: {sorted(set(leftover))}")
        (ROOT / f"{slug}.html").write_text(html, encoding="utf-8")
        built += 1
        print(f"built {slug}.html")
    print(f"{built} page(s) written to {ROOT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
