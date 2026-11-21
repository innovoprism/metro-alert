#!/usr/bin/env python3
"""
Build www/data/transit.json from an RTA Dubai GTFS feed.

Usage:
    python3 scripts/build-transit.py path/to/gtfs_folder_or_zip

The GTFS feed is published by RTA (Dubai Pulse: "RTA Public Transports - GTFS").
Run this again with a newer feed to refresh the bus routes and stops.
Metro station renames (naming rights) are applied from STATION_RENAMES below;
add new renames there when RTA announces them.
"""
import csv, io, json, math, re, sys, zipfile, collections, datetime, os

# Feed name -> current official name (and old names kept for search)
STATION_RENAMES = {
    "centrepoint": ("Centrepoint", ["Al Rashidiya"]),
    "GGICO": ("Al Garhoud", ["GGICO"]),
    "max": ("Max", ["Al Jafiliya", "Max Fashion"]),
    "Umm Al Sheif": ("Equiti", ["Umm Al Sheif", "First Abu Dhabi Bank"]),
    "Al Safa": ("Garmin", ["ONPASSIVE", "Al Safa", "Noor Bank"]),
    "Mashreq": ("InsuranceMarket", ["Mashreq", "Sharaf DG (Red)"]),
    "Al Khail": ("Al Fardan Exchange", ["Al Khail", "Nakheel"]),
    "Sobha Realty": ("Sobha Realty", ["Dubai Marina", "DAMAC"]),
    "DMCC": ("DMCC", ["JLT", "Jumeirah Lakes Towers"]),
    "Jabal Ali": ("National Paints", ["Jebel Ali", "Jabal Ali", "Nakheel Harbour"]),
    "UAE Exchange": ("Life Pharmacy", ["UAE Exchange", "Jebel Ali (old)"]),
    "Etisalat": ("e&", ["Etisalat"]),
    "Union (Green Line)": ("Union", []),
    "Burj Khalifa/ Dubai Mall": ("Burj Khalifa/Dubai Mall", ["Dubai Mall"]),
    "Deira City Centre": ("City Centre Deira", ["Deira City Centre"]),
    "EXPO": ("Expo 2020", ["Expo City"]),
    "Abu Baker Al Siddique": ("Abu Baker Al Siddique", ["Abu Bakr"]),
    "BurJuman": ("BurJuman", ["Khalid Bin Al Waleed"]),
    "Dubai Airport Free Zone": ("Dubai Airport Free Zone", ["DAFZA"]),
    "Dubai Investment Park": ("Dubai Investment Park", ["DIP"]),
    "Jumeirah Golf Estates": ("Jumeirah Golf Estates", ["JGE"]),
}

def open_feed(path):
    if os.path.isdir(path):
        return lambda name: open(os.path.join(path, name), encoding="utf-8-sig", newline="")
    z = zipfile.ZipFile(path)
    names = {os.path.basename(n): n for n in z.namelist()}
    return lambda name: io.TextIOWrapper(z.open(names[name]), encoding="utf-8-sig", newline="")

def clean(s):
    return re.sub(r"\s+", " ", s).strip()

def metro_base(name):
    n = clean(name)
    n = re.sub(r"\s*Metro Station\s*\d*$", "", n, flags=re.I)
    n = re.sub(r"\(\s*Green Line\s*\)", "(Green Line)", n)
    return clean(n)

# --- polyline helpers -------------------------------------------------------
def simplify(pts, tol):
    if len(pts) < 3:
        return pts
    def perp(p, a, b):
        (y, x), (y1, x1), (y2, x2) = p, a, b
        k = math.cos(math.radians(y1))
        dx, dy = (x2 - x1) * k, y2 - y1
        if dx == dy == 0:
            return math.hypot((x - x1) * k, y - y1)
        t = max(0, min(1, (((x - x1) * k) * dx + (y - y1) * dy) / (dx * dx + dy * dy)))
        return math.hypot((x - x1) * k - t * dx, y - y1 - t * dy)
    keep = [False] * len(pts); keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        i, j = stack.pop()
        best, idx = 0, None
        for m in range(i + 1, j):
            d = perp(pts[m], pts[i], pts[j])
            if d > best:
                best, idx = d, m
        if idx is not None and best > tol:
            keep[idx] = True
            stack += [(i, idx), (idx, j)]
    return [p for p, k in zip(pts, keep) if k]

def encode(pts):
    out, plat, plng = [], 0, 0
    for lat, lng in pts:
        ilat, ilng = int(round(lat * 1e5)), int(round(lng * 1e5))
        for v in (ilat - plat, ilng - plng):
            v = ~(v << 1) if v < 0 else (v << 1)
            while v >= 0x20:
                out.append(chr((0x20 | (v & 0x1F)) + 63)); v >>= 5
            out.append(chr(v + 63))
        plat, plng = ilat, ilng
    return "".join(out)

def hms(t):
    try:
        h, m, x = t.split(":"); return int(h) * 3600 + int(m) * 60 + int(x)
    except Exception:
        return None

def median(v):
    v = sorted(v); n = len(v)
    return v[n // 2] if n % 2 else (v[n // 2 - 1] + v[n // 2]) / 2

def main(src, dst):
    rd = open_feed(src)
    routes = {r["route_id"]: r for r in csv.DictReader(rd("routes.txt"))}
    trips = {t["trip_id"]: t for t in csv.DictReader(rd("trips.txt"))}
    stops = {s["stop_id"]: s for s in csv.DictReader(rd("stops.txt"))}

    print("reading stop_times…", file=sys.stderr)
    seq = collections.defaultdict(list)
    for row in csv.DictReader(rd("stop_times.txt")):
        seq[row["trip_id"]].append((int(row["stop_sequence"]), row["stop_id"], hms(row["arrival_time"] or row["departure_time"])))

    patterns = collections.defaultdict(collections.Counter)
    seg_samples = collections.defaultdict(list)   # pattern -> list of per-trip segment durations

    def seg_times(key, n):
        """Median scheduled seconds between consecutive stops (includes dwell at the stop)."""
        sm = seg_samples.get(key) or []
        if not sm:
            return [0] * (n - 1)
        return [max(20, int(round(median([trip[k] for trip in sm])))) for k in range(n - 1)]
    for tid, lst in seq.items():
        t = trips.get(tid)
        if not t:
            continue
        lst.sort()
        key = (tuple(x[1] for x in lst), t["trip_headsign"], t["shape_id"])
        patterns[(t["route_id"], t["direction_id"])][key] += 1
        ts = [x[2] for x in lst]
        if None not in ts:
            seg_samples[key].append([b - a for a, b in zip(ts, ts[1:])])

    shapes = collections.defaultdict(list)
    for row in csv.DictReader(rd("shapes.txt")):
        shapes[row["shape_id"]].append((int(row["shape_pt_sequence"]), float(row["shape_pt_lat"]), float(row["shape_pt_lon"])))
    for k in shapes:
        shapes[k] = [(a, b) for _, a, b in sorted(shapes[k])]

    def top(route_id, direction):
        c = patterns.get((route_id, direction))
        return c.most_common(1)[0][0] if c else None

    # ---------------- Metro ----------------
    station_ids, stations = {}, []          # base name -> index
    def station(stop_id):
        base = metro_base(stops[stop_id]["stop_name"])
        name, aliases = STATION_RENAMES.get(base, (base, []))
        if name not in station_ids:
            station_ids[name] = len(stations)
            stations.append({"name": name, "aka": aliases, "pts": []})
        st = stations[station_ids[name]]
        st["pts"].append((float(stops[stop_id]["stop_lat"]), float(stops[stop_id]["stop_lon"])))
        return station_ids[name]

    by_short = {r["route_short_name"]: rid for rid, r in routes.items() if r["route_type"] == "1"}
    red_key = top(by_short["MRed"], "0"); red_seq, _, red_shape = red_key       # Centrepoint -> Expo 2020
    br_key = top(by_short["MBrch"], "0"); br_seq, _, br_shape = br_key         # Jebel Ali -> Life Pharmacy
    grn_key = top(by_short["MGrn"], "1"); grn_seq, _, grn_shape = grn_key      # Creek -> e&
    red_t = seg_times(red_key, len(red_seq)); br_t = seg_times(br_key, len(br_seq)); grn_t = seg_times(grn_key, len(grn_seq))

    red = [station(s) for s in red_seq]
    branch = [station(s) for s in br_seq]
    green = [station(s) for s in grn_seq][::-1]            # e& -> Creek (RTA's G11 -> G30 order)
    split = red.index(branch[0])
    red_lp = red[: split + 1] + branch[1:]

    red_pts = shapes[red_shape]
    br_pts = shapes[br_shape]
    # cut the red shape at the split station for the Life Pharmacy route
    sp = stations[branch[0]]["pts"][0]
    cut = min(range(len(red_pts)), key=lambda i: (red_pts[i][0] - sp[0]) ** 2 + (red_pts[i][1] - sp[1]) ** 2)

    TOL = 1.2e-4  # ~13 m
    metro = [
        {"id": "red-lp", "name": "Red Line", "to": "Life Pharmacy", "color": "#E4002B",
         "stops": red_lp, "secs": red_t[:split] + br_t, "shape": encode(simplify(red_pts[: cut + 1] + br_pts, TOL))},
        {"id": "red-expo", "name": "Red Line", "to": "Expo 2020", "color": "#E4002B",
         "stops": red, "secs": red_t, "shape": encode(simplify(red_pts, TOL))},
        {"id": "green", "name": "Green Line", "to": "Creek / e&", "color": "#00A651",
         "stops": green, "secs": grn_t[::-1], "shape": encode(simplify(shapes[grn_shape], TOL))},
    ]
    for st in stations:
        n = len(st["pts"])
        st["lat"] = round(sum(p[0] for p in st["pts"]) / n, 6)
        st["lng"] = round(sum(p[1] for p in st["pts"]) / n, 6)
        del st["pts"]
    for i, st in enumerate(stations):
        st["lines"] = sorted({m["name"] for m in metro if i in m["stops"]})

    # ---------------- Bus ----------------
    bus_stop_ids, bus_stops = {}, []
    def bstop(stop_id):
        if stop_id not in bus_stop_ids:
            s = stops[stop_id]
            bus_stop_ids[stop_id] = len(bus_stops)
            bus_stops.append([clean(s["stop_name"]), round(float(s["stop_lat"]), 6), round(float(s["stop_lon"]), 6)])
        return bus_stop_ids[stop_id]

    def route_key(n):
        m = re.match(r"([A-Za-z]*)(\d*)(.*)", n)
        return (m.group(1), int(m.group(2) or 0), m.group(3))

    buses = []
    for rid, r in routes.items():
        if r["route_type"] != "3":
            continue
        dirs = []
        for d in ("0", "1"):
            tp = top(rid, d)
            if not tp:
                continue
            sq, head, shp = tp
            dirs.append({"d": int(d), "to": clean(head) or clean(stops[sq[-1]]["stop_name"]),
                         "stops": [bstop(s) for s in sq],
                         "secs": seg_times(tp, len(sq)),
                         "shape": encode(simplify(shapes.get(shp, []), TOL)) if shp in shapes else ""})
        if dirs:
            buses.append({"n": r["route_short_name"], "name": clean(r["route_long_name"]), "dirs": dirs})
    buses.sort(key=lambda b: route_key(b["n"]))

    # which routes serve each stop (for the stop search)
    serves = collections.defaultdict(set)
    for b in buses:
        for d in b["dirs"]:
            for s in d["stops"]:
                serves[s].add(b["n"])
    for i, s in enumerate(bus_stops):
        s.append(sorted(serves[i], key=route_key))
    for sid, i in bus_stop_ids.items():
        bus_stops[i].append(sid)                     # [name, lat, lng, routes, gtfs stop_id]

    # ---------------- Metro headways (minutes between trains, by hour) ----------------
    # wd = weekdays (Mon-Fri), we = weekend (Sat-Sun); used to estimate the wait on the platform.
    cal = {c["service_id"]: c for c in csv.DictReader(rd("calendar.txt"))}
    first_dep = collections.defaultdict(list)
    for tid, lst in seq.items():
        t = trips.get(tid)
        if not t or t["route_id"] not in (by_short["MRed"], by_short["MGrn"]) or lst[0][2] is None:
            continue
        c = cal.get(t["service_id"]) or {}
        line = "Red" if t["route_id"] == by_short["MRed"] else "Green"
        if c.get("monday") == "1":
            first_dep[(line, "wd", t["direction_id"])].append(lst[0][2] // 60)
        if c.get("saturday") == "1":
            first_dep[(line, "we", t["direction_id"])].append(lst[0][2] // 60)
    headways = {}
    for line in ("Red", "Green"):
        headways[line] = {}
        for dt in ("wd", "we"):
            gaps = collections.defaultdict(list)
            for d in ("0", "1"):
                v = sorted(set(first_dep[(line, dt, d)]))
                for a, b in zip(v, v[1:]):
                    if 0 < b - a <= 30:
                        gaps[(a // 60) % 24].append(b - a)
            headways[line][dt] = [round(median(gaps[h]), 1) if gaps[h] else None for h in range(24)]

    feed_dates = ""
    try:
        cal = list(csv.DictReader(rd("calendar.txt")))
        feed_dates = min(c["start_date"] for c in cal)
    except Exception:
        pass

    out = {
        "generated": datetime.date.today().isoformat(),
        "busFeedDate": feed_dates,
        "source": "RTA Dubai GTFS",
        "stations": stations,
        "metro": metro,
        "headways": headways,
        "busStops": bus_stops,
        "bus": buses,
    }
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    with open(dst, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print(f"stations={len(stations)} metro_lines={len(metro)} bus_routes={len(buses)} bus_stops={len(bus_stops)} "
          f"size={os.path.getsize(dst)//1024} KB -> {dst}", file=sys.stderr)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__); sys.exit(1)
    here = os.path.dirname(os.path.abspath(__file__))
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else os.path.join(here, "..", "www", "data", "transit.json"))
