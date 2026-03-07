"""
YOLOv8 Fine-tuning Script for Road Hazard Detection

Fine-tunes YOLOv8n on a road hazard dataset to detect:
- pothole
- broken_edge
- waterlogging
- missing_manhole

Usage:
    python train_yolo.py [--epochs 50] [--batch 16]
"""

import os
import sys
import argparse
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def setup_dataset(data_dir: str = "datasets"):
    """
    Set up training dataset.
    Downloads pothole dataset from a public source and structures it for YOLOv8.
    """
    os.makedirs(data_dir, exist_ok=True)

    # Create dataset YAML config for YOLOv8
    yaml_content = f"""
# HazardEye Road Hazard Detection Dataset
path: {os.path.abspath(data_dir)}
train: images/train
val: images/val

nc: 4
names:
  0: pothole
  1: broken_edge
  2: waterlogging
  3: missing_manhole
"""

    yaml_path = os.path.join(data_dir, "hazardeye.yaml")
    with open(yaml_path, "w") as f:
        f.write(yaml_content)

    # Create directory structure
    for split in ["train", "val"]:
        os.makedirs(os.path.join(data_dir, "images", split), exist_ok=True)
        os.makedirs(os.path.join(data_dir, "labels", split), exist_ok=True)

    logger.info(f"Dataset structure created at {data_dir}/")
    logger.info(f"Dataset config: {yaml_path}")
    logger.info("")
    logger.info("To train with real data:")
    logger.info("1. Download pothole dataset from Roboflow or similar source")
    logger.info("2. Place images in datasets/images/train/ and datasets/images/val/")
    logger.info("3. Place YOLO-format labels in datasets/labels/train/ and datasets/labels/val/")
    logger.info("4. Run: python train_yolo.py --epochs 50")

    return yaml_path


def generate_synthetic_samples(data_dir: str = "datasets", num_samples: int = 100):
    """
    Generate synthetic training samples for demonstration.
    Creates simple images with geometric shapes representing hazard patterns.
    """
    try:
        from PIL import Image, ImageDraw
        import numpy as np
    except ImportError:
        logger.error("Pillow and numpy required. Install with: pip install Pillow numpy")
        return

    logger.info(f"Generating {num_samples} synthetic training samples...")

    hazard_colors = {
        0: [(80, 60, 50), (40, 30, 25)],    # pothole: dark patches
        1: [(120, 110, 100), (90, 85, 80)],  # broken_edge: gray cracks
        2: [(80, 120, 160), (60, 100, 140)], # waterlogging: blue-ish puddles
        3: [(20, 20, 20), (50, 50, 50)],     # missing_manhole: dark circles
    }

    for split, count in [("train", int(num_samples * 0.8)), ("val", int(num_samples * 0.2))]:
        for i in range(count):
            # Random background (road-like gray)
            bg_shade = np.random.randint(100, 160)
            img = Image.new("RGB", (640, 640), (bg_shade, bg_shade - 10, bg_shade - 5))
            draw = ImageDraw.Draw(img)

            # Add road-like texture
            for _ in range(50):
                x = np.random.randint(0, 640)
                y = np.random.randint(0, 640)
                shade = bg_shade + np.random.randint(-20, 20)
                draw.rectangle([x, y, x + np.random.randint(5, 30), y + np.random.randint(5, 30)],
                             fill=(shade, shade - 5, shade - 3))

            # Add hazard
            hazard_class = np.random.randint(0, 4)
            colors = hazard_colors[hazard_class]
            color = colors[np.random.randint(0, len(colors))]

            # Random position and size
            cx = np.random.randint(100, 540)
            cy = np.random.randint(100, 540)
            size = np.random.randint(40, 200)

            if hazard_class == 0:  # Pothole: ellipse
                draw.ellipse([cx - size//2, cy - size//3, cx + size//2, cy + size//3], fill=color)
            elif hazard_class == 1:  # Broken edge: irregular line
                points = [(cx - size//2 + np.random.randint(-10, 10),
                          cy + np.random.randint(-20, 20)) for _ in range(6)]
                draw.line(points, fill=color, width=np.random.randint(3, 12))
            elif hazard_class == 2:  # Waterlogging: large irregular blob
                draw.ellipse([cx - size, cy - size//2, cx + size, cy + size//2], fill=color)
            elif hazard_class == 3:  # Missing manhole: dark circle
                draw.ellipse([cx - size//2, cy - size//2, cx + size//2, cy + size//2], fill=color)
                draw.ellipse([cx - size//3, cy - size//3, cx + size//3, cy + size//3],
                           fill=(color[0] - 15, color[1] - 15, color[2] - 15))

            # Save image
            img_path = os.path.join(data_dir, "images", split, f"synthetic_{i:04d}.jpg")
            img.save(img_path, quality=85)

            # Save YOLO-format label
            # Format: class_id center_x center_y width height (normalized)
            x_center = cx / 640
            y_center = cy / 640
            w = size / 640
            h = size / 640

            label_path = os.path.join(data_dir, "labels", split, f"synthetic_{i:04d}.txt")
            with open(label_path, "w") as f:
                f.write(f"{hazard_class} {x_center:.6f} {y_center:.6f} {w:.6f} {h:.6f}\n")

    logger.info(f"Generated synthetic data in {data_dir}/")


def train(
    data_yaml: str,
    model_base: str = "yolov8n.pt",
    epochs: int = 50,
    batch_size: int = 16,
    img_size: int = 640,
    output_dir: str = "models",
):
    """Train/fine-tune YOLOv8 on the hazard dataset."""
    try:
        from ultralytics import YOLO
    except ImportError:
        logger.error("ultralytics not installed. Install with: pip install ultralytics")
        sys.exit(1)

    logger.info(f"Loading base model: {model_base}")
    model = YOLO(model_base)

    logger.info(f"Training for {epochs} epochs with batch size {batch_size}")
    results = model.train(
        data=data_yaml,
        epochs=epochs,
        batch=batch_size,
        imgsz=img_size,
        project=output_dir,
        name="hazardeye",
        patience=10,
        save=True,
        pretrained=True,
        verbose=True,
    )

    # Copy best weights
    best_path = os.path.join(output_dir, "hazardeye", "weights", "best.pt")
    final_path = os.path.join(output_dir, "hazardeye_yolov8n.pt")

    if os.path.exists(best_path):
        import shutil
        shutil.copy2(best_path, final_path)
        logger.info(f"Best model saved to {final_path}")
    else:
        logger.warning(f"Best weights not found at {best_path}")

    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train YOLOv8 for hazard detection")
    parser.add_argument("--epochs", type=int, default=50, help="Training epochs")
    parser.add_argument("--batch", type=int, default=16, help="Batch size")
    parser.add_argument("--synthetic", action="store_true", help="Generate synthetic training data")
    parser.add_argument("--generate-only", action="store_true", help="Only generate data, don't train")
    args = parser.parse_args()

    os.chdir(os.path.dirname(os.path.abspath(__file__)))

    data_yaml = setup_dataset()

    if args.synthetic or args.generate_only:
        generate_synthetic_samples(num_samples=200)

    if not args.generate_only:
        train(
            data_yaml=data_yaml,
            epochs=args.epochs,
            batch_size=args.batch,
        )
