const chatWindow = document.getElementById('chat-window');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const cardContainer = document.getElementById('card-container');

let history = [];

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, function(tag) {
        const charsToReplace = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        };
        return charsToReplace[tag] || tag;
    });
}

function addMessage(content, sender) {
    const msgDiv = document.createElement('div');
    msgDiv.className =
        (sender === 'user'
            ? 'self-end bg-gpt-input text-white rounded-tl-2xl rounded-tr-2xl rounded-bl-2xl px-4 py-2 max-w-[80%] shadow message flex flex-col'
            : 'self-start bg-gpt-card text-gpt-muted rounded-tl-2xl rounded-tr-2xl rounded-br-2xl px-4 py-2 max-w-[80%] shadow message flex flex-col');
    if (sender === 'bot' && window.marked) {
        msgDiv.innerHTML = window.marked.parse(content);
    } else {
        msgDiv.textContent = escapeHTML(content);
    }
    chatWindow.appendChild(msgDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    updatePreQuestionsBar();
}

function addLoading() {
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'self-start bg-gpt-card text-gpt-muted rounded-tl-2xl rounded-tr-2xl rounded-br-2xl px-4 py-2 max-w-[80%] shadow message flex flex-col';
    loadingDiv.id = 'loading-msg';
    loadingDiv.innerHTML = '<span class="dot-typing"><span></span><span></span><span></span></span>';
    chatWindow.appendChild(loadingDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

function removeLoading() {
    const loadingDiv = document.getElementById('loading-msg');
    if (loadingDiv) loadingDiv.remove();
    updatePreQuestionsBar();
}

function updatePreQuestionsBar() {
    const preBar = document.getElementById('pre-questions-bar');
    const intro = document.getElementById('chat-intro');
    if (!preBar) return;
    if (chatWindow.children.length === 1 && intro) { // only intro present
        preBar.style.display = 'flex';
        intro.style.display = 'flex';
    } else {
        preBar.style.display = 'none';
        if (intro) intro.style.display = 'none';
    }
}

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('Form submitted');
    const message = chatInput.value.trim();
    if (!message) {
        console.log('No message to send');
        return;
    }
    console.log('Message to send:', message);
    cardContainer.classList.add('hidden');
    addMessage(message, 'user');
    history.push({ role: 'user', content: message });
    chatInput.value = '';
    addLoading();
    try {
        const res = await fetch('http://localhost:5000/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, history })
        });
        const data = await res.json();
        removeLoading();
        addMessage(data.response, 'bot');
        history.push({ role: 'assistant', content: data.response });
    } catch (err) {
        console.log('Error reaching server:', err);
        removeLoading();
        addMessage('Error: Could not reach the server.', 'bot');
    }
});

window.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.pre-question').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            chatInput.value = btn.textContent;
            chatForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        });
    });
    document.querySelectorAll('.resume-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const q = btn.getAttribute('data-question');
            if (q) {
                chatInput.value = q;
                chatForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
            }
        });
    });
    updatePreQuestionsBar();

    // Ensure cardContainer is visible initially
    cardContainer.classList.remove('hidden');

    // Create reset button icon
    var resetButton = document.createElement('button');
    resetButton.className = 'reset-icon';
    resetButton.type = 'button'; // Ensure it doesn't submit the form
    resetButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>';
    resetButton.onclick = function () {
        location.reload(); // Refresh the page
        cardContainer.classList.remove('hidden');
        chatWindow.innerHTML = ''; // Clear chat content
        chatInput.value = ''; // Clear input field
    };

    // Insert reset button inside chat input form
    chatForm.querySelector('.flex-1').appendChild(resetButton);

    // Hide cards when chat starts
    chatForm.addEventListener('submit', function (event) {
        event.preventDefault(); // Prevent form submission
        const message = chatInput.value.trim();
        if (message) {
            cardContainer.classList.add('hidden'); // Hide only when a message is sent
        }
        // Add logic to handle sending the chat message here
    });
}); 