from pathlib import Path
from pypdf import PdfReader, PdfWriter
import sys


if len(sys.argv) < 4:
    raise SystemExit("usage: merge-pdf-page-ranges.py <source> <target> <start-end> [<start-end> ...]")

source = Path(sys.argv[1])
target = Path(sys.argv[2])
ranges = []
for raw_range in sys.argv[3:]:
    start, end = raw_range.split("-", 1)
    ranges.append((int(start), int(end)))

reader = PdfReader(str(source))
writer = PdfWriter()
for start, end in ranges:
    if start < 1 or end < start or end > len(reader.pages):
        raise ValueError(f"Invalid page range {start}-{end} for {source} ({len(reader.pages)} pages)")
    for index in range(start - 1, end):
        writer.add_page(reader.pages[index])

target.parent.mkdir(parents=True, exist_ok=True)
with target.open("wb") as stream:
    writer.write(stream)

written = PdfReader(str(target))
expected = sum(end - start + 1 for start, end in ranges)
if len(written.pages) != expected:
    raise ValueError(f"Output verification failed: expected {expected} pages, got {len(written.pages)}")

print(f"created {target} with {expected} pages from {', '.join(f'{start}-{end}' for start, end in ranges)}")
