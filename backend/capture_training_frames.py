from __future__ import annotations

import argparse
import time
from pathlib import Path

import cv2


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Capture webcam frames for StressAI model training.")
    parser.add_argument("label", help="Label folder name, for example low_stress or high_stress.")
    parser.add_argument("--output", type=Path, default=Path(__file__).with_name("training_data"))
    parser.add_argument("--camera", type=int, default=0)
    parser.add_argument("--interval", type=float, default=0.8, help="Seconds between saved frames while recording.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    label_dir = args.output / args.label
    label_dir.mkdir(parents=True, exist_ok=True)

    capture = cv2.VideoCapture(args.camera)
    if not capture.isOpened():
        raise SystemExit("Unable to open webcam.")

    print("Press R to start/stop recording, S to save one frame, and Q to quit.")
    recording = False
    last_saved_at = 0.0
    saved_count = len(list(label_dir.glob("*.jpg")))

    while True:
        ok, frame = capture.read()
        if not ok:
            break

        status = "REC" if recording else "IDLE"
        cv2.putText(frame, f"{args.label} | {status} | saved {saved_count}", (18, 32), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
        cv2.imshow("StressAI training capture", frame)

        now = time.time()
        key = cv2.waitKey(1) & 0xFF
        should_save = key == ord("s") or (recording and now - last_saved_at >= args.interval)

        if should_save:
            image_path = label_dir / f"{args.label}_{int(now * 1000)}.jpg"
            cv2.imwrite(str(image_path), frame)
            saved_count += 1
            last_saved_at = now
        elif key == ord("r"):
            recording = not recording
        elif key == ord("q"):
            break

    capture.release()
    cv2.destroyAllWindows()
    print(f"Saved {saved_count} images in {label_dir}")


if __name__ == "__main__":
    main()
