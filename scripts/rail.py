#!/usr/bin/env python3
"""Etihad Rail passenger stations + timetable -> www/data/rail.json
Timetable as published (Khaleej Times travel guide, Oct 2026; Dubai-Abu Dhabi 64 min).
Coordinates are approximate (within ~1 km). Edit TRIPS when Etihad Rail changes the timetable."""
import json, os
STATIONS = {   # key: (name, lat, lng, aka)
    'F': ('Fujairah (Etihad Rail)', 25.1955, 56.3165, ['Fujairah Station', 'Al Hilal City']),
    'D': ('Al Dhaid (Etihad Rail)', 25.2878, 55.8806, ['Al Dhaid Station', 'Sharjah rail']),
    'Y': ('Dubai Al Yalayis (Etihad Rail)', 25.0148, 55.1660, ['Al Yalayis', 'Etihad Rail Dubai', 'Etihad station']),
    'A': ('Abu Dhabi MBZ City (Etihad Rail)', 24.3393, 54.5427, ['Mohamed bin Zayed City', 'MBZ', 'Etihad Rail Abu Dhabi']),
}
ORDER = ['F', 'D', 'Y', 'A']
def hm(s): h, m = s.split(':'); return int(h) * 60 + int(m)
def trip(days, *stops):   # stops: (key, arrive, depart) as 'HH:MM' or None
    return {'days': days, 'stops': [[k, hm(a) if a else None, hm(d) if d else None] for k, a, d in stops]}
T = []
for t, days in [(x, 'wd') for x in ['6:14', '7:14', '17:14', '18:14']] + [(x, 'we') for x in ['7:14', '8:14', '13:43', '17:14', '18:14']]:
    a = hm(t) + 64; T.append(trip(days, ('Y', None, t), ('A', f'{a//60}:{a%60:02d}', None)))
for t, days in [(x, 'wd') for x in ['6:43', '7:43', '16:43', '17:43']] + [(x, 'we') for x in ['7:43', '8:43', '12:14', '16:43', '17:43', '18:43']]:
    a = hm(t) + 64; T.append(trip(days, ('A', None, t), ('Y', f'{a//60}:{a%60:02d}', None)))
for days in ('wd', 'we'):
    # Abu Dhabi 12:43 -> Dubai -> Al Dhaid -> Fujairah
    T.append(trip(days, ('A', None, '12:43'), ('Y', '13:47', '13:57'), ('D', '14:40', '14:42'), ('F', '15:07', None)))
    # Fujairah 11:54 -> Al Dhaid -> Dubai -> Abu Dhabi
    T.append(trip(days, ('F', None, '11:54'), ('D', '12:19', '12:21'), ('Y', '13:06', '13:14'), ('A', '14:18', None)))
    # Abu Dhabi <-> Al Dhaid <-> Fujairah (direct, not via Dubai)
    T.append(trip(days, ('A', None, '8:15'), ('D', '9:39', '9:41'), ('F', '10:06', None)))
    T.append(trip(days, ('A', None, '18:25'), ('D', '19:49', '19:51'), ('F', '20:16', None)))
    T.append(trip(days, ('F', None, '6:05'), ('D', '6:30', '6:32'), ('A', '7:50', None)))
    T.append(trip(days, ('F', None, '17:17'), ('D', '17:42', '17:44'), ('A', '19:02', None)))
out = {'source': 'Etihad Rail timetable (Oct 2026)', 'color': '#8A6D3B', 'order': ORDER,
       'stations': {k: {'name': n, 'lat': la, 'lng': lo, 'aka': aka} for k, (n, la, lo, aka) in STATIONS.items()},
       'secs': [1500, 2700, 3840], 'trips': T}
p = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'www', 'data', 'rail.json')
json.dump(out, open(p, 'w'), separators=(',', ':'))
print(len(T), 'trips ->', p)
