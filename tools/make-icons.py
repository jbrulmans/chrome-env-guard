#!/usr/bin/env python3
"""Generate the extension icons.

The icon mirrors what the extension draws on a page: a thick coloured frame
around a dark interior. No third-party dependencies - PNGs are written by
hand, anti-aliased by supersampling.

Usage:  python3 tools/make-icons.py [--frame '#dc2626'] [--fill '#17181d']
"""

import argparse
import os
import struct
import zlib

SIZES = (16, 32, 48, 128)
SUPERSAMPLE = 4
OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "icons")


def parse_hex(value):
    h = value.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    if len(h) != 6:
        raise ValueError("expected a 3- or 6-digit hex colour, got %r" % value)
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def rounded_rect_distance(px, py, half_w, half_h, radius):
    """Signed distance to a rounded rectangle centred on the origin."""
    dx = abs(px) - (half_w - radius)
    dy = abs(py) - (half_h - radius)
    outside = (max(dx, 0.0) ** 2 + max(dy, 0.0) ** 2) ** 0.5
    inside = min(max(dx, dy), 0.0)
    return outside + inside - radius


def render(size, frame_rgb, fill_rgb):
    """Return RGBA rows for one icon, premultiplied averaging over subsamples."""
    centre = size / 2.0
    outer_half = size / 2.0
    outer_radius = size * 0.24
    inset = size * 0.22
    inner_half = outer_half - inset
    inner_radius = max(outer_radius - inset, size * 0.06)

    step = 1.0 / SUPERSAMPLE
    samples = SUPERSAMPLE * SUPERSAMPLE
    rows = []

    for y in range(size):
        row = bytearray()
        for x in range(size):
            r_acc = g_acc = b_acc = a_acc = 0
            for sy in range(SUPERSAMPLE):
                py = y + (sy + 0.5) * step - centre
                for sx in range(SUPERSAMPLE):
                    px = x + (sx + 0.5) * step - centre
                    if rounded_rect_distance(px, py, outer_half, outer_half, outer_radius) > 0:
                        continue
                    if rounded_rect_distance(px, py, inner_half, inner_half, inner_radius) <= 0:
                        colour = fill_rgb
                    else:
                        colour = frame_rgb
                    r_acc += colour[0]
                    g_acc += colour[1]
                    b_acc += colour[2]
                    a_acc += 255
            if a_acc == 0:
                row += b"\x00\x00\x00\x00"
                continue
            # Un-premultiply: average colour over covered subsamples only.
            covered = a_acc // 255
            row += bytes((
                round(r_acc / covered),
                round(g_acc / covered),
                round(b_acc / covered),
                round(a_acc / samples),
            ))
        rows.append(bytes(row))
    return rows


def write_png(path, size, rows):
    raw = b"".join(b"\x00" + row for row in rows)

    def chunk(tag, payload):
        body = tag + payload
        return struct.pack(">I", len(payload)) + body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(raw, 9))
    png += chunk(b"IEND", b"")

    with open(path, "wb") as handle:
        handle.write(png)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--frame", default="#dc2626", help="frame colour (default: %(default)s)")
    parser.add_argument("--fill", default="#17181d", help="interior colour (default: %(default)s)")
    args = parser.parse_args()

    frame_rgb = parse_hex(args.frame)
    fill_rgb = parse_hex(args.fill)

    os.makedirs(OUT_DIR, exist_ok=True)
    for size in SIZES:
        path = os.path.join(OUT_DIR, "icon%d.png" % size)
        write_png(path, size, render(size, frame_rgb, fill_rgb))
        print("wrote %s" % os.path.relpath(path, os.path.dirname(OUT_DIR)))


if __name__ == "__main__":
    main()
