---
title: Stress AI Backend
emoji: 🧘
colorFrom: indigo
colorTo: blue
sdk: docker
app_port: 7860
---

# Stress AI Facial Backend

This is the FastAPI backend for the Stress AI application, providing facial stress analysis using ML models.

## Deployment to Hugging Face Spaces

1. Create a new Space on Hugging Face.
2. Select **Docker** as the SDK.
3. Upload the contents of this directory to the Space repository.
4. The backend will automatically build and start on port 7860.

## Environment Variables

- `NGC_API_KEY`: Your NVIDIA NGC API key for AI note generation.
