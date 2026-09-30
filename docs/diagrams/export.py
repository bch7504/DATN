"""Build offline galleries and a landscape PDF from the reviewed diagram catalog.

CLI: uv run --no-project --with pymupdf python docs/diagrams/export.py
Input: catalog.json and existing chapter SVG/PNG artifacts only.
Output: index.html, chapter index.html, luong-use-case-studyflow.pdf.
No original report PDF or application data is opened or modified.
Exit 0 on success; invalid catalog, missing artifacts/font or text overflow fails.
Re-running replaces generated galleries/booklet; no network/provider requests.
"""

from __future__ import annotations

import html
import json
from pathlib import Path
from typing import TypedDict

import pymupdf

ROOT = Path(__file__).resolve().parent


class Diagram(TypedDict):
    """Catalog schema: required relative stem, title, placement and explanation."""

    stem: str
    title: str
    placement: str
    explanation: str


def read_catalog() -> list[Diagram]:
    """Load and validate non-sensitive diagram metadata.

    Args:
        None; reads only sibling catalog.json.
    Returns:
        Validated entries with existing SVG/PNG artifacts within chapter folders.
    Raises:
        ValueError: Bad schema, duplicate stem or unauthorized path.
        FileNotFoundError: Catalog or generated artifact is missing.
    """
    data = json.loads((ROOT / 'catalog.json').read_text(encoding='utf-8'))
    if not isinstance(data, list):
        raise ValueError('Expected catalog array')
    entries: list[Diagram] = []
    seen: set[str] = set()
    for item in data:
        if not isinstance(item, dict) or set(item) != {'stem', 'title', 'placement', 'explanation'}:
            raise ValueError('Invalid catalog schema')
        if not all(isinstance(value, str) and value for value in item.values()):
            raise ValueError('Required nonempty strings')
        stem = item['stem']
        candidate = (ROOT / stem).resolve()
        if (candidate.parent not in [ROOT / f'chuong-{i}' for i in (1, 2, 3)]
                or stem in seen):
            raise ValueError(f'Invalid/duplicate stem: {stem}')
        seen.add(stem)
        for extension in ('.svg', '.png'):
            if not candidate.with_suffix(extension).is_file():
                raise FileNotFoundError(candidate.with_suffix(extension))
        entries.append(Diagram(**item))
    return entries


def write_gallery(entries: list[Diagram], chapter: str | None = None) -> None:
    """Generate an offline HTML gallery with captions and explanatory prose.

    Args:
        entries: Required validated catalog entries.
        chapter: Optional chapter folder; default None produces the root gallery.
    Returns:
        None; replaces only the selected index.html artifact.
    Raises:
        OSError: Output cannot be written; caller should fix permissions and retry.
    """
    selected = [e for e in entries if not chapter or e['stem'].startswith(chapter + '/')]
    prefix = '../' if chapter else ''
    title = 'StudyFlow — Use Case và luồng hệ thống'
    style = ('body{font:16px/1.6 Arial,sans-serif;margin:0;background:#fff;color:#111}'
             'header,main{max-width:1600px;margin:auto;padding:24px}'
             'a{color:#222}nav{display:flex;flex-wrap:wrap;gap:12px}'
             'section{border:1px solid #aaa;margin:24px 0;padding:24px}'
             'figure{margin:16px 0}img{display:block;max-width:100%;height:auto;margin:auto}'
             'figcaption{text-align:center;font-weight:bold;margin-top:16px}'
             'a:focus-visible{outline:2px solid #333;outline-offset:4px}'
             '@media print{@page{size:A3 landscape;margin:12mm}header{display:none}'
             'section{break-after:page;border:0;margin:0;padding:0}img{max-height:65vh}'
             '.files{display:none}}')
    parts = [f'<!doctype html><html lang="vi"><head><meta charset="utf-8">'
             f'<meta name="viewport" content="width=device-width, initial-scale=1">'
             f'<title>{title}</title><style>{style}</style></head><body><header><h1>{title}</h1>'
             '<p>Sơ đồ thiết kế theo đặc tả/API; không phải minh chứng đã chạy production. '
             'Tông xám; luồng dài bố trí theo các cụm ngang. Mở SVG để phóng to hoặc chèn Word.</p>'
             f'<nav><a href="{prefix}README.md">Đối chiếu PDF và hướng dẫn thay hình</a>'
             f'<a href="{prefix}luong-use-case-studyflow.pdf">PDF các sơ đồ</a>'
             f'<a href="{prefix}index.html">Toàn bộ sơ đồ</a></nav></header><main>']
    for number, entry in enumerate(selected, 1):
        stem = entry['stem'].split('/')[-1] if chapter else entry['stem']
        safe_title = html.escape(entry['title'])
        parts.append(f'<section id="diagram-{number}"><h2>{number}. {safe_title}</h2>'
                     f'<p>{html.escape(entry["placement"])}</p>'
                     '<p>Hình dưới mô tả các tác nhân, bước xử lý và điểm kiểm soát của chức năng.</p>'
                     f'<figure><img src="{stem}.svg" alt="{safe_title}" loading="lazy">'
                     f'<figcaption>{safe_title}</figcaption></figure>'
                     f'<p>{html.escape(entry["explanation"])}</p>'
                     f'<p class="files"><a href="{stem}.svg">SVG</a> · '
                     f'<a href="{stem}.png">PNG</a> · <a href="{stem}.mmd">Nguồn Mermaid</a></p></section>')
    parts.append('</main></body></html>')
    target = ROOT / chapter / 'index.html' if chapter else ROOT / 'index.html'
    target.write_text('\n'.join(parts), encoding='utf-8')


def write_pdf(entries: list[Diagram]) -> None:
    """Export a landscape A3 reference booklet, one diagram per page.

    Args:
        entries: Required validated catalog, ordered as the booklet.
    Returns:
        None; replaces luong-use-case-studyflow.pdf, never the user's source PDF.
    Raises:
        FileNotFoundError: Arial font or PNG is missing.
        ValueError: Any explanatory text would overflow its page area.
        OSError: Output PDF cannot be written.
    """
    font = Path('C:/Windows/Fonts/arial.ttf')
    if not font.is_file():
        raise FileNotFoundError('Set font to an installed Vietnamese-capable TTF')
    doc = pymupdf.open()
    toc: list[list[int | str]] = []
    for number, entry in enumerate(entries, 1):
        page = doc.new_page(width=1191, height=842)
        page.insert_font(fontname='ArialReport', fontfile=str(font))
        blocks = [
            ((40, 20, 1151, 55), entry['title'], 18),
            ((40, 58, 1151, 108), entry['placement'] +
             ' Hình minh họa luồng thiết kế, không phải kết quả chạy thực tế.', 12),
            ((40, 692, 1151, 720), f'Sơ đồ {number:02}. ' + entry['title'], 13),
            ((40, 726, 1151, 798), entry['explanation'], 12),
            ((40, 810, 1151, 835), f'{number:02} / {len(entries)} | ' + entry['stem'] + '.svg', 9),
        ]
        for bounds, text, size in blocks:
            remaining = page.insert_textbox(pymupdf.Rect(bounds), text,
                                           fontname='ArialReport', fontsize=size, color=(0, 0, 0))
            if remaining < 0:
                raise ValueError(f'Text overflow: {entry["stem"]}')
        page.insert_image(pymupdf.Rect(40, 112, 1151, 682),
                          filename=str(ROOT / (entry['stem'] + '.png')), keep_proportion=True)
        toc.append([1, entry['title'], number])
    doc.set_toc(toc)
    doc.set_metadata({'title': 'StudyFlow - Use Case va luong he thong',
                      'subject': 'So do thiet ke doi chieu bao cao, tong xam, kho ngang'})
    doc.save(ROOT / 'luong-use-case-studyflow.pdf', garbage=4, deflate=True)
    doc.close()


def main() -> None:
    """Export validated catalog to galleries and booklet.

    Args:
        None; no CLI arguments or environment configuration files are used.
    Returns:
        None; prints artifact count and writes only documented generated outputs.
    Raises:
        ValueError/FileNotFoundError/OSError: Validation or export fails.
    """
    entries = read_catalog()
    write_gallery(entries)
    for chapter in ('chuong-1', 'chuong-2', 'chuong-3'):
        write_gallery(entries, chapter)
    write_pdf(entries)
    print(f'Exported {len(entries)} diagrams, 4 galleries and landscape PDF.')


if __name__ == '__main__':
    main()
