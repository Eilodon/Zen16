import { getSharedAudioContext } from './audioContext';

export const playEmergencyAlert = async () => {
  const audioContext = await getSharedAudioContext();
  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  const lfo = audioContext.createOscillator();
  const lfoGain = audioContext.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.value = 150;
  gainNode.gain.value = 0.0001;

  lfo.type = 'sine';
  lfo.frequency.value = 2;
  lfoGain.gain.value = 10;

  lfo.connect(lfoGain);
  lfoGain.connect(oscillator.frequency);
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  const now = audioContext.currentTime;
  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.exponentialRampToValueAtTime(0.2, now + 0.12);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 3);

  oscillator.start(now);
  lfo.start(now);
  oscillator.stop(now + 3.05);
  lfo.stop(now + 3.05);

  oscillator.onended = () => {
    oscillator.disconnect();
    lfo.disconnect();
    lfoGain.disconnect();
    gainNode.disconnect();
  };
};
