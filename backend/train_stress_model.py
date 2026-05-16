from __future__ import annotations

import argparse
import random
import sys
from pathlib import Path

try:
    import numpy as np
except ImportError:
    pass
except ValueError as exc:
    if "numpy.dtype size changed" in str(exc):
        print("\n" + "=" * 60)
        print("ERROR: Numpy binary incompatibility detected.")
        print("This usually happens when using a global Python instead of the virtual environment.")
        print("Please run the script using the project's virtual environment:")
        print(f"  {'.\\\\.venv\\\\Scripts\\\\python.exe' if sys.platform == 'win32' else './.venv/bin/python'} {sys.argv[0]}")
        print("=" * 60 + "\n")
        sys.exit(1)
    raise

import cv2

from ml_stress_model import DEFAULT_MODEL_PATH, extract_features, iter_image_paths


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train the StressAI image stress classifier.")
    parser.add_argument("--data", type=Path, default=Path(__file__).with_name("training_data"))
    parser.add_argument("--model", type=Path, default=DEFAULT_MODEL_PATH)
    parser.add_argument("--test-size", type=float, default=0.25)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--max-per-class", type=int, default=2500, help="Limit images per class for faster local training. Use 0 for all images.")
    parser.add_argument("--target", choices=("stress", "stress_binary", "emotion"), default="stress_binary")
    parser.add_argument("--classifier", choices=("sgd", "linear_svc", "logistic", "rf", "ensemble"), default="sgd")
    parser.add_argument("--class-weight", choices=("none", "balanced"), default="none")
    parser.add_argument("--alpha", type=float, default=0.00003)
    parser.add_argument("--augment", action="store_true", help="Augment training data with horizontal flips.")
    parser.add_argument("--drop-ambiguous", action="store_true", help="Drop ambiguous emotion labels such as surprise for binary stress training.")
    return parser.parse_args()


def split_examples(data_dir: Path, seed: int) -> tuple[list[tuple[Path, str]], list[tuple[Path, str]]]:
    train_dir = data_dir / "train"
    test_dir = data_dir / "test"
    if train_dir.exists() and test_dir.exists():
        return iter_image_paths(train_dir), iter_image_paths(test_dir)

    from sklearn.model_selection import train_test_split

    examples = iter_image_paths(data_dir)
    labels = [label for _, label in examples]
    stratify = labels if len(set(labels)) > 1 and min(labels.count(label) for label in set(labels)) >= 2 else None
    return train_test_split(examples, test_size=0.25, random_state=seed, stratify=stratify)


def limit_per_class(examples: list[tuple[Path, str]], max_per_class: int, seed: int) -> list[tuple[Path, str]]:
    if max_per_class <= 0:
        return examples

    rng = random.Random(seed)
    grouped: dict[str, list[tuple[Path, str]]] = {}
    for example in examples:
        grouped.setdefault(example[1], []).append(example)

    limited: list[tuple[Path, str]] = []
    for label, label_examples in grouped.items():
        rng.shuffle(label_examples)
        limited.extend(label_examples[:max_per_class])

    rng.shuffle(limited)
    return limited


def target_label(label: str, target: str) -> str:
    if target == "emotion":
        return label

    normalized = label.lower().replace("-", "_").replace(" ", "_")
    if target == "stress_binary":
        if normalized in {"angry", "fear", "fearful", "sad", "disgust", "disgusted", "high_stress"}:
            return "stressed"
        return "not_stressed"

    if normalized in {"angry", "fear", "fearful", "sad", "disgust", "disgusted", "high_stress"}:
        return "high_stress"
    if normalized in {"surprise", "surprised", "medium_stress", "moderate_stress"}:
        return "medium_stress"
    if normalized in {"happy", "neutral", "low_stress", "calm", "relaxed"}:
        return "low_stress"
    return label


def filter_examples(examples: list[tuple[Path, str]], drop_ambiguous: bool) -> list[tuple[Path, str]]:
    if not drop_ambiguous:
        return examples

    ambiguous = {"surprise", "surprised"}
    return [example for example in examples if example[1].lower().replace("-", "_").replace(" ", "_") not in ambiguous]


def main() -> None:
    args = parse_args()

    try:
        import joblib
        from sklearn.metrics import classification_report
        from sklearn.pipeline import Pipeline
        from sklearn.svm import LinearSVC
        from sklearn.preprocessing import StandardScaler
        from sklearn.linear_model import LogisticRegression, SGDClassifier
        from sklearn.ensemble import RandomForestClassifier, VotingClassifier
    except ImportError as exc:
        raise SystemExit(
            "Missing ML dependencies. Install them with: pip install -r backend/requirements.txt"
        ) from exc

    if not args.data.exists():
        raise SystemExit(
            f"Training data folder not found: {args.data}\n"
            "Create subfolders such as backend/training_data/low_stress and backend/training_data/high_stress."
        )

    train_examples, test_examples = split_examples(args.data, args.seed)
    train_examples = filter_examples(train_examples, args.drop_ambiguous)
    test_examples = filter_examples(test_examples, args.drop_ambiguous)
    train_examples = limit_per_class(train_examples, args.max_per_class, args.seed)
    if len(train_examples) < 10:
        raise SystemExit("Add at least 10 labeled images before training.")

    x_train_features: list[np.ndarray] = []
    y_train_labels: list[str] = []
    x_test_features: list[np.ndarray] = []
    y_test_labels: list[str] = []
    skipped = 0

    for image_path, label in train_examples:
        image = cv2.imread(str(image_path))
        if image is None:
            skipped += 1
            continue

        x_train_features.append(extract_features(image))
        y_train_labels.append(target_label(label, args.target))

        if args.augment:
            flipped = cv2.flip(image, 1)
            x_train_features.append(extract_features(flipped))
            y_train_labels.append(target_label(label, args.target))

    for image_path, label in test_examples:
        image = cv2.imread(str(image_path))
        if image is None:
            skipped += 1
            continue

        x_test_features.append(extract_features(image))
        y_test_labels.append(target_label(label, args.target))

    if len(set(y_train_labels)) < 2:
        raise SystemExit("Training requires at least two label folders, for example low_stress and high_stress.")

    if not x_test_features:
        raise SystemExit("No test images were found.")

    x_train = np.vstack(x_train_features)
    y_train = np.array(y_train_labels)
    x_test = np.vstack(x_test_features)
    y_test = np.array(y_test_labels)

    class_weight = None if args.class_weight == "none" else "balanced"
    if args.classifier == "linear_svc":
        classifier = LinearSVC(C=0.35, class_weight=class_weight, dual="auto", random_state=args.seed, max_iter=5000)
    elif args.classifier == "logistic":
        classifier = LogisticRegression(
            C=1.3,
            class_weight=class_weight,
            max_iter=800,
            multi_class="auto",
            n_jobs=-1,
            random_state=args.seed,
            solver="saga",
        )
    elif args.classifier == "rf":
        classifier = RandomForestClassifier(
            n_estimators=100,
            max_depth=12,
            min_samples_split=5,
            class_weight=class_weight,
            random_state=args.seed,
            n_jobs=-1,
        )
    elif args.classifier == "ensemble":
        clf1 = SGDClassifier(loss="log_loss", alpha=0.0001, class_weight=class_weight, random_state=args.seed)
        clf2 = RandomForestClassifier(n_estimators=100, max_depth=12, class_weight=class_weight, random_state=args.seed)
        clf3 = LogisticRegression(C=1.0, class_weight=class_weight, max_iter=1000, solver="saga", random_state=args.seed)
        classifier = VotingClassifier(
            estimators=[("sgd", clf1), ("rf", clf2), ("lr", clf3)],
            voting="soft",
            n_jobs=-1,
        )
    else:
        classifier = SGDClassifier(
            loss="log_loss",
            alpha=args.alpha,
            max_iter=1800,
            tol=1e-3,
            class_weight=class_weight,
            random_state=args.seed,
            n_jobs=-1,
            average=True,
        )

    model = Pipeline(
        steps=[
            ("scaler", StandardScaler(with_mean=False)),
            ("classifier", classifier),
        ]
    )
    model.fit(x_train, y_train)
    predictions = model.predict(x_test)

    print(f"Target: {args.target}")
    print(f"Classifier: {args.classifier}")
    print(f"Class weight: {args.class_weight}")
    print(f"Alpha: {args.alpha}")
    print(f"Training images: {len(y_train)}")
    print(f"Test images: {len(y_test)}")
    print(classification_report(y_test, predictions, zero_division=0))
    if skipped:
        print(f"Skipped unreadable images: {skipped}")

    args.model.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, args.model)
    print(f"Saved model: {args.model}")


if __name__ == "__main__":
    main()
