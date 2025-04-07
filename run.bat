@echo off
echo Installing dependencies...
python -m pip install flask==2.0.1 werkzeug==2.0.1 flasgger==0.9.5 flask-cors==3.0.10 gunicorn==20.1.0 markupsafe==2.0.1 jinja2==3.0.1 itsdangerous==2.0.1

echo Starting converter app...
python app.py

pause 