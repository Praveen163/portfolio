// Voice Chat Agent JS
// Adds mic and play buttons, handles recording, STT, chat, TTS, and playback

document.addEventListener('DOMContentLoaded', function () {
    // Add mic and play buttons next to chat input
    const chatForm = document.getElementById('chat-form');
    const inputDiv = chatForm.querySelector('.flex-1');
    if (!document.getElementById('mic-btn')) {
        const micBtn = document.createElement('button');
        micBtn.id = 'mic-btn';
        micBtn.type = 'button';
        micBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="28" height="28"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18v2m0 0a6 6 0 01-6-6h0a6 6 0 016-6h0a6 6 0 016 6h0a6 6 0 01-6 6zm0 0V6m0 0a2 2 0 012 2v4a2 2 0 01-4 0V8a2 2 0 012-2z" /></svg>';
        micBtn.style.marginLeft = '0.5rem';
        inputDiv.appendChild(micBtn);
    }
    if (!document.getElementById('play-btn')) {
        const playBtn = document.createElement('button');
        playBtn.id = 'play-btn';
        playBtn.type = 'button';
        playBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="28" height="28"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-6.518-3.759A1 1 0 007 8.118v7.764a1 1 0 001.234.97l6.518-1.857A1 1 0 0016 14.118V9.882a1 1 0 00-1.248-.714z" /></svg>';
        playBtn.style.marginLeft = '0.5rem';
        inputDiv.appendChild(playBtn);
    }

    let lastAIResponse = '';
    let lastTTSBlob = null;

    // Mic button logic
    let mediaRecorder;
    let audioChunks = [];
    const micBtn = document.getElementById('mic-btn');
    micBtn.addEventListener('click', async function () {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
            micBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="28" height="28"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18v2m0 0a6 6 0 01-6-6h0a6 6 0 016-6h0a6 6 0 016 6h0a6 6 0 01-6 6zm0 0V6m0 0a2 2 0 012 2v4a2 2 0 01-4 0V8a2 2 0 012-2z" /></svg>';
            return;
        }
        // Start recording
        audioChunks = [];
        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
            mediaRecorder = new MediaRecorder(stream);
            mediaRecorder.start();
            micBtn.innerHTML = '<span style="color:red;font-weight:bold;">●</span>';
            mediaRecorder.ondataavailable = e => {
                audioChunks.push(e.data);
            };
            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                // Send to /transcribe
                const formData = new FormData();
                formData.append('audio', audioBlob, 'recording.wav');
                const res = await fetch('/transcribe', { method: 'POST', body: formData });
                const data = await res.json();
                if (data.transcript) {
                    // Display transcript as user message
                    if (window.addMessage) addMessage(data.transcript, 'user');
                    // Send to /chat
                    const chatRes = await fetch('/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ message: data.transcript, history: window.history || [] })
                    });
                    const chatData = await chatRes.json();
                    lastAIResponse = chatData.response;
                    if (window.addMessage) addMessage(lastAIResponse, 'bot');
                    // Send to /tts
                    const ttsRes = await fetch('/tts', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text: lastAIResponse })
                    });
                    const ttsBlob = await ttsRes.blob();
                    lastTTSBlob = ttsBlob;
                }
            };
        });
    });

    // Play button logic
    const playBtn = document.getElementById('play-btn');
    playBtn.addEventListener('click', function () {
        if (lastTTSBlob) {
            const audioUrl = URL.createObjectURL(lastTTSBlob);
            const audio = new Audio(audioUrl);
            audio.play();
        }
    });
}); 