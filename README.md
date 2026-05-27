# Marinara Engine Coyote 3.0 Control v2

A [Marinara Engine](https://github.com/pasta-devs/marinara-engine) extension for controlling your **DG-LAB Coyote 3.0** e-stim device via Web Bluetooth.

## Features

- **XToys-style volume control** — Per-channel volume sliders (0-100%) scale all output proportionally
- **Waveform presets** — Gentle, Pulse, Wave, Intense, Tease
- **AI-driven control** — AI emits XML-style tags that trigger your device in real time
- **Live stats** — Target, current, and battery level displayed in real time
- **Web Bluetooth** — Direct browser-to-device, no extra server needed

## Installation

1. In Marinara Engine: **Admin** → **Extensions**
2. Paste the contents of `coyote3.js` into the **JavaScript** field
3. Paste the contents of `coyote3.css` into the **CSS** field
4. Save and enable the extension

## Setup

1. Make sure your Coyote 3.0 is powered on and nearby
2. Use **Chrome or Edge** (Web Bluetooth is not supported in Firefox/Safari)
3. The extension panel appears as a floating widget in the bottom-right corner
4. Click **Pair Device** and select `47L121000` from the Bluetooth picker
5. Set your **Volume** (start around 30%)
6. Toggle **Enable AI Control**

## How It Works

The extension sends B0 frames every 100ms to the device. Output is controlled by:

1. **Target intensity** (0-200) — set by AI commands or test buttons
2. **Volume** (0-100%) — scales the waveform slot intensities proportionally
3. **Waveform preset** — defines the pulse pattern

### Volume

Unlike a ceiling/threshold, volume is a true multiplier:

- Volume = 100%, target = 100 → device receives full 100
- Volume = 30%, target = 100 → device receives 30 (scaled proportionally)
- Volume = 0% → no output regardless of target

This matches XToys' behavior where you set a comfortable base level and the content modulates within that range.

## AI Commands

Add the prompt text from `docs/PROMPT.md` to your **character card** or **prompt preset** so the AI knows how to control the device.

```xml
<coyote3:a="50" time="5"/>     - Set Channel A to 50 for 5 seconds
<coyote3:b="30" time="3"/>     - Set Channel B to 30 for 3 seconds
<coyote3:stop/>                - Immediately stop both channels
<coyote3:clear channel="A"/>   - Clear Channel A
<coyote3:a="80" preset="intense" time="10"/> - Use "intense" waveform
```

## Manual Commands

You can also type commands directly into the **Manual Command** box in the extension panel. This is useful for testing.

## Protocol Notes

This implementation follows the [DG-LAB V3 Bluetooth Protocol](https://github.com/DG-LAB-OPENSOURCE/DG-LAB-OPENSOURCE/tree/main/coyote/v3) and the [DG-Kit](https://github.com/0xNullAI/DG-Kit) reference implementation.

Key points:
- Uses proper seq/ack handshake for B0 frames
- Slot intensities are 0-255 (device scales proportionally)
- intBal defaults to 0 (matching official DG-Kit)
- Volume scales waveform slots, not strength bytes

## Troubleshooting

- **"Web Bluetooth not supported"** — Use Chrome or Edge on desktop or Android. iOS does not support Web Bluetooth.
- **"Bluetooth failed"** — Make sure the device is on and not connected to another app.
- **No sensation** — Check volume is above 0%, check soft limits, and verify the device is paired.
- **AI not sending commands** — Make sure you included the prompt instructions in your character card or preset.

## License

MIT License. Use responsibly.
