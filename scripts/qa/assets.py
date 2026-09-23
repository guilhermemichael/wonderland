"""Read-only inventory and decode checks. Never rewrites approved media."""
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / '.qa' / 'release'
OUT.mkdir(parents=True, exist_ok=True)
ffmpeg = os.environ.get('FFMPEG')
if not ffmpeg:
    import imageio_ffmpeg
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()

names = ['threshold', 'fall', 'disorientation', 'landing', 'crossroads', 'rabbit', 'hatter', 'cheshire']
originals = [ROOT / ('FT1.JPEG' if i == 1 else f'FT{i}.jpeg') for i in range(1, 9)]
originals += [ROOT / f'VD{i}.mp4' for i in range(1, 6)]
files = originals + sorted((ROOT / 'public').rglob('*'))
records = []
for path in files:
    if not path.is_file():
        continue
    raw = path.read_bytes()
    assert not raw.startswith(b'version https://git-lfs.github.com/spec'), path
    row = {'file': path.relative_to(ROOT).as_posix(), 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}
    if path.suffix.lower() in ('.jpeg', '.jpg', '.png', '.webp', '.avif'):
        with Image.open(path) as im:
            row.update(width=im.width, height=im.height, format=im.format)
            im.load()
    elif path.suffix == '.mp4':
        p = subprocess.run([ffmpeg, '-hide_banner', '-i', str(path), '-f', 'null', '-'], capture_output=True, text=True)
        assert p.returncode == 0, (path, p.stderr)
        row['streams'] = [s.strip() for s in p.stderr.splitlines() if 'Stream #' in s and ('Video:' in s or 'Audio:' in s)]
        row['duration'] = re.search(r'Duration: ([\d:.]+)', p.stderr).group(1)
        row['decoded'] = True
    records.append(row)

manifest = json.loads((ROOT / 'lib/media-manifest.json').read_text())
public_names = {p.relative_to(ROOT / 'public').as_posix() for p in (ROOT / 'public').rglob('*') if p.is_file()}
for scene, plate in manifest['plates'].items():
    for prefix, widths in [('', plate['widths']), ('p', plate['portrait'])]:
        for width in widths:
            for ext in ['avif', 'webp', 'jpg']:
                assert f'media/plate-{scene}-{prefix}{width}.{ext}' in public_names
for video in manifest['videos'].values():
    assert video['src'].lstrip('/') in public_names
    assert (ROOT / 'public' / video['src'].lstrip('/')).stat().st_size == video['bytes']

report = {'original_mapping': dict(zip([p.name for p in originals[:8]], names)), 'manifest_paths_case_sensitive': 'PASS', 'records': records}
(OUT / 'assets.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps({'files_checked': len(records), 'web_bytes': sum(r['bytes'] for r in records if r['file'].startswith('public/')), 'originals': records[:13]}, indent=2))
