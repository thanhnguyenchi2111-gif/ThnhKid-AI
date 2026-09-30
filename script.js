const GROQ_API_KEY = "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";
const SELECTED_MODEL = "openai/gpt-oss-120b";

let chats = JSON.parse(localStorage.getItem('ai_chats_history')) || [];
let currentChatId = null;
let isGenerating = false;

const chatMessages = document.getElementById('chat-messages');
const welcomeBox = document.getElementById('welcome-box');
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const historyList = document.getElementById('history-list');
const currentChatTitle = document.getElementById('current-chat-title');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');

// Xử lý bật/tắt Sidebar chuẩn Mobile
function openSidebar() {
  sidebar.classList.remove('-translate-x-full');
  sidebarOverlay.classList.remove('hidden');
}

function closeSidebar() {
  sidebar.classList.add('-translate-x-full');
  sidebarOverlay.classList.add('hidden');
}

document.getElementById('btn-toggle-sidebar').addEventListener('click', () => {
  if (sidebar.classList.contains('-translate-x-full')) {
    openSidebar();
  } else {
    closeSidebar();
  }
});

document.getElementById('btn-close-sidebar').addEventListener('click', closeSidebar);
sidebarOverlay.addEventListener('click', closeSidebar);

document.getElementById('btn-theme').addEventListener('click', () => document.documentElement.classList.toggle('dark'));

document.getElementById('btn-new-chat').addEventListener('click', () => {
  createNewChat();
  if (window.innerWidth < 768) closeSidebar();
});

document.getElementById('btn-delete-current').addEventListener('click', () => {
  if (!currentChatId) return;
  chats = chats.filter(c => c.id !== currentChatId);
  saveToStorage();
  if (chats.length > 0) {
    loadChat(chats[0].id);
  } else {
    createNewChat();
  }
});

function createNewChat() {
  currentChatId = Date.now().toString();
  const newChat = {
    id: currentChatId,
    title: "Đoạn chat mới",
    messages: [{ role: "system", content: "Bạn là một trợ lý AI thông minh, luôn trả lời bằng tiếng Việt lịch sự và chuẩn xác." }]
  };
  chats.unshift(newChat);
  saveToStorage();
  renderHistoryList();
  loadChat(currentChatId);
}

function saveToStorage() {
  localStorage.setItem('ai_chats_history', JSON.stringify(chats));
}

function renderHistoryList() {
  historyList.innerHTML = '';
  chats.forEach(chat => {
    const btn = document.createElement('button');
    const isActive = chat.id === currentChatId;
    btn.className = `w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium truncate flex items-center gap-2 transition ${isActive ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 font-semibold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'}`;
    btn.innerHTML = `<i class="fa-regular fa-message text-xs opacity-70"></i> <span class="truncate">${chat.title}</span>`;
    btn.onclick = () => {
      loadChat(chat.id);
      if (window.innerWidth < 768) closeSidebar();
    };
    historyList.appendChild(btn);
  });
}

function loadChat(chatId) {
  currentChatId = chatId;
  const chat = chats.find(c => c.id === chatId);
  if (!chat) return;

  currentChatTitle.innerText = chat.title;
  renderHistoryList();
  chatMessages.innerHTML = '';

  const userAndAiMsgs = chat.messages.filter(m => m.role !== 'system');
  if (userAndAiMsgs.length === 0) {
    chatMessages.appendChild(welcomeBox);
    welcomeBox.classList.remove('hidden');
  } else {
    welcomeBox.classList.add('hidden');
    userAndAiMsgs.forEach(m => appendMessageUI(m.role, m.content));
  }
}

function generateTitle(firstText) {
  if (firstText.length > 25) {
    return firstText.substring(0, 23) + "...";
  }
  return firstText;
}

userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    submitMessage();
  }
});

chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  submitMessage();
});

function submitMessage() {
  if (isGenerating) return;
  const text = userInput.value.trim();
  if (!text) return;

  userInput.value = '';
  fetchGroqResponse(text);
}

function appendMessageUI(role, content) {
  if (!welcomeBox.classList.contains('hidden')) welcomeBox.classList.add('hidden');
  const isUser = role === 'user';
  const msgDiv = document.createElement('div');
  msgDiv.className = `flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`;
  msgDiv.innerHTML = `
    <div class="flex gap-2.5 max-w-[90%] md:max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}">
      <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isUser ? 'bg-orange-500 text-white' : 'bg-slate-700 text-orange-400'}">
        <i class="fa-solid ${isUser ? 'fa-user' : 'fa-brain'}"></i>
      </div>
      <div class="p-3 rounded-2xl ${isUser ? 'bg-orange-500 text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-100 rounded-tl-none prose dark:prose-invert'} text-sm shadow-sm overflow-hidden">
        ${isUser ? content : marked.parse(content)}
      </div>
    </div>
  `;
  chatMessages.appendChild(msgDiv);
  hljs.highlightAll();
  const chatContainer = document.getElementById('chat-container');
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function appendTyping() {
  const typingDiv = document.createElement('div');
  typingDiv.id = 'typing-indicator';
  typingDiv.className = 'flex justify-start mb-4';
  typingDiv.innerHTML = `
    <div class="flex gap-2.5 items-center">
      <div class="w-7 h-7 rounded-full bg-slate-700 text-orange-400 flex items-center justify-center text-xs shrink-0"><i class="fa-solid fa-brain"></i></div>
      <div class="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-3 rounded-2xl rounded-tl-none flex items-center space-x-1.5 shadow-sm">
        <span class="w-2 h-2 bg-orange-500 rounded-full typing-dot"></span>
        <span class="w-2 h-2 bg-orange-500 rounded-full typing-dot"></span>
        <span class="w-2 h-2 bg-orange-500 rounded-full typing-dot"></span>
      </div>
    </div>`;
  chatMessages.appendChild(typingDiv);
  const chatContainer = document.getElementById('chat-container');
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function removeTyping() {
  const typingDiv = document.getElementById('typing-indicator');
  if (typingDiv) typingDiv.remove();
}

async function fetchGroqResponse(userText) {
  isGenerating = true;

  let chat = chats.find(c => c.id === currentChatId);
  if (!chat) {
    createNewChat();
    chat = chats.find(c => c.id === currentChatId);
  }

  if (chat.messages.length === 1) {
    chat.title = generateTitle(userText);
    currentChatTitle.innerText = chat.title;
    renderHistoryList();
  }

  appendMessageUI('user', userText);
  appendTyping();

  chat.messages.push({ role: 'user', content: userText });
  saveToStorage();

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}` 
      },
      body: JSON.stringify({
        model: SELECTED_MODEL,
        messages: chat.messages
      })
    });

    removeTyping();

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `Lỗi kết nối API (${response.status})`);
    }

    const data = await response.json();
    const aiReply = data.choices[0].message.content;

    chat.messages.push({ role: 'assistant', content: aiReply });
    saveToStorage();
    appendMessageUI('assistant', aiReply);

  } catch (err) {
    removeTyping();
    appendMessageUI('assistant', `⚠️ **Lỗi:** ${err.message}`);
  } finally {
    isGenerating = false;
  }
}

if (chats.length === 0) {
  createNewChat();
} else {
  loadChat(chats[0].id);
}
