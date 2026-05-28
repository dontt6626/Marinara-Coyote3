# Marinara Engine Coyote 3.0 Control v2

> [!CAUTION]
> **SAFETY & LIABILITY NOTICE**
> This software controls an electrical muscle stimulation (e-stim) device. Improper use can cause burns, nerve damage, cardiac interference, or other serious personal injury. By downloading, installing, or using this software, you acknowledge that you do so entirely at your own risk. The authors and contributors of this project accept **no liability** for any misuse, malfunction, injury, or damages arising from the use of this software. You are solely responsible for understanding your device's safe operating limits, your own health conditions, and applicable laws in your jurisdiction. If you do not agree to assume full responsibility for your own safety, do not use this software.

Control your **DG-LAB Coyote 3.0** e-stim device directly from [Marinara Engine](https://github.com/pasta-devs/marinara-engine) via Web Bluetooth. AI characters can trigger your device in real time using simple XML-style tags.

---

## Quick Start

1. **Install** the extension in Marinara (paste JS + CSS in Admin → Extensions)
2. **Pair** your Coyote 3.0 (click "Pair Device" — it looks for `47L121000`)
3. **Paste** the AI prompt instructions into your character card or prompt preset
4. **Chat** — the AI will now automatically embed device commands in responses

See the detailed steps below.

---

## What This Does

- **XToys-style volume** — Per-channel sliders (0-100%) scale all output like a real volume knob
- **Waveform presets** — Gentle, Pulse, Wave, Intense, Tease
- **AI-driven control** — AI emits `<coyote3:a="50" time="5"/>` tags that trigger your device
- **Live stats** — Current intensity, battery, active waveform shown in real time
- **Zero server** — Direct browser-to-device Bluetooth. Nothing leaves your machine.

---

## Installation

### 1. Open the Extensions Panel

In Marinara Engine, go to **Admin** (gear icon) → **Extensions**.

### 2. Paste the Code

| Field | What to paste |
|-------|---------------|
| **Name** | `Coyote 3.0 Control v2` |
| **Description** | `DG-LAB Coyote 3.0 Bluetooth control` |
| **JavaScript** | Copy the entire contents of `coyote3.js` |
| **CSS** | Copy the entire contents of `coyote3.css` |

### 3. Save and Enable

Click **Save**, then toggle the extension **On**.

A floating panel will appear in the bottom-right corner of every Marinara page.

---

## Device Setup

### 1. Power On Your Device

Make sure your Coyote 3.0 is on and nearby (within ~3 meters).

### 2. Use Chrome or Edge

Web Bluetooth is **not supported** in Firefox or Safari. Use Chromium-based browser on desktop or Android.

### 3. Pair

In the floating panel, click **Pair Device**. When the Bluetooth picker opens, select the device starting with `47` (e.g. `47L121000`).

### 4. Set Volume

Start around **30%** on both channels. This is your master scaling factor — the AI can still request up to 200 intensity, but it will be scaled down by your volume.

### 5. Enable AI Control

Toggle **Enable AI Control** in the panel. The extension is now actively polling chat messages for commands.

---

## CRITICAL: Teach the AI About the Device

**The AI does not automatically know this extension exists.** You must paste instructions into one of these locations so the AI learns how to control your device:

### Option A — Character Card (Recommended)

Best if you want this specific character to control the device.

1. Open your character in Marinara
2. Find the **System Prompt** or **Creator's Notes** field
3. Paste the prompt text from `docs/PROMPT.md`
4. Save the character

### Option B — Prompt Preset

Best if you want **every** character in a chat to control the device.

1. Go to **Settings** → **Presets**
2. Edit your active preset
3. Paste the prompt text into the **System Prompt** section
4. Save the preset

### Option C — Lorebook

Best if you want the device to activate conditionally (e.g. only during certain scenes).

1. Go to **Lorebooks**
2. Create or edit a lorebook
3. Add an entry with a trigger keyword (e.g. `coyote` or `device`)
4. Paste the prompt text into the entry content
5. Attach the lorebook to your chat

> **Which one should I pick?** If you only want one character to control it, use Option A. If you want all characters to control it, use Option B.

---

## How Volume Works

Unlike a ceiling/threshold, volume is a true multiplier:

| Volume | Target | Actual Output |
|--------|--------|---------------|
| 100%   | 100    | 100 (full)    |
| 50%    | 100    | 50 (half)     |
| 30%    | 100    | 30 (gentle)   |
| 0%     | 100    | 0 (silent)    |

This matches XToys behavior: set a comfortable base level, then let the content modulate within that range.

---

## AI Commands

Once the prompt is installed, the AI can use these commands naturally in responses:

```xml
<coyote3:a="50" time="5"/>                 - Channel A to 50 for 5 seconds
<coyote3:b="30" time="3"/>                 - Channel B to 30 for 3 seconds
<coyote3:stop/>                             - Stop everything immediately
<coyote3:clear channel="A"/>                - Zero out Channel A
<coyote3:a="80" preset="intense" time="10"/> - Use "intense" waveform
```

Available presets: `gentle`, `pulse`, `wave`, `intense`, `tease`

---

## Manual Controls

The floating panel lets you test the device directly:

- **Test buttons** — Instantly set Channel A or B to 25 / 50 / 100 / MAX
- **Stop All** — Cuts output to zero immediately (no ramp down)
- **Manual Command** — Type a command like `<coyote3:a="50" time="5"/>` and click Send
- **Volume sliders** — Live adjustment of both channels
- **Waveform selectors** — Change pattern on the fly
- **Soft limits** — Safety caps (0-200) per channel

---

## Protocol Notes

This follows the [DG-LAB V3 Bluetooth Protocol](https://github.com/DG-LAB-OPENSOURCE/DG-LAB-OPENSOURCE/tree/main/coyote/v3) and [DG-Kit](https://github.com/0xNullAI/DG-Kit) reference:

- Proper seq/ack handshake for B0 frames
- Slot intensities 0-255 (device scales proportionally)
- intBal defaults to 0
- 100ms packet interval

---

## Troubleshooting

### "AI is not sending any commands"

**This is the most common issue.** The AI only knows about the device if you pasted the prompt instructions. See [CRITICAL: Teach the AI About the Device](#critical-teach-the-ai-about-the-device) above.

Double-check:
- The prompt text from `docs/PROMPT.md` is actually in your character card, preset, or lorebook
- You're using the same character/preset that has the prompt
- The extension panel shows **Paired** and **Enable AI Control** is toggled on

### "Web Bluetooth not supported"

Use **Chrome** or **Edge** on desktop or Android. Firefox, Safari, and iOS do not support Web Bluetooth.

### "Bluetooth failed" or "Device not found"

- Make sure the Coyote 3.0 is powered on (blue LED flashing)
- Make sure it's not already connected to the DG-LAB app on your phone
- Move the device closer to your computer
- Try refreshing the Marinara page and pairing again

### "Paired but I feel nothing"

1. Check **Volume** is above 0% in the panel
2. Check **Soft Limits** are above 0
3. Click a **test button** (e.g. Channel A = 100). If you feel nothing here, the device itself isn't outputting.
4. Make sure the physical power mode on the device is set to Bluetooth (not wired/DG-LAB app mode)
5. Try the **Manual Command** box: type `<coyote3:a="100" time="5"/>` and click Send

### "Commands feel delayed"

The extension polls chat messages every **2 seconds**. There will always be a small delay between the AI sending a message and the device reacting. This is normal.

### "Volume doesn't seem to do anything"

Volume scales the **waveform slot intensities**, not the raw strength bytes. If your waveform preset has very low slot values, the effect may be subtle. Try switching to **Intense** preset and testing again.

---

## License

MIT License. Use responsibly.
