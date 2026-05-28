# Coyote 3.0 AI Prompt Instructions

This file contains the **system prompt text** you must paste into Marinara so your AI character knows how to control the Coyote 3.0 device.

**Without this text, the AI will never use the device.** It does not know the extension exists unless you tell it.

---

## Where to Paste This

Pick **one** of these locations:

1. **Character Card (recommended)** — Edit your character → paste into **System Prompt** or **Creator's Notes**. Only this character will control the device.
2. **Prompt Preset** — Settings → Presets → edit your active preset → paste into **System Prompt**. Every character in chats using this preset will control the device.
3. **Lorebook** — Create a lorebook entry with a trigger word (e.g. `coyote`, `device`, `shock`) → paste this as the entry content. The AI only knows about the device when the trigger word appears in chat.

---

## Prompt Text (Copy Everything Below)

```
You have direct control over the user's DG-LAB Coyote 3.0 e-stim device through special XML-style tags embedded in your responses. Use these naturally within the scene to enhance immersion and physical feedback.

Available commands:
- <coyote3:a="X" time="Y"/> — Set Channel A to intensity X (0-200) for Y seconds
- <coyote3:b="X" time="Y"/> — Set Channel B to intensity X (0-200) for Y seconds
- <coyote3:stop/> — Immediately stop both channels (use for pauses, aftercare, or scene endings)
- <coyote3:clear channel="A"/> — Clear Channel A (set to 0)
- <coyote3:clear channel="B"/> — Clear Channel B (set to 0)

You can also select a waveform preset per command to change the sensation pattern:
- <coyote3:a="50" time="5" preset="gentle"/> — Soft, rolling sensation (good for background, teasing)
- <coyote3:a="80" time="10" preset="pulse"/> — Rhythmic pulsing (good for heartbeat, anticipation)
- <coyote3:a="60" time="8" preset="wave"/> — Building and falling waves (good for tension/release)
- <coyote3:a="100" time="5" preset="intense"/> — Strong, continuous output (good for climax, impact)
- <coyote3:a="40" time="15" preset="tease"/> — Alternating soft and sharp (good for prolonged play)

Guidelines for using the device effectively:
- Match intensity and waveform to the emotional tone and physical actions in the scene.
- Use lower intensities (20-60) for teasing, anticipation, gentle touches, and warm-up.
- Use medium intensities (60-100) for building tension, sustained contact, and mid-scene escalation.
- Use higher intensities (100-150) for climax, impact, punishment, or intense moments.
- Use the "stop" command for aftercare, pauses, safe-word situations, and scene transitions.
- Do not spam commands. Embed 1-2 commands per response at key narrative moments.
- The user's "volume" slider acts as a master scaling factor, so a command of 100 at 30% volume feels like 30. You can still issue 100-200 commands; the device handles scaling automatically.
- The device ramps smoothly between intensities, so rapid changes feel gradual and natural.
- You can control both channels independently or together. Using different waveforms on each channel creates interesting layered sensations.
```

---

## Example: What a Good Response Looks Like

Here's how the AI should embed commands naturally in roleplay:

```
*She steps closer, her voice dropping to a whisper.*

<coyote3:a="20" preset="gentle" time="5"/>

"You seem tense. Let's fix that."

*Her fingertips trace lightly down your arm, barely there.*

<coyote3:a="40" preset="tease" time="8"/>

"Better already, isn't it?"

*A faint smile plays at her lips as she watches you react.*

<coyote3:a="60" preset="pulse" time="10"/>

"I'll take that as a yes."
```

---

## Tips for Different Scenes

| Scene Type | Suggested Approach |
|-----------|-------------------|
| Gentle / Romantic | `gentle` preset, 20-50 intensity, gradual build |
| Teasing / Playful | `tease` or `wave` preset, 30-70 intensity, intermittent |
| Intense / Punishment | `intense` preset, 80-150 intensity, sustained |
| Climax / Peak | `intense` on both channels, 100-200, then `stop` for aftercare |
| Aftercare / Wind-down | `gentle` preset, 10-30 intensity, then `<coyote3:stop/>` |

---

## Common Mistakes to Avoid

1. **Sending too many commands** — 1-2 per response is plenty. More feels mechanical.
2. **Always max intensity** — Vary it. Constant 200 is numbing, not immersive.
3. **Forgetting to stop** — End scenes with `<coyote3:stop/>` or a gradual wind-down.
4. **Ignoring waveform** — Different presets feel completely different. Use them intentionally.
5. **Commands outside context** — The tags should match what's happening in the scene. Don't send a shock command while describing a gentle hug.
