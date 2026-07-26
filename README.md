# portfolio
very own personal portfolio built with a rather simple* stack.

### Frontend
- HTML
- CSS
- Vanilla JS

### Tooling 
- Vite 

### Backend
- Python
- Flask
- Spotify WebAPI
- Hosted on Vercel
- Neon PostgreSQL
- SQLAlchemy
- Alembic migrations

## Features
- Live Spotify listening widget through a Flask API proxy
- Interactive drifting space background
- Dark and light themes
- Separate projects, albums and shows pages
- iPod-style album browser with tracklists
- Favorite shows poster collage
- Custom blog publishing system with a private dashboard
- Markdown editor, drafts, autosaving and publishing
- Password authentication, CSRF protection and login rate limiting
- Deployed through Vercel

## Running locally

### Requirements
- Node.js
- Python
- PostgreSQL DB (Neon)
- Spotify Developer app + creds

### Dependencies
Clone the project: 
```bash
git clone https://github.com/bon3301/personal-site.git
cd personal-site
```
Install the dependencies:
```bash 
npm install
```
Create and activate a python virtual envornment (very very recomended)
```
py -m venv .venv
.\.venv\Scripts\Activate.ps1
```
Install the backend dependencies:
```bash
python -m pip install -r requirements-dev.txt
```

### Environment Variables
Copy the included template and fill in the following values (.env.example)

Generate a Flask secret:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

Generate an admin password hash:
```
python -c "from getpass import getpass; from werkzeug.security import generate_password_hash;print(generate_password_hash(getpass('Password: ')))"
```

Apply the existing Alembic migrations for a fresh database:
```powershell
python -m alembic upgrade head
```

### Start the site locally
```powershell
1. python -m flask --app api.index run --debug --port 5000
2. npm run dev
```

### Deployment
```
vercel deploy --prod
```