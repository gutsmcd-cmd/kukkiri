# くっきり写真 / Photo Sharpener

小さい・ぼやけた写真を、2倍・4倍にくっきり拡大。Enlarge small or blurry photos 2x or 4x, sharper.

- Pick a photo, choose 2x or 4x, tap Sharpen. Before/after slider, save as JPG or share.
- AI: Real-ESRGAN `realesr-general-x4v3` (SRVGGNetCompact, ~5 MB ONNX, export `CoderViking/realesr-general-x4v3-onnx` from the official v0.2.5.0 weights) via onnxruntime-web (WASM), processed in 128 px tiles so it fits phone memory. 2x = 4x result scaled down.
- Downloaded once from Hugging Face, kept in the browser cache, then works offline. Photos never leave the device.
- Limits: result capped at 4096 px (4x) / 3200 px (2x) long side; bigger photos are shrunk first. CPU-only, so a phone can take a minute or more on big photos.
- Japanese by default, 日本語/English toggle, 大きい文字 / Large text switch. Free, no ads, no login, no analytics.

Model licence: Real-ESRGAN (xinntao/Real-ESRGAN) is BSD-3-Clause. App code: MIT.
