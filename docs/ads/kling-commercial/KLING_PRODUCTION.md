# Viselle 9:16 commercial — Kling production packet

Kling is not connected to this Cursor session, so this packet is what you drop into [klingai.com](https://klingai.com) (Kling 3.0 Omni / Elements) and stitch in CapCut.

**Master still (use this as the character bible):** `01-studio-wide-calm.png`

The close-ups in `02`–`04` drifted slightly. Crop Elements from **01**, not from 02–04.

**Official logo (do not regenerate):** `viselle-logo.png`

## Cast lock (paste into every prompt)

- **Esthetician:** late-20s woman, light-blonde hair in a low bun, cream spa tunic, gold hoops, calm.
- **Hairstylist:** Black woman, mid-20s, short dark hair, black apron over a light top, warm smile.
- **Tattoo artist:** large muscular man, early 30s, short dark hair, full beard, black fitted T-shirt, tattooed arms, black nitrile gloves.
- **Studio:** one open upscale shared suite, cream walls, oak, brass, big windows, three stations. Same room in every shot.

## Global negative prompt

```
morphing, face swap, identity change, character changing clothes, extra fingers, extra limbs, cartoon, anime, CGI, screenshot, phone UI, app interface, software, hologram, floating icons, spinning camera, warp transition, rewind, reverse footage, text overlay, watermark, logo, subtitles, fisheye, surreal
```

Settings for every clip: **9:16**, **1080p**, **Elements on**, duration as listed, **no weird transitions**.

---

## Elements (do this first)

1. Crop the esthetician, hairstylist, and tattoo artist from `01-studio-wide-calm.png`.
2. Create 3 Kling Elements. Name them `Esthetician`, `Hairstylist`, `TattooArtist`.
3. Attach all 3 Elements to every studio clip.

---

## Clips to generate

### Clip A — 5s — calm open  
**Image:** `01-studio-wide-calm.png`

```
Photoreal lifestyle commercial, handheld subtle. The esthetician gently performs a facial, the hairstylist works hair, the tattoo artist concentrates on a forearm tattoo. Slow natural motion only. Clients relaxed. No phones. No talking. Warm daylight.
```

### Clip B — 5s — esthetician  
**Image:** crop of esthetician from 01 (or `02` only if it matches 01)

```
Medium shot. Esthetician calmly applies product to a client on a treatment bed. Soft smile. Natural breathing. No phone. No dialogue.
```

### Clip C — 5s — hairstylist  
**Image:** crop from 01

```
Medium shot. Hairstylist styles a seated client's hair, chats quietly, professional and warm. No phone yet.
```

### Clip D — 5s — tattoo artist  
**Image:** crop from 01

```
Medium close-up. Muscular bearded tattoo artist in black T-shirt and gloves, focused, machine moving slowly on an adult client's arm. Quiet concentration.
```

### Clip E — 10s — chaos  
**Image:** `05-chaos.png`

```
Same people, same studio. One phone rings on a counter, then another. Hairstylist glances at a buzzing phone then keeps working. A walk-in customer enters and waits awkwardly. Esthetician looks annoyed at a vibrating phone. Tattoo artist hears a ring and frowns but keeps tattooing. Realistic distraction, not slapstick. Existing clients notice. No cartoon sounds described as visuals. Hard realistic documentary motion.
```

### Clip F — 5s — they give up  
**Image:** `05-chaos.png` (or a tighter crop)

```
Hairstylist sets down her tool and walks toward a ringing phone. Esthetician steps away from her client to check a phone. Tattoo artist stops, irritated, reaches for his phone. Clients look confused. Walk-ins at the door look awkward. Music-free still tension. Natural acting, not overacting.
```

### Clip G — 5s — freeze faces  
**Image:** `06-freeze-faces.png`

```
Almost still. Three-way split of the same three faces looking overwhelmed. Tiny natural eye flicker only, then full freeze. No morphing between panels.
```

Record VO separately (do not bake VO into Kling if it changes lips):  
“Hold up.” … “Let’s try this again… with Viselle.”

### Clip H — 5s — reset  
Hard cut to black in the edit (1 beat). Then image-to-video from `01-studio-wide-calm.png` again, same prompt as Clip A.

### Clip I — 8s — with Viselle  
**Image:** `01-studio-wide-calm.png`

```
Same studio, same three professionals, calm and uninterrupted. Esthetician stays with her facial. Hairstylist smiles and talks with her client while working. Tattoo artist never looks up from the tattoo. No ringing phones. Peaceful productive energy, still a busy premium studio, not empty.
```

### Clip J — 5s — sidewalk booking  
**Image:** `07-exterior-booking.png`

```
Woman on the sidewalk looks at the studio, then uses her phone to book. Natural, simple. Do not show any app UI or readable screen. Then a second passerby also checks a phone calmly.
```

### Clip K — 5s — back inside focused  
**Image:** `01-studio-wide-calm.png`

```
Close coverage of genuine relaxed client interactions. Professionals never reach for phones. Soft smiles, real eye contact.
```

VO on I–K:  
“With Viselle, your clients can book online while you stay focused on the person right in front of you.”  
“Less back-and-forth. Fewer interruptions. More time doing what you actually love.”

### Clip L — end card (edit, don’t generate the logo)

Use `08-endcard-navy.png` as the background. **Overlay `viselle-logo.png` centered. Do not ask Kling to redraw the logo.**

Text under the logo (CapCut, clean sans, small, white/gold):

- Scheduling that lets you focus on your clients.
- Start your 14-day free trial

VO:  
“Appointments handled. Clients happy. Business moving.”  
“That’s Viselle.”

Hold 3–4 seconds.

---

## Edit (CapCut)

| Time | Picture | Audio |
|------|---------|--------|
| 0:00–0:04 | A, B, C, D (quick hard cuts) | light upbeat bed |
| 0:04–0:10 | E | phones layer in, music continues |
| 0:10–0:14 | F | music thins |
| 0:14–0:17 | G freeze | music STOP, VO “Hold up…” |
| 0:17–0:19 | black 8–10 frames, then H | silence then music back |
| 0:19–0:27 | I, J, K | VO + calmer music |
| 0:27–0:34 | L logo | VO + hold |

Only hard cuts. No warp, no rewind.

## If you want me to press generate

Paste a Kling / Kie / fal.ai API key into the environment and I can submit these clips from here.
