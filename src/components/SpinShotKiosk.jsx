import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  attachSimulationToWindow,
  pickModeWeightedDebug,
} from '@/utils/slotSpin';

const MODES = [
  { name: 'Classic Portrait', tier: 'Common', prompt: 'Crisp, clean studio portrait framing.' },
  { name: 'Retro Neon', tier: 'Common', prompt: '1980s neon glow with bold edge lighting.' },
  { name: 'Monochrome Mood', tier: 'Common', prompt: 'High contrast black and white editorial mood.' },
  { name: 'Soft Glow', tier: 'Common', prompt: 'Soft key light with dreamy pastel highlights.' },
  { name: 'Cinematic', tier: 'Common', prompt: 'Wide cinematic color grade with film tone.' },
  { name: 'Street Pop', tier: 'Spicy', prompt: 'Urban graffiti palette and gritty contrast.' },
  { name: 'Cyberpunk Rain', tier: 'Spicy', prompt: 'Rainy night neon reflections and dramatic haze.' },
  { name: 'Prism Burst', tier: 'Spicy', prompt: 'Prismatic flares and saturated electric color.' },
  { name: 'Mythic Gold', tier: 'Legendary', prompt: 'Golden aura with premium red carpet finish.' },
];

const PHASES = {
  IDLE: 'IDLE',
  SPIN: 'SPIN',
  REVEAL: 'REVEAL',
  COUNTDOWN: 'COUNTDOWN',
  CAPTURING: 'CAPTURING',
  PREVIEW: 'PREVIEW',
  PRINTING: 'PRINTING',
  QR: 'QR',
};

const REEL_STOP_MS = [1200, 1800, 2500];
const REEL_ROW_HEIGHT = 56;
const STRIP_REPEAT_COUNT = 40;
const CENTER_ROW_INDEX = 1;

const isDev = import.meta.env.DEV;

const buildStrip = (modes) => {
  const strip = [];
  for (let i = 0; i < STRIP_REPEAT_COUNT; i += 1) {
    strip.push(...modes);
  }
  return strip;
};

const SpinShotKiosk = () => {
  const [phase, setPhase] = useState(PHASES.IDLE);
  const [selectedMode, setSelectedMode] = useState(null);
  const [displayMode, setDisplayMode] = useState(null);
  const [reelOffsets, setReelOffsets] = useState([0, 0, 0]);
  const [reelDurations, setReelDurations] = useState([0, 0, 0]);
  const [countdown, setCountdown] = useState(3);

  const isSpinLockedRef = useRef(false);
  const timersRef = useRef(new Set());

  const strip = useMemo(() => buildStrip(MODES), []);

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach((timerId) => clearTimeout(timerId));
    timersRef.current.clear();
  }, []);

  const addTimer = useCallback((callback, delay) => {
    const id = setTimeout(() => {
      timersRef.current.delete(id);
      callback();
    }, delay);
    timersRef.current.add(id);
    return id;
  }, []);

  useEffect(() => {
    attachSimulationToWindow(MODES);
  }, []);

  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);

  useEffect(() => {
    if (phase !== PHASES.COUNTDOWN) {
      return undefined;
    }

    setCountdown(3);
    const tick1 = addTimer(() => setCountdown(2), 1000);
    const tick2 = addTimer(() => setCountdown(1), 2000);
    const done = addTimer(() => setPhase(PHASES.CAPTURING), 3000);

    return () => {
      clearTimeout(tick1);
      clearTimeout(tick2);
      clearTimeout(done);
      timersRef.current.delete(tick1);
      timersRef.current.delete(tick2);
      timersRef.current.delete(done);
    };
  }, [addTimer, phase]);

  useEffect(() => {
    if (phase === PHASES.CAPTURING) {
      addTimer(() => setPhase(PHASES.PREVIEW), 1200);
    } else if (phase === PHASES.PREVIEW) {
      addTimer(() => setPhase(PHASES.PRINTING), 1200);
    } else if (phase === PHASES.PRINTING) {
      addTimer(() => setPhase(PHASES.QR), 1200);
    } else if (phase === PHASES.QR) {
      addTimer(() => {
        setPhase(PHASES.IDLE);
        setSelectedMode(null);
        setDisplayMode(null);
        isSpinLockedRef.current = false;
      }, 1800);
    }
  }, [addTimer, phase]);

  const getCenterValues = useCallback(
    (offsets) =>
      offsets.map((offset) => {
        const topIndex = Math.round(offset / REEL_ROW_HEIGHT);
        const centerIndex = topIndex + CENTER_ROW_INDEX;
        return strip[centerIndex]?.name;
      }),
    [strip],
  );

  const startSpin = useCallback(() => {
    if (phase !== PHASES.IDLE || isSpinLockedRef.current) {
      return;
    }

    clearAllTimers();
    isSpinLockedRef.current = true;
    setPhase(PHASES.SPIN);

    const selection = pickModeWeightedDebug(MODES);
    const chosenMode = selection.selected;
    setSelectedMode(chosenMode);

    const modeIndex = MODES.findIndex((mode) => mode.name === chosenMode.name);

    const targetOffsets = REEL_STOP_MS.map((_, reelIndex) => {
      const extraCycles = 8 + reelIndex * 3;
      const targetItemIndex = extraCycles * MODES.length + modeIndex;
      const topIndex = targetItemIndex - CENTER_ROW_INDEX;
      return Math.round(topIndex * REEL_ROW_HEIGHT);
    });

    setReelDurations(REEL_STOP_MS);
    setReelOffsets(targetOffsets);

    REEL_STOP_MS.forEach((stopMs, index) => {
      addTimer(() => {
        setReelOffsets((current) => {
          const next = [...current];
          next[index] = Math.round(targetOffsets[index]);
          return next;
        });
      }, stopMs);
    });

    addTimer(() => {
      setDisplayMode(chosenMode);

      if (isDev) {
        const finalCenters = getCenterValues(targetOffsets);
        console.log('[slot-spin] selected tier:', chosenMode.tier);
        console.log('[slot-spin] selected mode:', chosenMode.name);
        console.log('[slot-spin] random value:', selection.randomValue);
        console.log('[slot-spin] reel target indices:', targetOffsets.map((v) => v / REEL_ROW_HEIGHT));
        console.log('[slot-spin] final displayed center values:', finalCenters);
      }

      setPhase(PHASES.REVEAL);
      addTimer(() => setPhase(PHASES.COUNTDOWN), 1200);
    }, Math.max(...REEL_STOP_MS) + 120);
  }, [addTimer, clearAllTimers, getCenterValues, phase]);

  const renderPhaseContent = () => {
    if (phase === PHASES.IDLE || phase === PHASES.SPIN) {
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            {[0, 1, 2].map((reelIndex) => (
              <div key={reelIndex} className="h-[168px] overflow-hidden rounded-lg border border-slate-700 bg-slate-900">
                <div
                  className="will-change-transform"
                  style={{
                    transform: `translateY(-${reelOffsets[reelIndex]}px)`,
                    transitionProperty: 'transform',
                    transitionDuration: `${reelDurations[reelIndex]}ms`,
                    transitionTimingFunction: 'cubic-bezier(0.15, 0.8, 0.2, 1)',
                  }}
                >
                  {strip.map((mode, idx) => (
                    <div
                      key={`${mode.name}-${idx}`}
                      className="h-14 flex items-center justify-center border-b border-slate-800 text-xs text-slate-100"
                    >
                      {mode.name}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={startSpin}
              disabled={phase !== PHASES.IDLE}
              className="rounded bg-indigo-500 px-6 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {phase === PHASES.SPIN ? 'Spinning...' : 'Start'}
            </button>
          </div>
        </div>
      );
    }

    if (phase === PHASES.REVEAL) {
      return (
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Mode Reveal</h2>
          <p className="text-xl">{displayMode?.name}</p>
          <p className="text-sm text-slate-400">{displayMode?.tier} • {displayMode?.prompt}</p>
        </div>
      );
    }

    if (phase === PHASES.COUNTDOWN) {
      return <div className="text-center text-5xl font-bold">{countdown}</div>;
    }

    if (phase === PHASES.CAPTURING) {
      return <div className="text-center">Capturing {selectedMode?.name}...</div>;
    }

    if (phase === PHASES.PREVIEW) {
      return <div className="text-center">Preview ready for {selectedMode?.name}</div>;
    }

    if (phase === PHASES.PRINTING) {
      return <div className="text-center">Printing label for {selectedMode?.name}</div>;
    }

    if (phase === PHASES.QR) {
      return <div className="text-center">QR metadata generated for {selectedMode?.name}</div>;
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-3xl font-bold">SpinShot Kiosk</h1>
        <p className="text-sm text-slate-400">Current state: {phase}</p>
        {renderPhaseContent()}
      </div>
    </div>
  );
};

export default SpinShotKiosk;
