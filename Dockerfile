# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Install system dependencies for OpenCV and other ML libs
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container
# We copy it from the backend directory
COPY backend/requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend code into the container
# We copy everything from backend/ to /app
COPY backend/ .

# Ensure the models directory exists (it should be copied, but just in case)
RUN mkdir -p models

# Expose port 7860 (Hugging Face Spaces default)
EXPOSE 7860

# Run the FastAPI app using uvicorn
# Hugging Face expects the app to be on port 7860 and host 0.0.0.0
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
