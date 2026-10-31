/**
 * Audio Chime & SpeechSynthesis Announcer for Hospital TV Calling System
 */

// Generate a pleasant 2-tone hospital chime using Web Audio API
function playChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    gain1.gain.setValueAtTime(0.2, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.6);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.25); // A5
    gain2.gain.setValueAtTime(0.25, ctx.currentTime + 0.25);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.25);
    osc2.stop(ctx.currentTime + 0.9);
  } catch (e) {
    console.debug('AudioContext not allowed or unsupported:', e);
  }
}

export function announceTokenCall(tokenNumber, doctorName, roomNumber) {
  // 1. Play chime
  playChime();

  // 2. Synthesize voice after short chime delay
  if ('speechSynthesis' in window) {
    setTimeout(() => {
      // Split token like CARD-103 into "Card, 1 0 3" for clear pronunciation
      const tokenSpoken = tokenNumber.replace(/(\w+)-(\d+)/, (match, prefix, num) => {
        return `${prefix}, ${num.split('').join(' ')}`;
      });

      const text = `Attention please: Token number ${tokenSpoken}. Please proceed to ${roomNumber}, ${doctorName}.`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.92;
      utterance.pitch = 1.05;
      utterance.volume = 1.0;
      
      // Select pleasant voice if available
      const voices = window.speechSynthesis.getVoices();
      const englishVoice = voices.find(v => v.lang.includes('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Zira')));
      if (englishVoice) {
        utterance.voice = englishVoice;
      }

      window.speechSynthesis.cancel(); // Cancel any lingering speech
      window.speechSynthesis.speak(utterance);
    }, 450);
  }
}
