#!/usr/bin/env python3
"""Record local positive wake-word samples from the Mac microphone."""

from pathlib import Path

import sounddevice as sd
from scipy.io.wavfile import write


SAMPLE_RATE = 16_000
DURATION_SECONDS = 2.5
COUNT = 20
OUTPUT_DIR = Path("data/wakeword/positive")


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    print("Chaque prise dure 2,5 secondes. Dis « Hey Jarvis » après le bip.")
    print("Les fichiers restent localement dans", OUTPUT_DIR)
    input("Appuie sur Entrée pour commencer…")
    for index in range(1, COUNT + 1):
        input(f"Prise {index}/{COUNT} — Entrée puis dis « Hey Jarvis »…")
        recording = sd.rec(
            int(SAMPLE_RATE * DURATION_SECONDS),
            samplerate=SAMPLE_RATE,
            channels=1,
            dtype="int16",
        )
        sd.wait()
        path = OUTPUT_DIR / f"hey-jarvis-{index:02d}.wav"
        write(path, SAMPLE_RATE, recording)
        print("Enregistré:", path)


if __name__ == "__main__":
    main()
