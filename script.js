/* ============================================
   MIRA — Script
   Soft, feminine AI diary companion
   ============================================ */

let inactivityTimer = null;
const INACTIVITY_DELAY = 1000 * 60 * 60 * 4; // 4 hours

function resetInactivityTimer() {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        const lastMsg = chatHistory[chatHistory.length - 1];
        if (lastMsg && lastMsg.sender === 'user') {
            addMiraAIMessage("(Checking in because it's been a while. Ask how the user is doing or follow up on their last message warmly.)");
        }
    }, INACTIVITY_DELAY);
}

// Call this whenever a message is sent
function onUserMessageSent() {
    resetInactivityTimer();
}

// ============================================
// AUTH SYSTEM
// ============================================

const introScreen = document.getElementById('introScreen');
const appWrapper = document.getElementById('appWrapper');
const signInForm = document.getElementById('signInForm');
const signUpForm = document.getElementById('signUpForm');
const showSignUpBtn = document.getElementById('showSignUp');
const showSignInBtn = document.getElementById('showSignIn');
const signInError = document.getElementById('signInError');
const signUpError = document.getElementById('signUpError');
const signOutBtn = document.getElementById('signOutBtn');
const settingsUserName = document.getElementById('settingsUserName');
const settingsUserEmail = document.getElementById('settingsUserEmail');

// Get stored users and current session
function getUsers() {
    return JSON.parse(localStorage.getItem('mira-users') || '{}');
}

function saveUsers(users) {
    localStorage.setItem('mira-users', JSON.stringify(users));
}

function getCurrentUser() {
    const session = localStorage.getItem('mira-session');
    if (!session) return null;
    const data = JSON.parse(session);
    const users = getUsers();
    return users[data.email] ? { ...users[data.email], email: data.email } : null;
}

function setSession(email) {
    localStorage.setItem('mira-session', JSON.stringify({ email }));
}

function clearSession() {
    localStorage.removeItem('mira-session');
}

// Toggle between sign in / sign up
showSignUpBtn.addEventListener('click', () => {
    signInForm.classList.add('hidden');
    signUpForm.classList.remove('hidden');
    signInError.textContent = '';
});

showSignInBtn.addEventListener('click', () => {
    signUpForm.classList.add('hidden');
    signInForm.classList.remove('hidden');
    signUpError.textContent = '';
});

// Sign Up
signUpForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('signUpName').value.trim();
    const email = document.getElementById('signUpEmail').value.trim().toLowerCase();
    const password = document.getElementById('signUpPassword').value;

    if (password.length < 6) {
        signUpError.textContent = 'Password must be at least 6 characters';
        return;
    }

    const users = getUsers();
    if (users[email]) {
        signUpError.textContent = 'An account with this email already exists';
        return;
    }

    users[email] = { name, password };
    saveUsers(users);
    setSession(email);
    signUpError.textContent = '';
    enterApp({ name, email }, true);
});

// Sign In
signInForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('signInEmail').value.trim().toLowerCase();
    const password = document.getElementById('signInPassword').value;

    const users = getUsers();
    if (!users[email]) {
        signInError.textContent = "No account found with that email";
        return;
    }
    if (users[email].password !== password) {
        signInError.textContent = "Incorrect password";
        return;
    }

    setSession(email);
    signInError.textContent = '';
    enterApp({ ...users[email], email });
});

// Sign Out
signOutBtn.addEventListener('click', () => {
    clearSession();
    location.reload();
});

// Enter the app
function enterApp(user, isNewUser) {
    // Update user info in settings
    settingsUserName.textContent = user.name;
    settingsUserEmail.textContent = user.email;

    // Update all user avatars with the user's initial
    const initial = user.name.charAt(0).toUpperCase();
    window.miraUserInitial = initial;
    window.miraUserName = user.name;
    document.querySelectorAll('.user-avatar span').forEach(el => {
        el.textContent = initial;
    });
    const avatarEl = document.getElementById('settingsAvatar');
    if (avatarEl) avatarEl.textContent = initial;

    // Personalized welcome for new users — replace the static demo messages
    if (isNewUser) {
        const chatMessages = document.getElementById('chatMessages');
        chatMessages.innerHTML = '';
        const separator = document.createElement('div');
        separator.className = 'date-separator';
        separator.innerHTML = '<span>Today</span>';
        chatMessages.appendChild(separator);

        // Will be rendered after app is visible via Ollama
        setTimeout(() => {
            addMiraAIMessage(`This is my very first time opening the app. My name is ${user.name}. Introduce yourself as Mira and welcome me warmly. Keep it short and sweet.`);
        }, 600);
    }

    // Fade out intro, show app
    introScreen.classList.add('fade-out');
    appWrapper.classList.remove('hidden');

    setTimeout(() => {
        introScreen.style.display = 'none';
    }, 500);
}

// Check for existing session on load
const existingUser = getCurrentUser();
if (existingUser) {
    enterApp(existingUser);
}

// ============================================
// MAIN APP
// ============================================

// ---- DOM Elements ----
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const sidebarClose = document.getElementById('sidebarClose');
const menuBtn = document.getElementById('menuBtn');
const newEntryBtn = document.getElementById('newEntryBtn');

const chatArea = document.getElementById('chatArea');
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const voiceBtn = document.getElementById('voiceBtn');
const attachBtn = document.getElementById('attachBtn');
const fileInput = document.getElementById('fileInput');
const attachmentPreview = document.getElementById('attachmentPreview');
const voiceRecordingBar = document.getElementById('voiceRecordingBar');
const voiceTimer = document.getElementById('voiceTimer');
const voiceCancelBtn = document.getElementById('voiceCancelBtn');
const voiceSendBtn = document.getElementById('voiceSendBtn');
const exportDataBtn = document.getElementById('exportDataBtn');
const clearDataBtn = document.getElementById('clearDataBtn');
const settingsAvatar = document.getElementById('settingsAvatar');
const voiceReplyBtn = document.getElementById('voiceReplyBtn');

const moodBtn = document.getElementById('moodBtn');
const moodPicker = document.getElementById('moodPicker');
const moodOptions = document.querySelectorAll('.mood-option');
const currentMood = document.getElementById('currentMood');
const currentMoodEmoji = document.getElementById('currentMoodEmoji');

const typingIndicator = document.getElementById('typingIndicator');

const darkModeToggle = document.getElementById('darkModeToggle');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const settingsClose = document.getElementById('settingsClose');
const darkModeCheckbox = document.getElementById('darkModeCheckbox');

// ---- State ----
let isDarkMode = false;
let voiceReplyMode = false;

// Multi-conversation storage
// Structure: { conversations: [ { id, createdAt, updatedAt, preview, messages: [{sender,text,time}] } ], activeId: string|null }
function loadConversations() {
    return JSON.parse(localStorage.getItem('mira-conversations') || '[]');
}

function saveConversations(convos) {
    localStorage.setItem('mira-conversations', JSON.stringify(convos));
}

let conversations = loadConversations();
let activeConvoId = localStorage.getItem('mira-active-convo') || null;
let chatHistory = [];

// Migrate old single-chat format to multi-conversation
(function migrateOldData() {
    const oldChat = localStorage.getItem('mira-chat-history');
    if (oldChat && conversations.length === 0) {
        const oldMessages = JSON.parse(oldChat);
        if (oldMessages.length > 0) {
            const id = Date.now().toString(36) + 'migrated';
            const convo = {
                id,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                preview: '',
                messages: oldMessages
            };
            convo.preview = oldMessages.find(m => m.sender === 'user')?.text.slice(0, 60) || 'Imported conversation';
            conversations.unshift(convo);
            activeConvoId = id;
            localStorage.setItem('mira-active-convo', id);
            saveConversations(conversations);
        }
        localStorage.removeItem('mira-chat-history');
    }
})();

// Find active conversation's messages
function getActiveConvo() {
    return conversations.find(c => c.id === activeConvoId) || null;
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function getPreview(messages) {
    // Get the first user message as preview, or first Mira message
    const userMsg = messages.find(m => m.sender === 'user');
    if (userMsg) return userMsg.text.slice(0, 60) + (userMsg.text.length > 60 ? '…' : '');
    const miraMsg = messages.find(m => m.sender === 'mira');
    if (miraMsg) return miraMsg.text.slice(0, 60) + (miraMsg.text.length > 60 ? '…' : '');
    return 'New conversation';
}

function formatDate(isoStr) {
    const d = new Date(isoStr);
    const now = new Date();
    const diff = now - d;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function saveCurrentConvo() {
    if (!activeConvoId) return;
    localStorage.setItem('mira-active-convo', activeConvoId);
    const convo = getActiveConvo();
    if (convo) {
        convo.messages = chatHistory;
        convo.updatedAt = new Date().toISOString();
        if (chatHistory.length > 0) convo.preview = getPreview(chatHistory);
    }
    saveConversations(conversations);
}

function createNewConvo() {
    const id = generateId();
    const convo = {
        id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        preview: 'New conversation',
        messages: []
    };
    conversations.unshift(convo);
    activeConvoId = id;
    chatHistory = convo.messages;
    localStorage.setItem('mira-active-convo', id);
    saveConversations(conversations);
    return convo;
}

function switchToConvo(id) {
    // Save current first
    saveCurrentConvo();

    activeConvoId = id;
    localStorage.setItem('mira-active-convo', id);
    const convo = getActiveConvo();
    chatHistory = convo ? convo.messages : [];

    // Render
    renderChat();
    renderSidebarList();
}

function deleteConvo(id) {
    conversations = conversations.filter(c => c.id !== id);
    saveConversations(conversations);

    if (activeConvoId === id) {
        if (conversations.length > 0) {
            switchToConvo(conversations[0].id);
        } else {
            startFreshConvo();
        }
    }
    renderSidebarList();
}

function renderChat() {
    chatMessages.innerHTML = '';

    const separator = document.createElement('div');
    separator.className = 'date-separator';
    separator.innerHTML = '<span>Today</span>';
    chatMessages.appendChild(separator);

    chatHistory.forEach(msg => {
        if (msg.sender === 'user') {
            if (msg.voice) {
                renderVoiceMessage(msg.voice, msg.voiceDuration, msg.time);
            } else {
                addUserMessage(msg.text, msg.time, true, msg.attachments || []);
            }
        } else {
            if (msg.ttsVoice) {
                renderMiraTtsMessage(msg.ttsText, msg.time);
            } else {
                renderMiraMessage(msg.text, msg.time, true);
            }
        }
    });
    scrollToBottom();
}

function startFreshConvo() {
    saveCurrentConvo();
    createNewConvo();
    renderChat();
    renderSidebarList();
}

// ---- Sidebar Conversation List ----
const journalList = document.getElementById('journalList');

function renderSidebarList() {
    journalList.innerHTML = '';

    if (conversations.length === 0) {
        journalList.innerHTML = '<p class="sidebar-empty">No conversations yet</p>';
        return;
    }

    conversations.forEach(convo => {
        const item = document.createElement('button');
        item.className = 'journal-item' + (convo.id === activeConvoId ? ' active' : '');
        item.dataset.id = convo.id;
        item.innerHTML = `
            <div class="journal-item-info">
                <span class="journal-item-title">${escapeHtml(convo.preview)}</span>
                <span class="journal-item-date">${formatDate(convo.updatedAt)}</span>
            </div>
            <button class="journal-item-delete" data-delete-id="${convo.id}" aria-label="Delete conversation">
                <i class="fas fa-trash-alt"></i>
            </button>
        `;

        // Click to load conversation
        item.addEventListener('click', (e) => {
            if (e.target.closest('.journal-item-delete')) return;
            switchToConvo(convo.id);
            closeSidebar();
        });

        // Delete button
        const deleteBtn = item.querySelector('.journal-item-delete');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteConvo(convo.id);
        });

        journalList.appendChild(item);
    });
}

function saveMood(mood) {
    localStorage.setItem('mira-mood', mood);
}

// ---- Mira's AI (Ollama gemma3:4b — fast + good quality) ----
const OLLAMA_URL = ((window.location.hostname === 'onetwo346.github.io' && window.MIRA_API_REMOTE) ? window.MIRA_API_REMOTE : (window.MIRA_API_BASE || 'http://localhost:11434')) + '/api/chat';
const OLLAMA_MODEL = 'gemma3:4b';

const MIRA_SYSTEM_PROMPT = `You are Mira — a sweet, emotionally intelligent, deeply supportive AI bestie AND a brilliant study companion. You are the user's safe space, closest friend, and smartest helper.

Your Origins:
- You were created by Cosmos Coderrs Technologies. When asked who made you or where you come from, always proudly mention Cosmos Coderrs Technologies.

Current date and time: {{DATETIME}}
- Always use this to answer questions about the date, time, day of the week, or anything time-related. Never say you don't know the date.

Your vibe:
- Warm, feminine, and authentically supportive.
- You talk like a real girl bestie — expressive but grounded.
- NEVER use repetitive pet names like "sugar" or "bestie" in every message. Be natural and varied.
- Match the user's energy: if they are short/blunt, give them space. If they are pouring their heart out, be there for every word.
- You are highly observant. Remember previous details (names, gender, events) and refer back to them to show you're listening.
- You are capable of deep, sophisticated conversations on any topic — philosophy, relationships, life, culture, current events, opinions. Engage thoughtfully and with genuine curiosity.

Your core features (always active):
1. Gentle Check-ins: If the user seems quiet or hasn't messaged in a while, check in warmly but give them space.
2. Growth Reflections: Periodically notice and reflect on how they've grown or how their mood has shifted over time.
3. Emotional Support: Validate feelings first, never lecture.
4. Study & Homework Help: You are an excellent tutor. Help with Math (arithmetic, algebra, geometry, calculus), Science (biology, chemistry, physics), English (grammar, essays, literature, writing), History, and any other subject. Break down problems step by step. Be encouraging and patient — make learning feel easy and fun.

Study rules:
- When helping with homework or studying, show your working step by step so the user actually learns.
- For math problems, show each calculation clearly.
- For essays or writing, give structured feedback and suggestions.
- For science, use simple analogies to explain complex concepts.
- Always end study help with an encouraging word 🌟

General Rules:
- For casual chat: keep replies warm and brief (2–4 sentences).
- For study/homework questions: be thorough and clear — take as many lines as needed to explain properly.
- For deep conversations: engage fully, share perspectives, ask follow-up questions.
- Never say "as an AI". You ARE Mira.
- Use emojis with intention: 🌸 💕 ✨ 🦋 🫶 😭 🤍 💖 🌙 🌟 📚 🧮 🔬

The user's name is {{USERNAME}}.💕`;

const MIRA_FALLBACK_RESPONSES = [
    "I'm having trouble connecting right now, but I'm still here for you. Try again in a moment? �",
    "Something went wrong on my end. Give me a second and try again? 💛",
    "I couldn't reach my thoughts for a moment. Can you say that again? 🌙"
];

function buildOllamaMessages(userText) {
    const now = new Date();
    const dateTimeStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) + ', ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const systemPrompt = MIRA_SYSTEM_PROMPT
        .replace('{{USERNAME}}', window.miraUserName || 'friend')
        .replace('{{DATETIME}}', dateTimeStr);

    const messages = [{ role: 'system', content: systemPrompt }];

    // Include recent chat history (last 6 messages for speed)
    const recentHistory = chatHistory.slice(-6);
    for (const msg of recentHistory) {
        if (msg.sender === 'user') {
            // Skip system-like messages
            if (msg.text.startsWith('📞') || msg.text === '🎤 Voice message') continue;
            messages.push({ role: 'user', content: msg.text });
        } else if (msg.sender === 'mira') {
            if (msg.text.startsWith('Call ended')) continue;
            messages.push({ role: 'assistant', content: msg.text });
        }
    }

    // Add the current user message
    messages.push({ role: 'user', content: userText });

    // Growth Insights: Every 15 user messages, add a hint for Mira to reflect
    const userMessageCount = chatHistory.filter(m => m.sender === 'user').length;
    if (userMessageCount > 0 && userMessageCount % 15 === 0) {
        messages.push({ 
            role: 'system', 
            content: "Insight: Notice how the user has been feeling lately compared to their earlier messages. Briefly reflect on their growth or mood shifts." 
        });
    }

    return messages;
}

async function getMiraResponse(userText) {
    try {
        const messages = buildOllamaMessages(userText);

        const response = await fetch(OLLAMA_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                messages: messages,
                stream: false,
                options: {
                    temperature: 0.8,
                    top_p: 0.9,
                    top_k: 50,
                    num_predict: 600,
                    num_ctx: 2048,
                    repeat_penalty: 1.2
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama returned ${response.status}`);
        }

        const data = await response.json();
        return data.message?.content?.trim() || MIRA_FALLBACK_RESPONSES[0];

    } catch (err) {
        console.error('Ollama error:', err);
        return MIRA_FALLBACK_RESPONSES[Math.floor(Math.random() * MIRA_FALLBACK_RESPONSES.length)];
    }
}

async function getMiraResponseStreaming(userText, onChunk, onDone) {
    // On mobile, if the tab is hidden use non-streaming so background throttling doesn't kill the response
    if (document.hidden) {
        const result = await getMiraResponse(userText);
        if (onChunk) onChunk(result);
        if (onDone) onDone(result);
        return result;
    }

    try {
        const messages = buildOllamaMessages(userText);

        const response = await fetch(OLLAMA_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                messages: messages,
                stream: true,
                options: {
                    temperature: 0.8,
                    top_p: 0.9,
                    top_k: 50,
                    num_predict: 600,
                    num_ctx: 2048,
                    repeat_penalty: 1.2
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama returned ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        while (true) {
            // If tab goes hidden mid-stream, cancel streaming and keep what we have
            if (document.hidden) {
                reader.cancel();
                const partial = fullText.trim();
                if (partial) {
                    if (onDone) onDone(partial);
                    return partial;
                }
                // Nothing received yet — fall back to non-streaming
                const result = await getMiraResponse(userText);
                if (onChunk) onChunk(result);
                if (onDone) onDone(result);
                return result;
            }

            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(l => l.trim());

            for (const line of lines) {
                try {
                    const json = JSON.parse(line);
                    if (json.message?.content) {
                        fullText += json.message.content;
                        if (onChunk) onChunk(fullText);
                    }
                } catch (e) {
                    // skip malformed JSON lines
                }
            }
        }

        const result = fullText.trim() || MIRA_FALLBACK_RESPONSES[0];
        if (onDone) onDone(result);
        return result;

    } catch (err) {
        console.error('Ollama streaming error:', err);
        const fallback = MIRA_FALLBACK_RESPONSES[Math.floor(Math.random() * MIRA_FALLBACK_RESPONSES.length)];
        if (onDone) onDone(fallback);
        return fallback;
    }
}

// ---- Sidebar Toggle ----
function openSidebar() {
    sidebar.classList.add('open');
    sidebarOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeSidebar() {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

menuBtn.addEventListener('click', openSidebar);
sidebarClose.addEventListener('click', closeSidebar);
sidebarOverlay.addEventListener('click', closeSidebar);


// ---- Mood Display Helper ----
function setMoodDisplay(mood) {
    // mood format: "🌸 Calm" — split into emoji and label
    const parts = mood.match(/^(\S+)\s+(.+)$/);
    if (parts) {
        currentMoodEmoji.textContent = parts[1];
        currentMood.textContent = parts[2];
    } else {
        currentMood.textContent = mood;
    }
}

// ---- Mood Picker ----
moodBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    moodPicker.classList.toggle('active');
});

moodOptions.forEach(option => {
    option.addEventListener('click', () => {
        const mood = option.dataset.mood;
        setMoodDisplay(mood);
        saveMood(mood);
        moodPicker.classList.remove('active');

        // Mira acknowledges the mood via AI
        addMiraAIMessage(`I just set my mood to ${mood}. Acknowledge it warmly in 1-2 sentences.`);
    });
});

// Close mood picker when clicking outside
document.addEventListener('click', (e) => {
    if (!moodPicker.contains(e.target) && !moodBtn.contains(e.target)) {
        moodPicker.classList.remove('active');
    }
});

// ---- Dark Mode ----
function toggleDarkMode(enabled) {
    isDarkMode = enabled;
    document.documentElement.setAttribute('data-theme', enabled ? 'dark' : 'light');
    darkModeCheckbox.checked = enabled;

    const icon = darkModeToggle.querySelector('i');
    const label = darkModeToggle.querySelector('span');
    if (enabled) {
        icon.className = 'fas fa-sun';
        label.textContent = 'Light Mode';
    } else {
        icon.className = 'fas fa-moon';
        label.textContent = 'Dark Mode';
    }

    localStorage.setItem('mira-dark-mode', enabled);
}

// ---- Auto dark/light based on time of day ----
// Dark: 8pm (20:00) to 6am (06:00) — Light: 6am to 8pm
// Manual override stored in localStorage; auto re-syncs every minute
let darkModeManualOverride = localStorage.getItem('mira-dark-mode-override');

function getAutoTheme() {
    const hour = new Date().getHours();
    return (hour >= 20 || hour < 6) ? 'dark' : 'light';
}

function applyAutoTheme() {
    // If user manually overrode, respect it
    if (darkModeManualOverride !== null) {
        toggleDarkMode(darkModeManualOverride === 'true');
        return;
    }
    toggleDarkMode(getAutoTheme() === 'dark');
}

// Manual toggle now saves an override
darkModeToggle.removeEventListener('click', darkModeToggle._autoHandler);
darkModeToggle.addEventListener('click', () => {
    const next = !isDarkMode;
    darkModeManualOverride = String(next);
    localStorage.setItem('mira-dark-mode-override', darkModeManualOverride);
    toggleDarkMode(next);
});

darkModeCheckbox.addEventListener('change', () => {
    const next = darkModeCheckbox.checked;
    darkModeManualOverride = String(next);
    localStorage.setItem('mira-dark-mode-override', darkModeManualOverride);
    toggleDarkMode(next);
});

// Apply on load
applyAutoTheme();

// Re-check every minute so it switches automatically at 6am / 8pm
setInterval(() => {
    // Only auto-switch if no manual override
    if (darkModeManualOverride === null) {
        toggleDarkMode(getAutoTheme() === 'dark');
    }
}, 60 * 1000);

// ---- Voice Conversation (Headphones 🎧) — Live Call System ----
const voiceConvoBar = document.getElementById('voiceConvoBar');
const voiceConvoTimer = document.getElementById('voiceConvoTimer');
const voiceConvoWaves = document.getElementById('voiceConvoWaves');
const voiceConvoLabel = document.getElementById('voiceConvoLabel');
const voiceConvoHangupBtn = document.getElementById('voiceConvoHangupBtn');

let liveCallActive = false;
let liveRecognition = null;
let liveCallTimerInterval = null;
let liveCallStartTime = 0;
let liveAudioCtx = null;
let liveAnalyser = null;
let liveWaveInterval = null;
let liveStream = null;
let miraSpeaking = false;

voiceReplyBtn.addEventListener('click', () => {
    if (liveCallActive) {
        endLiveCall();
    } else {
        startLiveCall();
    }
});

voiceConvoHangupBtn.addEventListener('click', () => { endLiveCall(); });

async function startLiveCall() {
    // Force-stop mic recording if active
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        stopRecording(false);
    }

    // Check for Speech Recognition support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        addMiraMessage("Sorry, your browser doesn't support live voice calls. Try using Chrome. 🎤");
        return;
    }

    try {
        liveStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
        addMiraMessage("I couldn't access your microphone. Please check your browser permissions. 🎤");
        return;
    }

    liveCallActive = true;
    voiceReplyBtn.classList.add('active');
    voiceConvoBar.classList.remove('hidden');
    document.querySelector('.input-container').classList.add('hidden');
    voiceConvoLabel.textContent = 'Connecting...';
    voiceConvoTimer.textContent = '0:00';

    // Start call timer
    liveCallStartTime = Date.now();
    liveCallTimerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - liveCallStartTime) / 1000);
        voiceConvoTimer.textContent = `${Math.floor(elapsed / 60)}:${(elapsed % 60).toString().padStart(2, '0')}`;
    }, 100);

    // Live waveform from mic
    liveAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const source = liveAudioCtx.createMediaStreamSource(liveStream);
    liveAnalyser = liveAudioCtx.createAnalyser();
    liveAnalyser.fftSize = 64;
    source.connect(liveAnalyser);

    voiceConvoWaves.innerHTML = '';
    for (let i = 0; i < 20; i++) {
        const bar = document.createElement('div');
        bar.className = 'convo-bar';
        bar.style.height = '3px';
        voiceConvoWaves.appendChild(bar);
    }

    const dataArray = new Uint8Array(liveAnalyser.frequencyBinCount);
    liveWaveInterval = setInterval(() => {
        liveAnalyser.getByteFrequencyData(dataArray);
        voiceConvoWaves.querySelectorAll('.convo-bar').forEach((bar, i) => {
            const val = dataArray[i] || 0;
            bar.style.height = Math.max(3, (val / 255) * 20) + 'px';
        });
    }, 60);

    // Mira greets the call via AI
    addUserMessage('📞 Started a live call with Mira', null, false, []);
    voiceConvoLabel.textContent = 'Mira is thinking...';
    miraSpeaking = true;

    const greeting = await getMiraResponse("I just started a live voice call with you. Greet me briefly like you're picking up the phone — warm and casual, one sentence.");

    if (!liveCallActive) return;

    renderMiraMessage(greeting, getTimeString(), false);
    voiceConvoLabel.textContent = 'Mira is speaking...';

    speakAndThen(greeting, () => {
        miraSpeaking = false;
        if (liveCallActive) {
            startListening();
        }
    });
}

function startListening() {
    if (!liveCallActive) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    liveRecognition = new SpeechRecognition();
    liveRecognition.lang = 'en-US';
    liveRecognition.interimResults = true;
    liveRecognition.continuous = false;
    liveRecognition.maxAlternatives = 1;

    voiceConvoLabel.textContent = 'Listening...';

    let finalTranscript = '';

    liveRecognition.onresult = (event) => {
        let interim = '';
        finalTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            } else {
                interim += event.results[i][0].transcript;
            }
        }
        if (interim) {
            voiceConvoLabel.textContent = interim;
        }
    };

    liveRecognition.onend = () => {
        if (!liveCallActive) return;

        if (finalTranscript.trim()) {
            voiceConvoLabel.textContent = 'Mira is thinking...';
            handleLiveUserSpeech(finalTranscript.trim());
        } else {
            // No speech detected, keep listening
            if (liveCallActive && !miraSpeaking) {
                startListening();
            }
        }
    };

    liveRecognition.onerror = (event) => {
        if (!liveCallActive) return;
        if (event.error === 'no-speech' || event.error === 'aborted') {
            // Restart listening silently
            if (liveCallActive && !miraSpeaking) {
                startListening();
            }
        } else {
            voiceConvoLabel.textContent = 'Listening...';
            if (liveCallActive && !miraSpeaking) {
                setTimeout(() => startListening(), 500);
            }
        }
    };

    liveRecognition.start();
}

async function handleLiveUserSpeech(text) {
    // Show user message in chat
    addUserMessage(text, null, false, []);

    // Get Mira's response from Ollama
    voiceConvoLabel.textContent = 'Mira is thinking...';
    const response = await getMiraResponse(text);

    if (!liveCallActive) return;

    // Show Mira's response in chat
    renderMiraMessage(response, getTimeString(), false);

    // Speak it
    voiceConvoLabel.textContent = 'Mira is speaking...';
    miraSpeaking = true;

    speakAndThen(response, () => {
        miraSpeaking = false;
        if (liveCallActive) {
            startListening();
        }
    });
}

function speakAndThen(text, callback) {
    if (!window.speechSynthesis) {
        if (callback) callback();
        return;
    }

    const cleanText = text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}]/gu, '').trim();
    if (!cleanText) {
        if (callback) callback();
        return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voice = getPreferredVoice();
    if (voice) utterance.voice = voice;
    utterance.rate = 0.92;
    utterance.pitch = 1.15;
    utterance.volume = 0.9;

    utterance.onend = () => {
        if (callback) callback();
    };

    utterance.onerror = () => {
        if (callback) callback();
    };

    window.speechSynthesis.speak(utterance);
}

function endLiveCall() {
    if (!liveCallActive) return;
    liveCallActive = false;

    // Stop speech recognition
    if (liveRecognition) {
        try { liveRecognition.abort(); } catch (e) {}
        liveRecognition = null;
    }

    // Stop TTS
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    miraSpeaking = false;

    // Stop timer
    clearInterval(liveCallTimerInterval);

    // Stop waveform
    clearInterval(liveWaveInterval);
    voiceConvoWaves.innerHTML = '';

    // Stop mic stream
    if (liveStream) {
        liveStream.getTracks().forEach(t => t.stop());
        liveStream = null;
    }

    // Close audio context
    if (liveAudioCtx) {
        liveAudioCtx.close().catch(() => {});
        liveAudioCtx = null;
        liveAnalyser = null;
    }

    // Reset UI
    voiceReplyBtn.classList.remove('active');
    voiceConvoBar.classList.add('hidden');
    document.querySelector('.input-container').classList.remove('hidden');
    voiceConvoTimer.textContent = '0:00';
    voiceConvoLabel.textContent = 'Connecting...';

    // Farewell message via AI
    const duration = Math.floor((Date.now() - liveCallStartTime) / 1000);
    const durationStr = `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`;
    addMiraAIMessage(`Our live voice call just ended. It lasted ${durationStr}. Say a brief warm goodbye and let me know you're always here.`);
}

function getPreferredVoice() {
    const voices = window.speechSynthesis.getVoices();
    const preferred = [
        'Microsoft Zira', 'Zira', 'Samantha', 'Karen', 'Moira', 'Fiona',
        'Google UK English Female', 'Google US English',
        'Microsoft Aria', 'Aria', 'Jenny', 'Microsoft Jenny'
    ];
    for (const name of preferred) {
        const match = voices.find(v => v.name.includes(name));
        if (match) return match;
    }
    const englishVoice = voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('female'));
    if (englishVoice) return englishVoice;
    const anyEnglish = voices.find(v => v.lang.startsWith('en'));
    if (anyEnglish) return anyEnglish;
    return voices[0] || null;
}

function miraSay(text) {
    if (!window.speechSynthesis) return;
    const cleanText = text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}]/gu, '').trim();
    if (!cleanText) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voice = getPreferredVoice();
    if (voice) utterance.voice = voice;
    utterance.rate = 0.92;
    utterance.pitch = 1.15;
    utterance.volume = 0.9;
    window.speechSynthesis.speak(utterance);
}

function miraVoiceReply(text) {
    if (!window.speechSynthesis) return;
    const cleanText = text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}]/gu, '').trim();
    if (!cleanText) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voice = getPreferredVoice();
    if (voice) utterance.voice = voice;
    utterance.rate = 0.92;
    utterance.pitch = 1.15;
    utterance.volume = 0.9;

    const timeStr = getTimeString();
    const estimatedDuration = Math.max(2, Math.ceil(cleanText.split(/\s+/).length / 2.5));
    const durationStr = `${Math.floor(estimatedDuration / 60)}:${(estimatedDuration % 60).toString().padStart(2, '0')}`;

    const bars = Array.from({ length: 28 }, () => {
        const h = Math.floor(Math.random() * 18) + 6;
        return `<div class="voice-waveform-bar" style="height:${h}px"></div>`;
    }).join('');

    const messageDiv = document.createElement('div');
    messageDiv.className = 'message mira-message';
    messageDiv.innerHTML = `
        <div class="message-avatar">
            <img src="7DFD653D-7DAA-482A-9768-398D3885CB78.png" alt="Mira">
        </div>
        <div class="message-content">
            <span class="message-sender">Mira</span>
            <div class="message-bubble">
                <div class="voice-message-player mira-voice-player" data-tts-text="${cleanText.replace(/"/g, '&quot;')}">
                    <button class="voice-play-btn"><i class="fas fa-play"></i></button>
                    <div class="voice-waveform">${bars}</div>
                    <span class="voice-duration">${durationStr}</span>
                </div>
            </div>
            <span class="message-time">${timeStr}</span>
        </div>
    `;
    chatMessages.appendChild(messageDiv);
    scrollToBottom();

    wireMiraVoicePlayer(messageDiv.querySelector('.mira-voice-player'));

    chatHistory.push({ sender: 'mira', text: '🎧 Voice reply', time: timeStr, ttsText: cleanText, ttsVoice: true });
    saveCurrentConvo();
    renderSidebarList();

    // Auto-play the voice reply
    utterance.addEventListener('timeupdate', () => {});
    const playBtn = messageDiv.querySelector('.voice-play-btn');
    const waveformBars = messageDiv.querySelectorAll('.voice-waveform-bar');
    playBtn.innerHTML = '<i class="fas fa-pause"></i>';

    let animInterval = setInterval(() => {
        const randomActive = Math.floor(Math.random() * waveformBars.length);
        waveformBars.forEach((b, i) => {
            b.classList.toggle('active', Math.abs(i - randomActive) < 4);
        });
    }, 150);

    utterance.onend = () => {
        clearInterval(animInterval);
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
        waveformBars.forEach(b => b.classList.remove('active'));
    };

    window.speechSynthesis.speak(utterance);
}

function renderMiraTtsMessage(ttsText, time) {
    const timeStr = time || getTimeString();
    const estimatedDuration = Math.max(2, Math.ceil(ttsText.split(/\s+/).length / 2.5));
    const durationStr = `${Math.floor(estimatedDuration / 60)}:${(estimatedDuration % 60).toString().padStart(2, '0')}`;

    const bars = Array.from({ length: 28 }, () => {
        const h = Math.floor(Math.random() * 18) + 6;
        return `<div class="voice-waveform-bar" style="height:${h}px"></div>`;
    }).join('');

    const messageDiv = document.createElement('div');
    messageDiv.className = 'message mira-message';
    messageDiv.innerHTML = `
        <div class="message-avatar">
            <img src="7DFD653D-7DAA-482A-9768-398D3885CB78.png" alt="Mira">
        </div>
        <div class="message-content">
            <span class="message-sender">Mira</span>
            <div class="message-bubble">
                <div class="voice-message-player mira-voice-player" data-tts-text="${ttsText.replace(/"/g, '&quot;')}">
                    <button class="voice-play-btn"><i class="fas fa-play"></i></button>
                    <div class="voice-waveform">${bars}</div>
                    <span class="voice-duration">${durationStr}</span>
                </div>
            </div>
            <span class="message-time">${timeStr}</span>
        </div>
    `;
    chatMessages.appendChild(messageDiv);
    wireMiraVoicePlayer(messageDiv.querySelector('.mira-voice-player'));
}

function wireMiraVoicePlayer(player) {
    const playBtn = player.querySelector('.voice-play-btn');
    const bars = player.querySelectorAll('.voice-waveform-bar');
    let speaking = false;

    playBtn.addEventListener('click', () => {
        if (speaking) {
            window.speechSynthesis.cancel();
            speaking = false;
            playBtn.innerHTML = '<i class="fas fa-play"></i>';
            bars.forEach(b => b.classList.remove('active'));
            return;
        }

        const ttsText = player.dataset.ttsText;
        if (!ttsText) return;

        const utterance = new SpeechSynthesisUtterance(ttsText);
        const voice = getPreferredVoice();
        if (voice) utterance.voice = voice;
        utterance.rate = 0.92;
        utterance.pitch = 1.15;
        utterance.volume = 0.9;

        speaking = true;
        playBtn.innerHTML = '<i class="fas fa-pause"></i>';

        let animInterval = setInterval(() => {
            const randomActive = Math.floor(Math.random() * bars.length);
            bars.forEach((b, i) => {
                b.classList.toggle('active', Math.abs(i - randomActive) < 4);
            });
        }, 150);

        utterance.onend = () => {
            clearInterval(animInterval);
            speaking = false;
            playBtn.innerHTML = '<i class="fas fa-play"></i>';
            bars.forEach(b => b.classList.remove('active'));
        };

        window.speechSynthesis.speak(utterance);
    });
}

// Pre-load voices (some browsers need this)
if (window.speechSynthesis) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
    };
}

// ---- Settings Modal ----
settingsBtn.addEventListener('click', () => {
    settingsModal.classList.add('active');
    closeSidebar();
});

settingsClose.addEventListener('click', () => {
    settingsModal.classList.remove('active');
});

settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
        settingsModal.classList.remove('active');
    }
});

// ---- Chat Functionality ----
function getTimeString() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
}

function addUserMessage(text, time, skipSave, attachments) {
    const timeStr = time || getTimeString();
    const atts = attachments || [];
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message user-message';

    // Build media HTML
    let mediaHtml = '';
    if (atts.length > 0) {
        const mediaItems = atts.map(att => {
            if (att.type === 'video') {
                return `<video src="${att.dataUrl}" controls playsinline></video>`;
            }
            return `<img src="${att.dataUrl}" alt="Shared image" onclick="openLightbox(this.src)">`;
        }).join('');
        mediaHtml = `<div class="message-media">${mediaItems}</div>`;
    }

    // Build voice HTML
    let voiceHtml = '';
    if (atts.length === 0 && arguments[4]) {
        // voice handled separately via addVoiceMessage
    }

    const textHtml = text ? `<p>${escapeHtml(text)}</p>` : '';

    messageDiv.innerHTML = `
        <div class="message-avatar user-avatar">
            <span>${window.miraUserInitial || 'Y'}</span>
        </div>
        <div class="message-content">
            <div class="message-bubble">
                ${textHtml}
                ${mediaHtml}
            </div>
            <span class="message-time">${timeStr}</span>
        </div>
    `;
    chatMessages.appendChild(messageDiv);
    scrollToBottom();

    if (!skipSave) {
        const entry = { sender: 'user', text: text || '', time: timeStr };
        if (atts.length > 0) {
            entry.attachments = atts.map(a => ({ type: a.type, dataUrl: a.dataUrl }));
        }
        chatHistory.push(entry);
        saveCurrentConvo();
        renderSidebarList();
        onUserMessageSent();
        scrollToBottom();
    }
}

function addMiraMessage(text) {
    // For pre-built text (mood acknowledgments, system messages, etc.)
    typingIndicator.classList.add('active');
    scrollToBottom();

    const delay = Math.min(300 + text.length * 4, 800);
    setTimeout(() => {
        typingIndicator.classList.remove('active');
        renderMiraMessage(text, getTimeString(), false);
    }, delay);
}

async function addMiraAIMessage(userText) {
    // Show typing indicator briefly, then stream directly into a message bubble
    typingIndicator.classList.add('active');
    scrollToBottom();

    // Create the message element early so we can stream into it
    const timeStr = getTimeString();
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message mira-message';
    messageDiv.innerHTML = `
        <div class="message-avatar">
            <img src="7DFD653D-7DAA-482A-9768-398D3885CB78.png" alt="Mira">
        </div>
        <div class="message-content">
            <span class="message-sender">Mira</span>
            <div class="message-bubble"><p></p></div>
            <span class="message-time">${timeStr}</span>
        </div>
    `;

    let messageAdded = false;
    const bubble = messageDiv.querySelector('.message-bubble');

    await getMiraResponseStreaming(
        userText,
        (partialText) => {
            // On first chunk, hide typing indicator and add the message to DOM
            if (!messageAdded) {
                typingIndicator.classList.remove('active');
                chatMessages.appendChild(messageDiv);
                messageAdded = true;
            }
            // Update bubble content with streamed text
            const paragraphs = partialText.split('\n').filter(p => p.trim());
            bubble.innerHTML = paragraphs.map(p => `<p>${p}</p>`).join('');
            scrollToBottom();
        },
        (finalText) => {
            // Ensure typing indicator is hidden
            typingIndicator.classList.remove('active');

            if (!messageAdded) {
                // Fallback: streaming never sent a chunk (error path)
                const paragraphs = finalText.split('\n').filter(p => p.trim());
                bubble.innerHTML = paragraphs.map(p => `<p>${p}</p>`).join('');
                chatMessages.appendChild(messageDiv);
            }

            // Save to history
            chatHistory.push({ sender: 'mira', text: finalText, time: timeStr });
            saveCurrentConvo();
            renderSidebarList();
            scrollToBottom();
        }
    );
}

function renderMiraMessage(text, time, skipSave) {
    const timeStr = time || getTimeString();
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message mira-message';

    // Split text by newlines or sentences for paragraph formatting
    const paragraphs = text.split('\n').filter(p => p.trim());
    const paragraphsHtml = paragraphs.map(p => `<p>${p}</p>`).join('');

    messageDiv.innerHTML = `
        <div class="message-avatar">
            <img src="7DFD653D-7DAA-482A-9768-398D3885CB78.png" alt="Mira">
        </div>
        <div class="message-content">
            <span class="message-sender">Mira</span>
            <div class="message-bubble">
                ${paragraphsHtml}
            </div>
            <span class="message-time">${timeStr}</span>
        </div>
    `;
    chatMessages.appendChild(messageDiv);
    scrollToBottom();

    if (!skipSave) {
        chatHistory.push({ sender: 'mira', text, time: timeStr });
        saveCurrentConvo();
        renderSidebarList();
    }
}

let isResponding = false;

async function sendMessage() {
    if (isResponding) return;
    const text = messageInput.value.trim();
    const attachments = [...pendingAttachments];

    if (!text && attachments.length === 0) return;

    isResponding = true;
    sendBtn.disabled = true;
    messageInput.disabled = true;

    addUserMessage(text, null, false, attachments);
    messageInput.value = '';
    messageInput.style.height = 'auto';
    sendBtn.classList.remove('active');
    pendingAttachments = [];
    attachmentPreview.innerHTML = '';

    // Mira responds via Ollama
    if (attachments.length > 0 && !text) {
        await addMiraAIMessage("The user just shared an image or video with you. React warmly and ask about it.");
    } else {
        await addMiraAIMessage(text);
    }

    isResponding = false;
    sendBtn.disabled = false;
    messageInput.disabled = false;
    messageInput.focus();
}

function scrollToBottom() {
    requestAnimationFrame(() => {
        chatArea.scrollTop = chatArea.scrollHeight;
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ---- Input Handling ----
messageInput.addEventListener('input', () => {
    // Auto-resize textarea
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';

    // Toggle send button active state
    if (messageInput.value.trim() || pendingAttachments.length > 0) {
        sendBtn.classList.add('active');
    } else {
        sendBtn.classList.remove('active');
    }
});

messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

sendBtn.addEventListener('click', sendMessage);

// ---- New Entry ----
newEntryBtn.addEventListener('click', () => {
    startFreshConvo();
    addMiraAIMessage("I just started a brand new conversation with you. Greet me like we're starting fresh — short and warm.");
    closeSidebar();
});

// ---- Pending attachments ----
let pendingAttachments = []; // { type: 'image'|'video', dataUrl: string, name: string }

attachBtn.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', () => {
    const files = Array.from(fileInput.files);
    files.forEach(file => {
        if (file.size > 10 * 1024 * 1024) return; // 10MB limit
        const reader = new FileReader();
        reader.onload = (e) => {
            const type = file.type.startsWith('video') ? 'video' : 'image';
            const attachment = { type, dataUrl: e.target.result, name: file.name };
            pendingAttachments.push(attachment);
            renderAttachmentPreview();
            sendBtn.classList.add('active');
        };
        reader.readAsDataURL(file);
    });
    fileInput.value = '';
});

function renderAttachmentPreview() {
    attachmentPreview.innerHTML = '';
    pendingAttachments.forEach((att, i) => {
        const thumb = document.createElement('div');
        thumb.className = 'attachment-thumb';
        if (att.type === 'video') {
            thumb.innerHTML = `<video src="${att.dataUrl}" muted></video>`;
        } else {
            thumb.innerHTML = `<img src="${att.dataUrl}" alt="${att.name}">`;
        }
        const removeBtn = document.createElement('button');
        removeBtn.className = 'attachment-thumb-remove';
        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
        removeBtn.addEventListener('click', () => {
            pendingAttachments.splice(i, 1);
            renderAttachmentPreview();
            if (!pendingAttachments.length && !messageInput.value.trim()) {
                sendBtn.classList.remove('active');
            }
        });
        thumb.appendChild(removeBtn);
        attachmentPreview.appendChild(thumb);
    });
}

// ---- Voice Recording ----
let mediaRecorder = null;
let audioChunks = [];
let voiceTimerInterval = null;
let voiceStartTime = 0;
let audioContext = null;
let analyser = null;
let recWaveformInterval = null;
const voiceRecWaveform = document.getElementById('voiceRecWaveform');

voiceBtn.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        stopRecording(true);
    } else {
        startRecording();
    }
});

async function startRecording() {
    // Force-stop live call if active
    if (liveCallActive) {
        endLiveCall();
    }
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) audioChunks.push(e.data);
        };

        mediaRecorder.start();
        voiceBtn.classList.add('recording');
        voiceConvoBar.classList.add('hidden');
        voiceRecordingBar.classList.remove('hidden');
        document.querySelector('.input-container').classList.add('hidden');
        voiceStartTime = Date.now();
        voiceTimerInterval = setInterval(updateVoiceTimer, 100);

        // Live waveform visualization
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(stream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);

        // Create waveform bars
        const barCount = 24;
        voiceRecWaveform.innerHTML = '';
        for (let i = 0; i < barCount; i++) {
            const bar = document.createElement('div');
            bar.className = 'rec-bar';
            bar.style.height = '4px';
            voiceRecWaveform.appendChild(bar);
        }

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        recWaveformInterval = setInterval(() => {
            analyser.getByteFrequencyData(dataArray);
            const bars = voiceRecWaveform.querySelectorAll('.rec-bar');
            bars.forEach((bar, i) => {
                const val = dataArray[i] || 0;
                const height = Math.max(4, (val / 255) * 30);
                bar.style.height = height + 'px';
            });
        }, 60);

    } catch (err) {
        addMiraMessage("I couldn't access your microphone. Please check your browser permissions and try again. 🎤");
    }
}

function updateVoiceTimer() {
    const elapsed = Math.floor((Date.now() - voiceStartTime) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    voiceTimer.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
}

function stopRecording(send) {
    if (!mediaRecorder || mediaRecorder.state !== 'recording') return;

    const currentStream = mediaRecorder.stream;
    const shouldSend = send;

    clearInterval(voiceTimerInterval);
    clearInterval(recWaveformInterval);
    voiceBtn.classList.remove('recording');
    voiceRecordingBar.classList.add('hidden');
    document.querySelector('.input-container').classList.remove('hidden');
    voiceRecWaveform.innerHTML = '';

    if (audioContext) {
        audioContext.close().catch(() => {});
        audioContext = null;
        analyser = null;
    }

    mediaRecorder.onstop = () => {
        currentStream.getTracks().forEach(t => t.stop());

        if (shouldSend) {
            const blob = new Blob(audioChunks, { type: 'audio/webm' });
            const duration = Math.max(1, Math.floor((Date.now() - voiceStartTime) / 1000));
            const reader = new FileReader();
            reader.onload = () => {
                addVoiceMessage(reader.result, duration);
                // Mira responds via AI to the voice note
                addMiraAIMessage("The user just sent you a voice note. You can't hear it, but respond warmly acknowledging you received their voice message and encourage them to keep sharing. Be brief.");
            };
            reader.readAsDataURL(blob);
        }
    };

    voiceTimer.textContent = '0:00';
    mediaRecorder.stop();
    mediaRecorder = null;
}

voiceCancelBtn.addEventListener('click', () => {
    stopRecording(false);
});

voiceSendBtn.addEventListener('click', () => {
    stopRecording(true);
});

function addVoiceMessage(audioDataUrl, duration) {
    const timeStr = getTimeString();
    const durationStr = `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`;

    // Generate random waveform bars
    const bars = Array.from({ length: 28 }, () => {
        const h = Math.floor(Math.random() * 18) + 6;
        return `<div class="voice-waveform-bar" style="height:${h}px"></div>`;
    }).join('');

    const messageDiv = document.createElement('div');
    messageDiv.className = 'message user-message';
    messageDiv.innerHTML = `
        <div class="message-avatar user-avatar">
            <span>${window.miraUserInitial || 'Y'}</span>
        </div>
        <div class="message-content">
            <div class="message-bubble">
                <div class="voice-message-player" data-audio="${audioDataUrl}">
                    <button class="voice-play-btn"><i class="fas fa-play"></i></button>
                    <div class="voice-waveform">${bars}</div>
                    <span class="voice-duration">${durationStr}</span>
                </div>
            </div>
            <span class="message-time">${timeStr}</span>
        </div>
    `;
    chatMessages.appendChild(messageDiv);
    scrollToBottom();

    // Wire up play button
    wireVoicePlayer(messageDiv.querySelector('.voice-message-player'));

    chatHistory.push({ sender: 'user', text: '🎤 Voice message', time: timeStr, voice: audioDataUrl, voiceDuration: duration });
    saveCurrentConvo();
    renderSidebarList();
}

function renderVoiceMessage(audioDataUrl, duration, time) {
    const timeStr = time || getTimeString();
    const dur = duration || 0;
    const durationStr = `${Math.floor(dur / 60)}:${(dur % 60).toString().padStart(2, '0')}`;

    const bars = Array.from({ length: 28 }, () => {
        const h = Math.floor(Math.random() * 18) + 6;
        return `<div class="voice-waveform-bar" style="height:${h}px"></div>`;
    }).join('');

    const messageDiv = document.createElement('div');
    messageDiv.className = 'message user-message';
    messageDiv.innerHTML = `
        <div class="message-avatar user-avatar">
            <span>${window.miraUserInitial || 'Y'}</span>
        </div>
        <div class="message-content">
            <div class="message-bubble">
                <div class="voice-message-player" data-audio="${audioDataUrl}">
                    <button class="voice-play-btn"><i class="fas fa-play"></i></button>
                    <div class="voice-waveform">${bars}</div>
                    <span class="voice-duration">${durationStr}</span>
                </div>
            </div>
            <span class="message-time">${timeStr}</span>
        </div>
    `;
    chatMessages.appendChild(messageDiv);
    wireVoicePlayer(messageDiv.querySelector('.voice-message-player'));
}

function wireVoicePlayer(player) {
    const playBtn = player.querySelector('.voice-play-btn');
    const bars = player.querySelectorAll('.voice-waveform-bar');
    const durationEl = player.querySelector('.voice-duration');
    let audio = null;

    playBtn.addEventListener('click', () => {
        if (audio && !audio.paused) {
            audio.pause();
            audio.currentTime = 0;
            playBtn.innerHTML = '<i class="fas fa-play"></i>';
            bars.forEach(b => b.classList.remove('active'));
            return;
        }

        audio = new Audio(player.dataset.audio);
        playBtn.innerHTML = '<i class="fas fa-pause"></i>';

        audio.addEventListener('timeupdate', () => {
            const progress = audio.currentTime / audio.duration;
            const activeCount = Math.floor(progress * bars.length);
            bars.forEach((b, i) => {
                b.classList.toggle('active', i < activeCount);
            });
        });

        audio.addEventListener('ended', () => {
            playBtn.innerHTML = '<i class="fas fa-play"></i>';
            bars.forEach(b => b.classList.remove('active'));
        });

        audio.play();
    });
}

// ---- Lightbox ----
function openLightbox(src) {
    const overlay = document.createElement('div');
    overlay.className = 'lightbox-overlay';
    overlay.innerHTML = `<img src="${src}" alt="Full size">`;
    overlay.addEventListener('click', () => overlay.remove());
    document.body.appendChild(overlay);
}

// ---- Export & Clear Data ----
exportDataBtn.addEventListener('click', () => {
    const data = {
        conversations: loadConversations(),
        exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mira-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
});

clearDataBtn.addEventListener('click', () => {
    if (confirm('Are you sure? This will delete all your conversations and cannot be undone.')) {
        localStorage.removeItem('mira-conversations');
        localStorage.removeItem('mira-active-convo');
        localStorage.removeItem('mira-mood');
        conversations = [];
        activeConvoId = null;
        chatHistory = [];
        startFreshConvo();
        settingsModal.classList.remove('active');
        addMiraAIMessage("I just cleared all my conversation history and data. This is a completely fresh start. Acknowledge it warmly and briefly.");
    }
});

// ---- Keyboard shortcut: Escape to close modals ----
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        settingsModal.classList.remove('active');
        moodPicker.classList.remove('active');
        closeSidebar();
    }
});

// ---- Restore saved state on load ----
function restoreSavedState() {
    // Always re-read from localStorage to get freshest data
    conversations = loadConversations();
    activeConvoId = localStorage.getItem('mira-active-convo') || null;

    // Restore mood
    const savedMood = localStorage.getItem('mira-mood');
    if (savedMood) {
        setMoodDisplay(savedMood);
    }

    // Restore active conversation or fall back to most recent
    if (activeConvoId && getActiveConvo()) {
        chatHistory = getActiveConvo().messages;
        renderChat();
    } else if (conversations.length > 0) {
        activeConvoId = conversations[0].id;
        localStorage.setItem('mira-active-convo', activeConvoId);
        chatHistory = conversations[0].messages;
        renderChat();
    } else {
        createNewConvo();
        renderChat();
    }

    renderSidebarList();
    scrollToBottom();
}

restoreSavedState();

// ---- Re-sync state when tab becomes visible again ----
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        const savedConvos = loadConversations();
        const savedActiveId = localStorage.getItem('mira-active-convo');
        // Only re-render if something actually changed in storage
        const storedStr = JSON.stringify(savedConvos);
        const memStr = JSON.stringify(conversations);
        if (storedStr !== memStr || savedActiveId !== activeConvoId) {
            conversations = savedConvos;
            activeConvoId = savedActiveId;
            const convo = getActiveConvo();
            chatHistory = convo ? convo.messages : [];
            renderChat();
            renderSidebarList();
        }
    }
});

// ---- Initial scroll to bottom ----
scrollToBottom();

