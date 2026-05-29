// Marinara Engine Extension: Coyote 3.0 Control v2
// Self-contained ES module using marinara.* APIs

const MODULE_KEY = 'marinara-coyote3-settings';

// --- DG-LAB V3 Bluetooth UUIDs ---
const BT_SERVICE_UUID = '0000180c-0000-1000-8000-00805f9b34fb';
const BT_WRITE_UUID   = '0000150a-0000-1000-8000-00805f9b34fb';
const BT_NOTIFY_UUID  = '0000150b-0000-1000-8000-00805f9b34fb';
const BT_BATTERY_SVC  = '0000180a-0000-1000-8000-00805f9b34fb';
const BT_BATTERY_CHAR = '00001500-0000-1000-8000-00805f9b34fb';
const BT_DEVICE_PREFIX = '47';

// --- Mode constants ---
const MODE_NO_CHANGE = 0;
const MODE_REL_INC   = 1;
const MODE_REL_DEC   = 2;
const MODE_ABSOLUTE  = 3;

// --- Waveform presets ---
const PRESETS = {
    gentle: [
        '0A0A0A0A00000000',
        '0A0A0A0A14141414',
        '0A0A0A0A28282828',
        '0A0A0A0A3C3C3C3C',
        '0A0A0A0A50505050',
        '0A0A0A0A3C3C3C3C',
        '0A0A0A0A28282828',
        '0A0A0A0A14141414',
    ],
    pulse: [
        '50505050FFFFFFFF',
        '50505050FFFFFFFF',
        '5050505000000000',
        '5050505000000000',
        '50505050FFFFFFFF',
        '50505050FFFFFFFF',
        '5050505000000000',
        '5050505000000000',
    ],
    wave: [
        '0A0A0A0A1E1E1E1E',
        '0A0A0A0A32323232',
        '0A0A0A0A46464646',
        '0A0A0A0A5A5A5A5A',
        '0A0A0A0A6E6E6E6E',
        '0A0A0A0A5A5A5A5A',
        '0A0A0A0A46464646',
        '0A0A0A0A32323232',
    ],
    intense: [
        '50505050FFFFFFFF',
        '50505050FFFFFFFF',
        '50505050FFFFFFFF',
        '50505050FFFFFFFF',
        '50505050FFFFFFFF',
        '50505050FFFFFFFF',
        '50505050FFFFFFFF',
        '50505050FFFFFFFF',
    ],
    tease: [
        '282828281E1E1E1E',
        '282828283C3C3C3C',
        '282828280A0A0A0A',
        '2828282850505050',
        '282828280A0A0A0A',
        '282828283C3C3C3C',
        '282828281E1E1E1E',
        '282828280A0A0A0A',
    ],
};

const defaultSettings = {
    enabled: false,
    connected: false,
    paired: false,
    volumeA: 100,
    volumeB: 100,
    limitA: 200,
    limitB: 200,
    freqBalA: 160,
    freqBalB: 160,
    intBalA: 0,
    intBalB: 0,
    waveformA: 'gentle',
    waveformB: 'gentle',
    guidelines: 'Match intensity to context. Use commands that fit the scene naturally.',
};

// --- State ---
let btDevice = null;
let btServer = null;
let btWriteChar = null;
let btNotifyChar = null;
let btBatteryChar = null;
let b0Timer = null;
let bluetoothConnected = false;
let seq = 0;
let pendingMode = 0;
let awaitingAck = false;
let targetA = 0;
let targetB = 0;
let currentA = 0;
let currentB = 0;
let batteryLevel = null;
let rampCurrentA = 0;
let rampCurrentB = 0;
let rampTimer = null;
const RAMP_STEP = 2;
let activePresetA = null;
let activePresetB = null;
let messageCommands = [];
let executedCommands = new Set();
let loopTimer = null;
let isLooping = false;
let streamingText = '';

// --- Chat polling state ---
let pollTimer = null;
let lastMessageId = null;
let chatId = null;

// --- Marinara API wrappers ---
const M = typeof marinara !== 'undefined' ? marinara : null;
function mSetInterval(fn, ms) { return M ? M.setInterval(fn, ms) : setInterval(fn, ms); }
function mSetTimeout(fn, ms) { return M ? M.setTimeout(fn, ms) : setTimeout(fn, ms); }
function mClearInterval(id) { if (M && M.clearInterval) M.clearInterval(id); else clearInterval(id); }
function mClearTimeout(id) { if (M && M.clearTimeout) M.clearTimeout(id); else clearTimeout(id); }
function mOnCleanup(fn) { if (M && M.onCleanup) M.onCleanup(fn); }
function mApiFetch(path, opts) { return M ? M.apiFetch(path, opts) : fetch(path, opts); }

// --- Helpers ---
function hexToBytes(hex) {
    const bytes = [];
    for (let i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    return bytes;
}

function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

function loadSettings() {
    try {
        const raw = localStorage.getItem(MODULE_KEY);
        if (raw) return { ...defaultSettings, ...JSON.parse(raw) };
    } catch (e) {
        console.error('[Coyote3] loadSettings error:', e);
    }
    return { ...defaultSettings };
}

function saveSettings(s) {
    try {
        localStorage.setItem(MODULE_KEY, JSON.stringify(s));
    } catch (e) {
        console.error('[Coyote3] saveSettings error:', e);
    }
}

function startRamping() {
    if (rampTimer) return;
    rampTimer = mSetInterval(() => {
        const diffA = targetA - rampCurrentA;
        if (Math.abs(diffA) <= RAMP_STEP) rampCurrentA = targetA;
        else rampCurrentA += diffA > 0 ? RAMP_STEP : -RAMP_STEP;

        const diffB = targetB - rampCurrentB;
        if (Math.abs(diffB) <= RAMP_STEP) rampCurrentB = targetB;
        else rampCurrentB += diffB > 0 ? RAMP_STEP : -RAMP_STEP;
    }, 50);
}

function getWavePacketRaw(presetName) {
    const preset = PRESETS[presetName] || PRESETS.gentle;
    const idx = Math.floor(Date.now() / 100) % preset.length;
    const hex = preset[idx];
    const bytes = hexToBytes(hex);
    if (bytes.length !== 8) return { freq: [10,10,10,10], int: [0,0,0,0] };
    return { freq: bytes.slice(0, 4), int: bytes.slice(4, 8) };
}

// --- Bluetooth ---

async function connectBluetooth() {
    if (!navigator.bluetooth) {
        alert('Web Bluetooth not supported. Use Chrome or Edge.');
        return false;
    }

    const s = loadSettings();
    try {
        btDevice = await navigator.bluetooth.requestDevice({
            filters: [{ namePrefix: BT_DEVICE_PREFIX }],
            optionalServices: [BT_SERVICE_UUID, BT_BATTERY_SVC],
        });

        btDevice.addEventListener('gattserverdisconnected', onDisconnected);
        btServer = await btDevice.gatt.connect();
        const service = await btServer.getPrimaryService(BT_SERVICE_UUID);
        btWriteChar = await service.getCharacteristic(BT_WRITE_UUID);
        btNotifyChar = await service.getCharacteristic(BT_NOTIFY_UUID);

        await btNotifyChar.startNotifications();
        btNotifyChar.addEventListener('characteristicvaluechanged', onNotify);

        try {
            const batterySvc = await btServer.getPrimaryService(BT_BATTERY_SVC);
            btBatteryChar = await batterySvc.getCharacteristic(BT_BATTERY_CHAR);
            const val = await btBatteryChar.readValue();
            batteryLevel = val.getUint8(0);
        } catch (e) {
            btBatteryChar = null;
            batteryLevel = null;
        }

        bluetoothConnected = true;
        s.connected = true;
        s.paired = true;
        saveSettings(s);

        await sendBF();
        if (b0Timer) mClearInterval(b0Timer);
        b0Timer = mSetInterval(sendB0, 100);

        updateStatus();
        console.log('[Coyote3] Paired!');
        return true;
    } catch (error) {
        console.error('[Coyote3] Bluetooth error:', error);
        alert(`Bluetooth failed: ${error.message}`);
        return false;
    }
}

function onDisconnected() {
    bluetoothConnected = false;
    btDevice = null;
    btServer = null;
    btWriteChar = null;
    btNotifyChar = null;
    btBatteryChar = null;
    if (b0Timer) { mClearInterval(b0Timer); b0Timer = null; }
    targetA = 0; targetB = 0;
    rampCurrentA = 0; rampCurrentB = 0;
    activePresetA = null; activePresetB = null;
    currentA = 0; currentB = 0;
    awaitingAck = false; pendingMode = 0;

    const s = loadSettings();
    s.connected = false;
    s.paired = false;
    saveSettings(s);
    updateStatus();
}

function onNotify(event) {
    const value = event.target.value;
    const bytes = new Uint8Array(value.buffer);
    if (bytes[0] === 0xB1 && bytes.length >= 4) {
        const echoSeq = bytes[1];
        currentA = bytes[2];
        currentB = bytes[3];
        if (awaitingAck && (echoSeq & 0x0F) === (seq & 0x0F)) {
            awaitingAck = false;
            pendingMode = 0;
        }
        updateStatus();
    }
}

async function sendBF() {
    if (!btWriteChar) return;
    const s = loadSettings();
    const buf = new Uint8Array(7);
    buf[0] = 0xBF;
    buf[1] = clamp(s.limitA ?? 200, 0, 200);
    buf[2] = clamp(s.limitB ?? 200, 0, 200);
    buf[3] = clamp(s.freqBalA ?? 160, 0, 255);
    buf[4] = clamp(s.freqBalB ?? 160, 0, 255);
    buf[5] = clamp(s.intBalA ?? 0, 0, 255);
    buf[6] = clamp(s.intBalB ?? 0, 0, 255);
    try {
        await btWriteChar.writeValue(buf);
    } catch (e) {
        console.error('[Coyote3] BF write error:', e);
    }
}

function nextSeq() {
    seq = (seq % 15) + 1;
    return seq;
}

async function sendB0() {
    if (!btWriteChar) return;
    const s = loadSettings();
    const volA = (s.volumeA ?? 100) / 100;
    const volB = (s.volumeB ?? 100) / 100;

    const presetA = activePresetA || s.waveformA || 'gentle';
    const presetB = activePresetB || s.waveformB || 'gentle';
    const packetA = getWavePacketRaw(presetA);
    const packetB = getWavePacketRaw(presetB);

    const scaleA = (rampCurrentA / 200) * volA;
    const scaleB = (rampCurrentB / 200) * volB;

    const aInts = packetA.int.map(v => clamp(Math.round(v * scaleA), 0, 255));
    const bInts = packetB.int.map(v => clamp(Math.round(v * scaleB), 0, 255));

    const buf = new Uint8Array(20);
    buf[0] = 0xB0;
    const modeCombined = (MODE_ABSOLUTE << 2) | MODE_ABSOLUTE;

    if (!awaitingAck && (rampCurrentA !== currentA || rampCurrentB !== currentB)) {
        seq = nextSeq();
        pendingMode = modeCombined;
        awaitingAck = true;
    } else if (awaitingAck) {
        pendingMode = 0;
    }

    buf[1] = ((seq & 0x0F) << 4) | (pendingMode & 0x0F);
    buf[2] = clamp(Math.round(rampCurrentA), 0, 200);
    buf[3] = clamp(Math.round(rampCurrentB), 0, 200);
    buf.set(packetA.freq, 4);
    buf.set(aInts, 8);
    buf.set(packetB.freq, 12);
    buf.set(bInts, 16);

    try {
        await btWriteChar.writeValue(buf);
    } catch (e) {
        console.error('[Coyote3] B0 write error:', e);
    }
}

function disconnectBluetooth() {
    if (btServer && btServer.connected) btServer.disconnect();
    onDisconnected();
}

// --- AI Command Parsing ---

function parseCommands(text) {
    const regex = /<coyote3:(\w+)([^\/]*?)\/>/gi;
    const commands = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
        const action = match[1].toLowerCase();
        const attrs = {};
        const attrRegex = /(\w+)="([^"]+)"/g;
        let am;
        while ((am = attrRegex.exec(match[2])) !== null) {
            attrs[am[1].toLowerCase()] = am[2];
        }

        if (action === 'stop') {
            commands.push({ type: 'stop' });
            continue;
        }
        if (action === 'clear') {
            commands.push({ type: 'clear', channel: (attrs.channel || 'A').toUpperCase() });
            continue;
        }
        if (['channela', 'a'].includes(action)) {
            const v = parseInt(attrs[action] || attrs.intensity || attrs.strength);
            const preset = attrs.preset || attrs.waveform || attrs.pattern;
            if (!isNaN(v)) {
                commands.push({ type: 'strength', channel: 'A', value: v, time: parseFloat(attrs.time || attrs.duration || 5), preset });
            }
            continue;
        }
        if (['channelb', 'b'].includes(action)) {
            const v = parseInt(attrs[action] || attrs.intensity || attrs.strength);
            const preset = attrs.preset || attrs.waveform || attrs.pattern;
            if (!isNaN(v)) {
                commands.push({ type: 'strength', channel: 'B', value: v, time: parseFloat(attrs.time || attrs.duration || 5), preset });
            }
            continue;
        }
        if (action === 'combo') {
            const actions = [];
            if (attrs.channela !== undefined) actions.push({ channel: 'A', value: parseInt(attrs.channela) });
            if (attrs.a !== undefined) actions.push({ channel: 'A', value: parseInt(attrs.a) });
            if (attrs.channelb !== undefined) actions.push({ channel: 'B', value: parseInt(attrs.channelb) });
            if (attrs.b !== undefined) actions.push({ channel: 'B', value: parseInt(attrs.b) });
            if (actions.length) commands.push({ type: 'combo', actions, time: parseFloat(attrs.time || attrs.duration || 5) });
            continue;
        }
    }
    return commands;
}

// --- Command Execution ---

function sendCommand(cmd) {
    const s = loadSettings();
    if (!s.paired) return false;

    switch (cmd.type) {
        case 'strength': {
            if (cmd.channel === 'A') {
                targetA = clamp(cmd.value, 0, s.limitA || 200);
                if (cmd.preset && PRESETS[cmd.preset]) activePresetA = cmd.preset;
            } else {
                targetB = clamp(cmd.value, 0, s.limitB || 200);
                if (cmd.preset && PRESETS[cmd.preset]) activePresetB = cmd.preset;
            }
            return true;
        }
        case 'combo': {
            for (const act of cmd.actions || []) {
                const lim = act.channel === 'A' ? (s.limitA || 200) : (s.limitB || 200);
                if (act.channel === 'A') targetA = clamp(act.value, 0, lim);
                else targetB = clamp(act.value, 0, lim);
            }
            return true;
        }
        case 'stop': {
            targetA = 0; targetB = 0;
            activePresetA = null;
            activePresetB = null;
            if (loopTimer) { clearTimeout(loopTimer); loopTimer = null; }
            isLooping = false;
            return true;
        }
        case 'clear': {
            if (cmd.channel === 'A') targetA = 0;
            else targetB = 0;
            return true;
        }
    }
    return false;
}

function startLoop() {
    if (loopTimer) clearTimeout(loopTimer);
    if (!messageCommands.length) return;
    isLooping = true;
    let idx = 0;
    const next = () => {
        if (!isLooping || !messageCommands.length) return;
        const cmd = messageCommands[idx % messageCommands.length];
        sendCommand(cmd);
        idx++;
        loopTimer = mSetTimeout(next, (cmd.time || 5) * 1000);
    };
    next();
}

function stopLoop() {
    isLooping = false;
    if (loopTimer) { mClearTimeout(loopTimer); loopTimer = null; }
}

// --- Chat Polling ---

function detectChatId() {
    // 1. Use marinara.chat API if available
    if (typeof marinara !== 'undefined' && marinara.chat && typeof marinara.chat.getActiveId === 'function') {
        try {
            const id = marinara.chat.getActiveId();
            if (id) {
                console.log('[Coyote3] Chat ID from marinara.chat.getActiveId():', id);
                return id;
            }
        } catch (e) {
            console.warn('[Coyote3] getActiveId failed:', e);
        }
    }

    // 2. Try URL path
    const m = window.location.pathname.match(/\/chat[s]?\/([^/]+)/i);
    if (m) return m[1];
    const m2 = window.location.pathname.match(/\/c\/([^/]+)/i);
    if (m2) return m2[1];

    // 3. Try DOM data attributes
    const el = document.querySelector('[data-chat-id], [data-chatid]');
    if (el) return el.dataset.chatId || el.dataset.chatid;

    return null;
}

async function fetchMessagesViaAPI(id) {
    const paths = [
        `/api/chats/${id}/messages`,
        `/api/chat/${id}/messages`,
        `/api/messages?chatId=${id}`,
    ];
    for (const path of paths) {
        try {
            const res = await mApiFetch(path);
            if (res.ok) {
                console.log('[Coyote3] fetchMessages success via:', path);
                return res;
            }
            console.log('[Coyote3] fetchMessages failed path:', path, 'status:', res.status);
        } catch (e) {
            console.warn('[Coyote3] fetchMessages error path:', path, e.message);
        }
    }
    return null;
}

async function getMessages() {
    // 1. Try marinara.chat.getMessages()
    if (typeof marinara !== 'undefined' && marinara.chat && typeof marinara.chat.getMessages === 'function') {
        try {
            const msgs = await marinara.chat.getMessages();
            if (msgs && msgs.length) {
                console.log('[Coyote3] Messages from marinara.chat.getMessages():', msgs.length);
                return msgs;
            }
        } catch (e) {
            console.warn('[Coyote3] getMessages failed:', e);
        }
    }

    // 2. Fallback to raw fetch
    if (!chatId) chatId = detectChatId();
    if (!chatId) {
        console.warn('[Coyote3] No chatId detected');
        return [];
    }

    const res = await fetchMessagesViaAPI(chatId);
    if (!res) {
        console.warn('[Coyote3] All API fetch attempts failed for chatId:', chatId);
        return [];
    }

    const data = await res.json();
    const msgs = Array.isArray(data) ? data : (data.messages || data.results || []);
    return msgs;
}

async function pollMessages() {
    const s = loadSettings();
    if (!s.enabled || !s.paired) return;

    try {
        const messages = await getMessages();
        if (!messages.length) return;

        const lastMsg = messages[messages.length - 1];
        const lastId = lastMsg.id || lastMsg._id || lastMsg.index || lastMsg.messageId;
        if (lastId == null) {
            // Fallback: compare raw text if no ID
            const text = lastMsg.content || lastMsg.text || lastMsg.message || lastMsg.mes || '';
            if (text === lastMessageId) return;
            lastMessageId = text;
        } else {
            if (lastId === lastMessageId) return;
            lastMessageId = lastId;
        }

        console.log('[Coyote3] New message detected:', lastId || '(fallback text hash)');

        // Only process AI messages
        const role = lastMsg.role || lastMsg.sender || '';
        if (role === 'user' || lastMsg.is_user === true) {
            console.log('[Coyote3] Skipping user message');
            return;
        }

        const text = lastMsg.content || lastMsg.text || lastMsg.message || lastMsg.mes || '';
        console.log('[Coyote3] Message text length:', text.length);

        const cmds = parseCommands(text);
        if (!cmds.length) {
            console.log('[Coyote3] No coyote commands found in message');
            return;
        }

        console.log('[Coyote3] Parsed commands:', cmds);
        stopLoop();
        messageCommands = cmds;
        executedCommands.clear();
        startLoop();
    } catch (e) {
        console.error('[Coyote3] pollMessages error:', e);
    }
}

// --- DOM MutationObserver fallback ---
let observerFallback = null;
function startDomObserver() {
    if (observerFallback) return;
    const chatContainer = document.querySelector('[data-chat-container], .chat-messages, .messages, [class*="chat"]');
    if (!chatContainer) {
        console.warn('[Coyote3] No chat container found for DOM observer');
        return;
    }
    observerFallback = new MutationObserver((mutations) => {
        for (const m of mutations) {
            for (const node of m.addedNodes) {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    const text = node.textContent || '';
                    const cmds = parseCommands(text);
                    if (cmds.length) {
                        console.log('[Coyote3] Commands detected via DOM observer');
                        stopLoop();
                        messageCommands = cmds;
                        executedCommands.clear();
                        startLoop();
                        return;
                    }
                }
            }
        }
    });
    observerFallback.observe(chatContainer, { childList: true, subtree: true });
    console.log('[Coyote3] DOM observer started on:', chatContainer);
}

// --- UI ---

function buildPanelHTML() {
    return `
        <div id="c3v2-panel-header">
            <b>Coyote 3.0 v2</b>
            <button id="c3v2-toggle-panel" title="Collapse">-</button>
        </div>
        <div id="c3v2-panel-body">
            <label class="c3v2-row">
                <input type="checkbox" id="c3v2_enabled" />
                <span>Enable AI Control</span>
            </label>
            <div id="c3v2_status" class="c3v2_status disconnected">
                <strong>Status:</strong> <span id="c3v2_status_text">Not Connected</span>
            </div>
            <div class="c3v2-btn-row">
                <button id="c3v2_pair" class="c3v2-btn">Pair Device</button>
                <button id="c3v2_disconnect" class="c3v2-btn">Disconnect</button>
            </div>
            <h4>Live Stats</h4>
            <div class="c3v2-grid">
                <div class="c3v2-stat"><div class="c3v2-stat-label">Target A</div><div class="c3v2-stat-value" id="c3v2_targetA">0</div></div>
                <div class="c3v2-stat"><div class="c3v2-stat-label">Target B</div><div class="c3v2-stat-value" id="c3v2_targetB">0</div></div>
                <div class="c3v2-stat"><div class="c3v2-stat-label">Current A</div><div class="c3v2-stat-value" id="c3v2_currentA">0</div></div>
                <div class="c3v2-stat"><div class="c3v2-stat-label">Current B</div><div class="c3v2-stat-value" id="c3v2_currentB">0</div></div>
                <div class="c3v2-stat"><div class="c3v2-stat-label">Wave A</div><div class="c3v2-stat-value" id="c3v2_preset_a">gentle</div></div>
                <div class="c3v2-stat"><div class="c3v2-stat-label">Wave B</div><div class="c3v2-stat-value" id="c3v2_preset_b">gentle</div></div>
                <div class="c3v2-stat"><div class="c3v2-stat-label">Battery</div><div class="c3v2-stat-value" id="c3v2_battery">--</div></div>
            </div>
            <h4>Output Volume</h4>
            <label class="c3v2-slider-label"><b>Channel A Volume</b> <span id="c3v2_vol_a_val">100%</span></label>
            <input type="range" id="c3v2_volume_a" min="0" max="100" value="100" />
            <label class="c3v2-slider-label"><b>Channel B Volume</b> <span id="c3v2_vol_b_val">100%</span></label>
            <input type="range" id="c3v2_volume_b" min="0" max="100" value="100" />
            <h4>Waveform</h4>
            <label><b>Channel A</b></label>
            <select id="c3v2_wave_a">
                <option value="gentle">Gentle</option>
                <option value="pulse">Pulse</option>
                <option value="wave">Wave</option>
                <option value="intense">Intense</option>
                <option value="tease">Tease</option>
            </select>
            <label style="margin-top:8px;"><b>Channel B</b></label>
            <select id="c3v2_wave_b">
                <option value="gentle">Gentle</option>
                <option value="pulse">Pulse</option>
                <option value="wave">Wave</option>
                <option value="intense">Intense</option>
                <option value="tease">Tease</option>
            </select>
            <h4>Safety Limits</h4>
            <label><b>Soft Limit A (0-200)</b></label>
            <input type="number" id="c3v2_limit_a" value="200" min="0" max="200" />
            <label style="margin-top:8px;"><b>Soft Limit B (0-200)</b></label>
            <input type="number" id="c3v2_limit_b" value="200" min="0" max="200" />
            <h4>Test Controls</h4>
            <div>
                <b>Channel A</b>
                <div class="c3v2-test-row">
                    <button class="c3v2-test-a" data-value="25">25</button>
                    <button class="c3v2-test-a" data-value="50">50</button>
                    <button class="c3v2-test-a" data-value="100">100</button>
                    <button class="c3v2-test-a" data-value="200">MAX</button>
                </div>
            </div>
            <div style="margin-top:8px;">
                <b>Channel B</b>
                <div class="c3v2-test-row">
                    <button class="c3v2-test-b" data-value="25">25</button>
                    <button class="c3v2-test-b" data-value="50">50</button>
                    <button class="c3v2-test-b" data-value="100">100</button>
                    <button class="c3v2-test-b" data-value="200">MAX</button>
                </div>
            </div>
            <div style="margin-top:8px;">
                <button id="c3v2_stop" class="c3v2-stop">Stop All</button>
            </div>
            <h4>AI Guidelines</h4>
            <textarea id="c3v2_guidelines" rows="3"></textarea>
            <h4>Manual Command</h4>
            <input type="text" id="c3v2_manual" placeholder='&lt;coyote3:a="50" time="5"/&gt;' />
            <button id="c3v2_manual_send" class="c3v2-btn" style="margin-top:4px;">Send Command</button>
        </div>
    `;
}

function updateStatus() {
    const s = loadSettings();
    const statusDiv = document.getElementById('c3v2_status');
    const statusText = document.getElementById('c3v2_status_text');

    if (bluetoothConnected) {
        statusDiv.classList.remove('disconnected');
        statusDiv.classList.add('connected');
        statusText.textContent = 'Paired';
    } else {
        statusDiv.classList.remove('connected');
        statusDiv.classList.add('disconnected');
        statusText.textContent = 'Not Connected';
    }

    document.getElementById('c3v2_targetA').textContent = targetA;
    document.getElementById('c3v2_targetB').textContent = targetB;
    document.getElementById('c3v2_currentA').textContent = Math.round(rampCurrentA);
    document.getElementById('c3v2_currentB').textContent = Math.round(rampCurrentB);
    document.getElementById('c3v2_battery').textContent = batteryLevel !== null ? batteryLevel + '%' : '--';

    const presetA = activePresetA || s.waveformA || 'gentle';
    const presetB = activePresetB || s.waveformB || 'gentle';
    document.getElementById('c3v2_preset_a').textContent = presetA;
    document.getElementById('c3v2_preset_b').textContent = presetB;
}

function loadUIValues() {
    const s = loadSettings();
    document.getElementById('c3v2_enabled').checked = s.enabled;
    document.getElementById('c3v2_volume_a').value = s.volumeA ?? 100;
    document.getElementById('c3v2_volume_b').value = s.volumeB ?? 100;
    document.getElementById('c3v2_vol_a_val').textContent = (s.volumeA ?? 100) + '%';
    document.getElementById('c3v2_vol_b_val').textContent = (s.volumeB ?? 100) + '%';
    document.getElementById('c3v2_limit_a').value = s.limitA ?? 200;
    document.getElementById('c3v2_limit_b').value = s.limitB ?? 200;
    document.getElementById('c3v2_wave_a').value = s.waveformA || 'gentle';
    document.getElementById('c3v2_wave_b').value = s.waveformB || 'gentle';
    document.getElementById('c3v2_guidelines').value = s.guidelines || '';
    updateStatus();
}

function setupEventListeners() {
    const s = loadSettings();

    document.getElementById('c3v2_enabled').addEventListener('change', (e) => {
        s.enabled = e.target.checked;
        saveSettings(s);
        updateStatus();
    });

    document.getElementById('c3v2_volume_a').addEventListener('input', (e) => {
        s.volumeA = clamp(parseInt(e.target.value) || 100, 0, 100);
        document.getElementById('c3v2_vol_a_val').textContent = s.volumeA + '%';
        saveSettings(s);
        updateStatus();
    });

    document.getElementById('c3v2_volume_b').addEventListener('input', (e) => {
        s.volumeB = clamp(parseInt(e.target.value) || 100, 0, 100);
        document.getElementById('c3v2_vol_b_val').textContent = s.volumeB + '%';
        saveSettings(s);
        updateStatus();
    });

    document.getElementById('c3v2_limit_a').addEventListener('input', (e) => {
        s.limitA = clamp(parseInt(e.target.value) || 200, 0, 200);
        saveSettings(s);
        if (bluetoothConnected) sendBF();
    });

    document.getElementById('c3v2_limit_b').addEventListener('input', (e) => {
        s.limitB = clamp(parseInt(e.target.value) || 200, 0, 200);
        saveSettings(s);
        if (bluetoothConnected) sendBF();
    });

    document.getElementById('c3v2_wave_a').addEventListener('change', (e) => {
        s.waveformA = e.target.value;
        saveSettings(s);
    });

    document.getElementById('c3v2_wave_b').addEventListener('change', (e) => {
        s.waveformB = e.target.value;
        saveSettings(s);
    });

    document.getElementById('c3v2_guidelines').addEventListener('input', (e) => {
        s.guidelines = e.target.value;
        saveSettings(s);
    });

    document.getElementById('c3v2_pair').addEventListener('click', async () => {
        await connectBluetooth();
        updateStatus();
    });

    document.getElementById('c3v2_disconnect').addEventListener('click', () => {
        disconnectBluetooth();
    });

    document.querySelectorAll('.c3v2-test-a').forEach(btn => {
        btn.addEventListener('click', () => {
            targetA = parseInt(btn.dataset.value);
            updateStatus();
        });
    });

    document.querySelectorAll('.c3v2-test-b').forEach(btn => {
        btn.addEventListener('click', () => {
            targetB = parseInt(btn.dataset.value);
            updateStatus();
        });
    });

    document.getElementById('c3v2_stop').addEventListener('click', () => {
        targetA = 0; targetB = 0;
        rampCurrentA = 0; rampCurrentB = 0;
        activePresetA = null; activePresetB = null;
        stopLoop();
        updateStatus();
    });

    document.getElementById('c3v2_manual_send').addEventListener('click', () => {
        const text = document.getElementById('c3v2_manual').value;
        const cmds = parseCommands(text);
        for (const cmd of cmds) sendCommand(cmd);
        if (cmds.length) document.getElementById('c3v2_manual').value = '';
    });

    // Panel collapse
    document.getElementById('c3v2-toggle-panel').addEventListener('click', () => {
        const body = document.getElementById('c3v2-panel-body');
        const btn = document.getElementById('c3v2-toggle-panel');
        if (body.style.display === 'none') {
            body.style.display = '';
            btn.textContent = '-';
        } else {
            body.style.display = 'none';
            btn.textContent = '+';
        }
    });
}

// --- Initialization ---

function init() {
    // Check if panel already exists
    if (document.getElementById('c3v2-panel')) return;

    // Create panel container
    const panel = document.createElement('div');
    panel.id = 'c3v2-panel';
    panel.innerHTML = buildPanelHTML();
    document.body.appendChild(panel);

    loadUIValues();
    setupEventListeners();
    startRamping();

    // Start chat polling
    if (pollTimer) mClearInterval(pollTimer);
    pollTimer = mSetInterval(pollMessages, 2000);

    // Start DOM observer as fallback
    startDomObserver();

    // Register cleanup
    mOnCleanup(() => {
        if (rampTimer) { mClearInterval(rampTimer); rampTimer = null; }
        if (b0Timer) { mClearInterval(b0Timer); b0Timer = null; }
        if (pollTimer) { mClearInterval(pollTimer); pollTimer = null; }
        if (loopTimer) { mClearTimeout(loopTimer); loopTimer = null; }
        if (observerFallback) { observerFallback.disconnect(); observerFallback = null; }
        disconnectBluetooth();
        const p = document.getElementById('c3v2-panel');
        if (p) p.remove();
    });

    console.log('[Coyote3] Extension initialized');
}

// Run when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
