#!/usr/bin/env python3
"""Generates the alarm tunes in www/tunes/ (original synthesized sounds, 20 s each, 16 kHz mono).
iOS plays notification sounds up to 30 s, so every tune fits as a notification sound too."""
import math, struct, wave, os
SR = 16000
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'www', 'tunes')
os.makedirs(OUT, exist_ok=True)

def save(name, samples, secs=20):
    n = SR * secs
    buf = (samples * (n // len(samples) + 1))[:n] if secs else samples
    peak = max(1e-9, max(abs(x) for x in buf))
    w = wave.open(os.path.join(OUT, name + '.wav'), 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(b''.join(struct.pack('<h', int(32000 * x / peak)) for x in buf)); w.close()

def sil(d): return [0.0] * int(SR * d)
def tone(f, d, shape='sq', decay=0.0, vol=1.0, harm=None):
    n = int(SR * d); out = []
    for i in range(n):
        t = i / SR
        env = min(1, i / (SR * 0.008), (n - i) / (SR * 0.01)) * (math.exp(-decay * t) if decay else 1)
        if shape == 'sq': v = max(-1, min(1, 1.8 * math.sin(2 * math.pi * f * t)))
        elif shape == 'bell': v = sum(a * math.sin(2 * math.pi * f * m * t) for m, a in (harm or [(1, 1), (2.76, .4), (5.4, .2)]))
        else: v = math.sin(2 * math.pi * f * t)
        out.append(vol * env * v)
    return out
def sweep(f0, f1, d, vol=1.0):
    n = int(SR * d); out = []; ph = 0
    for i in range(n):
        f = f0 + (f1 - f0) * i / n; ph += 2 * math.pi * f / SR
        env = min(1, i / (SR * 0.01), (n - i) / (SR * 0.02))
        out.append(vol * env * max(-1, min(1, 1.4 * math.sin(ph))))
    return out
def cat(*parts): return [x for p in parts for x in p]

# 1 classic: triple beep + high note
save('classic', cat(*[cat(tone(988, .16), sil(.06), tone(1319, .16), sil(.06), tone(988, .16), sil(.06), tone(1568, .32), sil(.55))]))
# 2 chime: ding-dong bells
save('chime', cat(tone(784, 1.1, 'bell', 3.0), tone(622, 1.6, 'bell', 2.2), sil(.4)))
# 3 digital watch: 4 fast beeps
save('digital', cat(*([tone(2093, .07), sil(.07)] * 4), sil(.55)))
# 4 rising: upward sweeps getting louder over 4 cycles
save('rising', cat(*[cat(sweep(500, 1400, .9, .4 + .2 * k), sil(.25)) for k in range(4)]))
# 5 marimba: C-E-G-C arpeggio, soft mallet
mar = [(1, 1), (4, .25), (10, .05)]
save('marimba', cat(*[tone(f, .28, 'bell', 6, harm=mar) for f in (523, 659, 784, 1047)], tone(784, .28, 'bell', 6, harm=mar), tone(1047, .9, 'bell', 4, harm=mar), sil(.5)))
# 6 pulse: alternating two-tone pulses (like an alert radar)
save('pulse', cat(*([tone(1175, .12, 'sine'), sil(.05), tone(1480, .12, 'sine'), sil(.05)] * 3), sil(.6)))
# heads-up: one short soft chime (not looped)
save('headsup', cat(tone(880, .22, 'bell', 5), tone(1175, .5, 'bell', 4)), secs=0)
print('tunes written to', os.path.normpath(OUT))
