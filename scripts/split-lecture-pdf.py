from pathlib import Path
from pypdf import PdfReader, PdfWriter
import sys


source = Path(sys.argv[1])
target = Path(sys.argv[2])
start_page = int(sys.argv[3])
end_page = int(sys.argv[4])

reader = PdfReader(str(source))
if start_page < 1 or end_page < start_page or end_page > len(reader.pages):
    raise ValueError(f"Invalid page range {start_page}-{end_page} for {source} ({len(reader.pages)} pages)")

writer = PdfWriter()
for index in range(start_page - 1, end_page):
    writer.add_page(reader.pages[index])

target.parent.mkdir(parents=True, exist_ok=True)
with target.open("wb") as stream:
    writer.write(stream)

# Reopen the result so a successful write alone is never treated as verification.
written = PdfReader(str(target))
expected = end_page - start_page + 1
if len(written.pages) != expected:
    raise ValueError(f"Output verification failed: expected {expected} pages, got {len(written.pages)}")
