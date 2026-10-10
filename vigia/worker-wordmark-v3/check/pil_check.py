# usage: python3 -I pil_check.py file1.png file2.png ...   -> JSON lines (decodes fully with PIL, strict)
import sys, json
from PIL import Image
import numpy as np
res = []
for p in sys.argv[1:]:
    try:
        im = Image.open(p); im.verify()          # structural/CRC check
        im = Image.open(p); im.load()            # full decode
        a = np.array(im.convert("RGBA"))
        bg = a[0, 0, :3].astype(int)
        ink = (np.abs(a[:, :, :3].astype(int) - bg).sum(axis=2) > 24)
        ys, xs = np.where(ink)
        bbox = [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1] if len(xs) else None
        res.append(dict(file=p, ok=True, size=im.size, mode=im.mode, fmt=im.format, interlace=im.info.get("interlace", 0),
                        alpha_min=int(a[:, :, 3].min()), ink_frac=round(float(ink.mean()), 4), bbox=bbox, corner=[int(x) for x in a[0, 0]]))
    except Exception as e:
        res.append(dict(file=p, ok=False, error=repr(e)))
print(json.dumps(res))
