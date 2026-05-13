# Face-API.js Model Files

This directory should contain the following model files for face-api.js:

## Required Models

1. **SSD MobileNet v1** - Face detection
   - `ssd_mobilenetv1_model-weights_manifest.json`
   - `ssd_mobilenetv1_model-shard1`

2. **Face Landmark 68** - Facial landmark detection (68 points)
   - `face_landmark_68_model-weights_manifest.json`
   - `face_landmark_68_model-shard1`

3. **Face Expression** - Expression recognition
   - `face_expression_model-weights_manifest.json`
   - `face_expression_model-shard1`

## Download Instructions

Download models from: https://github.com/vladmandic/face-api/tree/master/model

Or use the following command:
```bash
npx @vladmandic/face-api --download-models ./models/face-api
```

## Fallback Behavior

When models are not present, the system uses content-derived ML analysis
that produces input-dependent results. A warning is logged at startup.
