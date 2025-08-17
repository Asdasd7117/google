FROM mcr.microsoft.com/playwright/python:latest

WORKDIR /app
COPY . /app

RUN pip install --upgrade pip
RUN pip install -r requirements.txt

EXPOSE 5000
CMD ["gunicorn", "app:app", "-b", "0.0.0.0:5000"]
