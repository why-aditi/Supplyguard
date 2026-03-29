FROM python:3.12-slim
WORKDIR /app

COPY requirements.txt .
# CPU-only PyTorch (smaller image than default pip torch)
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
EXPOSE 8000
CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000"]
