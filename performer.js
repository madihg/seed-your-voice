// ===== WORDS MANAGEMENT =====
let currentWords = [];
let pollInterval;

async function fetchWords() {
    try {
        const response = await fetch('/api/get-words');
        const data = await response.json();
        
        if (data.words && JSON.stringify(data.words) !== JSON.stringify(currentWords)) {
            currentWords = data.words;
            updateWordsDisplay();
            updatePhonePreview();
        }
    } catch (error) {
        console.error('Error fetching words:', error);
    }
}

function updateWordsDisplay() {
    const container = document.getElementById('wordsContainer');
    const countSpan = document.getElementById('wordCount');
    
    countSpan.textContent = currentWords.length;
    
    if (currentWords.length === 0) {
        container.innerHTML = 'Waiting for words...';
        return;
    }
    
    container.innerHTML = currentWords
        .map(w => `<span class="word-tag">${w.word}</span>`)
        .join('');
}

function updatePhonePreview() {
    const fieldScreen = document.getElementById('fieldScreen');
    fieldScreen.innerHTML = '';
    
    currentWords.forEach(w => {
        const dot = document.createElement('div');
        dot.className = 'dot';
        dot.style.left = w.x + '%';
        dot.style.top = w.y + '%';
        fieldScreen.appendChild(dot);
    });
}

async function clearWords() {
    if (!confirm('Clear all words?')) return;
    
    try {
        await fetch('/api/clear-words', { method: 'POST' });
        currentWords = [];
        updateWordsDisplay();
        updatePhonePreview();
        document.getElementById('songOutput').textContent = 'Song will appear here...';
    } catch (error) {
        console.error('Error clearing words:', error);
        alert('Failed to clear words');
    }
}

// ===== SONG GENERATION =====
async function generateSong() {
    if (currentWords.length === 0) {
        alert('No words to generate from!');
        return;
    }

    const generateBtn = document.getElementById('generateSongBtn');
    const songOutput = document.getElementById('songOutput');
    
    generateBtn.disabled = true;
    generateBtn.textContent = 'GENERATING...';
    songOutput.textContent = '';

    try {
        const response = await fetch('/api/generate-song', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ words: currentWords })
        });

        if (!response.ok) {
            throw new Error('Failed to generate song');
        }

        // Read the streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let songText = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = JSON.parse(line.slice(6));
                    
                    if (data.content) {
                        songText += data.content;
                        songOutput.textContent = songText;
                    }
                    
                    if (data.error) {
                        throw new Error(data.error);
                    }
                    
                    if (data.done) {
                        console.log('Song generation complete');
                    }
                }
            }
        }

    } catch (error) {
        console.error('Error generating song:', error);
        songOutput.textContent = 'Error generating song: ' + error.message;
    } finally {
        generateBtn.disabled = false;
        generateBtn.textContent = 'SPROUT A LANGUAGE';
        hasSproutedLanguage = true;
        updateVoiceToggleState();
    }
}

// ===== DOT-TO-VOICE PARAMETER MAPPING =====
function calculateVoiceParameters() {
    if (currentWords.length === 0) {
        return null;
    }

    // Calculate statistics from dot positions
    const avgX = currentWords.reduce((sum, w) => sum + w.x, 0) / currentWords.length;
    const avgY = currentWords.reduce((sum, w) => sum + w.y, 0) / currentWords.length;
    
    // Calculate spread (standard deviation)
    const spreadX = Math.sqrt(
        currentWords.reduce((sum, w) => sum + Math.pow(w.x - avgX, 2), 0) / currentWords.length
    );
    const spreadY = Math.sqrt(
        currentWords.reduce((sum, w) => sum + Math.pow(w.y - avgY, 2), 0) / currentWords.length
    );
    
    // Density (how clustered the dots are)
    const density = 100 - Math.min((spreadX + spreadY) / 2, 100);
    
    // Map to parameters
    // X position (0-100) affects pitch and filter
    // Y position (0-100) affects reverb and delay
    // Density affects distortion and whisper
    
    return {
        pitch: ((avgX - 50) / 50) * 12, // -12 to +12
        reverbMix: Math.min(Math.max(avgY, 0), 100), // 0-100
        delayTime: (avgY / 100) * 0.8 + 0.2, // 0.2-1.0
        delayFeedback: Math.min(Math.max(spreadY, 0), 90), // 0-90
        filterFreq: 200 + (avgX / 100) * 9800, // 200-10000
        distortion: Math.min(Math.max(density, 0), 100), // 0-100
        whisperEffect: Math.min(Math.max(100 - avgY, 0), 100), // 0-100
        masterVolume: 80 // Keep constant
    };
}

function animateSlider(sliderId, targetValue, duration = 1000) {
    const slider = document.getElementById(sliderId);
    const startValue = parseFloat(slider.value);
    const startTime = performance.now();
    
    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease-out function
        const eased = 1 - Math.pow(1 - progress, 3);
        const currentValue = startValue + (targetValue - startValue) * eased;
        
        slider.value = currentValue;
        
        // Trigger input event to update display and audio
        slider.dispatchEvent(new Event('input'));
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }
    
    requestAnimationFrame(animate);
}

function generateVoiceFromDots() {
    if (currentWords.length === 0) {
        alert('No dots to generate voice from!');
        return;
    }

    const params = calculateVoiceParameters();
    if (!params) return;

    // Animate all sliders to new values
    animateSlider('pitchShift', params.pitch);
    animateSlider('reverbMix', params.reverbMix);
    animateSlider('delayTime', params.delayTime);
    animateSlider('delayFeedback', params.delayFeedback);
    animateSlider('filterFreq', params.filterFreq);
    animateSlider('distortion', params.distortion);
    animateSlider('whisperEffect', params.whisperEffect);
    animateSlider('masterVolume', params.masterVolume);
    
    hasBloomedSound = true;
    updateVoiceToggleState();
}

// ===== VOICE MODULATION =====
let audioContext;
let microphone;
let isVoiceActive = false;
let hasSproutedLanguage = false;
let hasBloomedSound = false;

// Audio nodes
let sourceNode;
let pitchShiftNode;
let reverbNode;
let delayNode;
let feedbackGain;
let filterNode;
let distortionNode;
let whisperNode;
let masterGain;

async function initAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create reverb (convolver)
        reverbNode = audioContext.createConvolver();
        reverbNode.buffer = createReverbImpulse();
        
        // Create delay
        delayNode = audioContext.createDelay(2.0);
        delayNode.delayTime.value = 0.3;
        
        feedbackGain = audioContext.createGain();
        feedbackGain.gain.value = 0.3;
        
        // Create filter
        filterNode = audioContext.createBiquadFilter();
        filterNode.type = 'lowpass';
        filterNode.frequency.value = 5000;
        
        // Create distortion
        distortionNode = audioContext.createWaveShaper();
        distortionNode.curve = makeDistortionCurve(0);
        
        // Whisper effect (noise + formant filter)
        whisperNode = audioContext.createGain();
        whisperNode.gain.value = 0;
        
        // Master volume
        masterGain = audioContext.createGain();
        masterGain.gain.value = 0.8;
    }
}

function updateVoiceToggleState() {
    const voiceToggle = document.getElementById('voiceToggle');
    
    if (hasSproutedLanguage && hasBloomedSound) {
        voiceToggle.classList.remove('inactive');
        voiceToggle.disabled = false;
    } else {
        voiceToggle.classList.add('inactive');
        voiceToggle.disabled = true;
    }
}

async function toggleVoice() {
    const voiceToggle = document.getElementById('voiceToggle');
    const voiceStatus = document.getElementById('voiceStatus');
    
    // Can't activate until both sprout and bloom are done
    if (!hasSproutedLanguage || !hasBloomedSound) {
        return;
    }
    
    if (!isVoiceActive) {
        try {
            await initAudioContext();
            
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                }
            });
            
            microphone = stream;
            sourceNode = audioContext.createMediaStreamSource(stream);
            
            // Create dry/wet mixing for reverb
            const dryGain = audioContext.createGain();
            const wetGain = audioContext.createGain();
            dryGain.gain.value = 0.7;
            wetGain.gain.value = 0.3;
            
            // Signal chain
            sourceNode.connect(filterNode);
            filterNode.connect(distortionNode);
            distortionNode.connect(dryGain);
            distortionNode.connect(reverbNode);
            reverbNode.connect(wetGain);
            
            // Delay feedback loop
            distortionNode.connect(delayNode);
            delayNode.connect(feedbackGain);
            feedbackGain.connect(delayNode);
            delayNode.connect(wetGain);
            
            // Mix to output
            dryGain.connect(masterGain);
            wetGain.connect(masterGain);
            masterGain.connect(audioContext.destination);
            
            isVoiceActive = true;
            voiceToggle.textContent = 'STOP BREATHING';
            voiceStatus.textContent = 'MICROPHONE: ACTIVE';
            voiceStatus.classList.add('active');
            
        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert('Failed to access microphone: ' + error.message);
        }
    } else {
        // Stop microphone
        if (microphone) {
            microphone.getTracks().forEach(track => track.stop());
        }
        if (sourceNode) {
            sourceNode.disconnect();
        }
        
        isVoiceActive = false;
        voiceToggle.textContent = 'BREATHE A VOICE';
        voiceStatus.textContent = 'MICROPHONE: OFF';
        voiceStatus.classList.remove('active');
    }
}

// Reverb impulse response generator
function createReverbImpulse() {
    const sampleRate = audioContext.sampleRate;
    const length = sampleRate * 2; // 2 second reverb
    const impulse = audioContext.createBuffer(2, length, sampleRate);
    const leftChannel = impulse.getChannelData(0);
    const rightChannel = impulse.getChannelData(1);
    
    for (let i = 0; i < length; i++) {
        const decay = Math.exp(-i / (sampleRate * 0.5));
        leftChannel[i] = (Math.random() * 2 - 1) * decay;
        rightChannel[i] = (Math.random() * 2 - 1) * decay;
    }
    
    return impulse;
}

// Distortion curve generator
function makeDistortionCurve(amount) {
    const k = amount;
    const samples = 44100;
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;
    
    for (let i = 0; i < samples; i++) {
        const x = (i * 2 / samples) - 1;
        curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
    }
    
    return curve;
}

// ===== EVENT LISTENERS =====
document.getElementById('generateSongBtn').addEventListener('click', generateSong);
document.getElementById('clearBtn').addEventListener('click', clearWords);
document.getElementById('voiceToggle').addEventListener('click', toggleVoice);
document.getElementById('generateVoiceBtn').addEventListener('click', generateVoiceFromDots);

// Voice control sliders
document.getElementById('pitchShift').addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    document.getElementById('pitchValue').textContent = value.toFixed(1);
});

document.getElementById('reverbMix').addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    document.getElementById('reverbValue').textContent = value + '%';
});

document.getElementById('delayTime').addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    document.getElementById('delayValue').textContent = value.toFixed(2) + 's';
    if (delayNode) {
        delayNode.delayTime.value = value;
    }
});

document.getElementById('delayFeedback').addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    document.getElementById('feedbackValue').textContent = value + '%';
    if (feedbackGain) {
        feedbackGain.gain.value = value / 100;
    }
});

document.getElementById('filterFreq').addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    document.getElementById('filterValue').textContent = value + 'Hz';
    if (filterNode) {
        filterNode.frequency.value = value;
    }
});

document.getElementById('distortion').addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    document.getElementById('distortionValue').textContent = value;
    if (distortionNode) {
        distortionNode.curve = makeDistortionCurve(value);
    }
});

document.getElementById('whisperEffect').addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    document.getElementById('whisperValue').textContent = value + '%';
    if (filterNode && value > 0) {
        // Lower frequencies for whisper effect
        filterNode.frequency.value = 5000 - (value * 40);
    }
});

document.getElementById('masterVolume').addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    document.getElementById('volumeValue').textContent = value + '%';
    if (masterGain) {
        masterGain.gain.value = value / 100;
    }
});

// ===== MODAL CONTROLS =====
const hamburgerBtn = document.getElementById('hamburgerBtn');
const qrModal = document.getElementById('qrModal');
const modalClose = document.getElementById('modalClose');

hamburgerBtn.addEventListener('click', () => {
    qrModal.classList.add('active');
});

modalClose.addEventListener('click', () => {
    qrModal.classList.remove('active');
});

qrModal.addEventListener('click', (e) => {
    if (e.target === qrModal) {
        qrModal.classList.remove('active');
    }
});

// ===== QR CODE GENERATION =====
function generateQRCode() {
    const audienceUrl = window.location.origin + '/audience.html';
    document.getElementById('audienceUrl').textContent = audienceUrl;
    
    new QRCode(document.getElementById('qrcode'), {
        text: audienceUrl,
        width: 200,
        height: 200,
        colorDark: '#000000',
        colorLight: '#FFFFFF',
        correctLevel: QRCode.CorrectLevel.M
    });
}

// ===== INITIALIZATION =====
// Generate QR code
generateQRCode();

// Start polling for words
pollInterval = setInterval(fetchWords, 2000);
fetchWords(); // Initial fetch

// Set initial voice toggle state
updateVoiceToggleState();
