from datasets import load_dataset
import soundfile as sf
import os
import numpy as np

print("Loading Common Voice English dataset...")

dataset = load_dataset(
    "fixie-ai/common_voice_17_0",
    "en",
    split="train",
    streaming=True
)

os.makedirs("LaserDataset/audio", exist_ok=True)

with open("LaserDataset/transcripts.txt", "w", encoding="utf-8") as f:

    for i, sample in enumerate(dataset):

        if i >= 100:
            break

        print(f"Processing sample {i + 1}/100...")

        # Current Hugging Face Audio feature uses TorchCodec AudioDecoder
        audio_decoder = sample["audio"]

        samples = audio_decoder.get_all_samples()

        audio_array = samples.data
        sample_rate = samples.sample_rate

        # Convert PyTorch tensor to NumPy
        if hasattr(audio_array, "cpu"):
            audio_array = audio_array.cpu().numpy()

        audio_array = np.asarray(audio_array)

        # TorchCodec normally returns [channels, samples]
        if audio_array.ndim == 2:
            audio_array = audio_array.T

        # Remove unnecessary dimensions
        audio_array = np.squeeze(audio_array)

        filename = f"audio_{i}.wav"

        filepath = os.path.join(
            "LaserDataset",
            "audio",
            filename
        )

        sf.write(
            filepath,
            audio_array,
            sample_rate
        )

        sentence = sample["sentence"].replace(
            "\n", " "
        ).strip()

        f.write(
            f"{filename}|{sentence}\n"
        )

        print(f"Saved {filename}")

print()
print("================================")
print("COMMON VOICE DOWNLOAD COMPLETE")
print("================================")