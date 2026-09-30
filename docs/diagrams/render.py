"""Render only chapter diagram sources, without reading application files or .env.

CLI: python docs/diagrams/render.py [--only relative/stem] [--check]
Requires Node/npm, PyMuPDF and a browser configured in puppeteer-config.json.
Outputs sibling SVG/PNG files; no application dependency is changed.
Exit 0 on success; nonzero on invalid source, unavailable renderer or colored PNG.
Retries: none. Re-running replaces only generated diagram artifacts.
"""

from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor
import os
from pathlib import Path
import shutil
import subprocess

ROOT = Path(__file__).resolve().parent


def render(source: Path) -> str:
    """Render an existing chapter Mermaid source to SVG and PNG.

    Args:
        source: Required source inside a chuong-* directory; no user data.
    Returns:
        Relative source path; writes only its SVG/PNG siblings. PNG is normalized
        to grayscale to remove browser subpixel color fringes from black text.
    Raises:
        RuntimeError: npm missing or Mermaid/browser fails; caller must stop.
    """
    npm = shutil.which('npm.cmd') or shutil.which('npm')
    if not npm:
        raise RuntimeError('Node/npm is required')
    env = {**os.environ, 'PUPPETEER_SKIP_DOWNLOAD': 'true'}
    for extension in ('svg', 'png'):
        command = [npm, 'exec', '--yes', '--package', '@mermaid-js/mermaid-cli@12.0.0',
                   '--', 'mmdc', '-i', str(source), '-o', str(source.with_suffix('.' + extension)),
                   '-c', str(ROOT / 'mermaid-gray.json'),
                   '-p', str(ROOT / 'puppeteer-config.json'), '-b', 'white',
                   '-w', '2400', '-s', '2']
        result = subprocess.run(command, env=env, capture_output=True, text=True,
                                encoding='utf-8', errors='replace', timeout=120)
        if result.returncode:
            raise RuntimeError(f'{source.name}: {result.stderr[-4000:]}')
        if extension == 'png':
            import pymupdf

            target = source.with_suffix('.png')
            rgb = pymupdf.Pixmap(str(target))
            pymupdf.Pixmap(pymupdf.csGRAY, rgb).save(str(target))
    return str(source.relative_to(ROOT))


def check(source: Path) -> None:
    """Validate sibling outputs and grayscale pixels (requires PyMuPDF).

    Args:
        source: Required chapter source to check; no app files are read.
    Returns:
        None; no files are written.
    Raises:
        AssertionError: Empty/missing outputs or non-gray rendered pixel.
        ImportError: PyMuPDF is unavailable; install as a tooling-only dependency.
    """
    import pymupdf

    for ext in ('svg', 'png'):
        assert source.with_suffix('.' + ext).stat().st_size > 100, source
    pix = pymupdf.Pixmap(str(source.with_suffix('.png')))
    assert pix.n in (1, 3), (source, pix.n)
    if pix.n == 3:
        data = pix.samples
        assert data[0::3] == data[1::3] == data[2::3], f'Non-gray pixels: {source}'


def main() -> None:
    """Parse CLI args and render or validate chapter artifacts.

    Args:
        None; optional --only chapter/stem narrows scope; --check skips rendering.
    Returns:
        None; prints completed sources; render mode replaces SVG/PNG siblings.
    Raises:
        ValueError: Requested source is outside the explicit chapter allowlist.
        RuntimeError/AssertionError: Render or validation failed; nonzero exit.
    """
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--only')
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    sources = sorted(p for chapter in ('chuong-1', 'chuong-2', 'chuong-3')
                     for p in (ROOT / chapter).glob('*.mmd'))
    if args.only:
        selected = (ROOT / (args.only + '.mmd')).resolve()
        if selected not in sources:
            raise ValueError('Source must be an existing chapter diagram')
        sources = [selected]
    if args.check:
        for source in sources:
            check(source)
            print('PASS', source.relative_to(ROOT), flush=True)
    else:
        with ThreadPoolExecutor(max_workers=3) as pool:
            for result in pool.map(render, sources):
                print('RENDERED', result, flush=True)


if __name__ == '__main__':
    main()
