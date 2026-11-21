# Sonxai Primary School: Website + CMS

**React + FastAPI + PostgreSQL**

The public website keeps the design of the original `index.html`. All of its content
(menus, pages, sections, header and footer) now comes from the database, and you manage it
from an admin panel.

```
school1/
├── index.html          original static design (kept for reference)
├── backend/            FastAPI API (Python 3.11+)
│   ├── app/
│   │   ├── main.py         app, security middleware, serves the built frontend
│   │   ├── models.py       SQLAlchemy tables
│   │   ├── services.py     draft → publish snapshot logic
│   │   ├── sanitize.py     HTML / URL sanitisation of CMS content
│   │   ├── seed.py         creates tables, seeds the content from index.html, first admin
│   │   └── routers/        auth, public, admin_content, admin_misc
│   └── .env            config (DB URL, secret key, initial admin password)
└── frontend/           React 18 + Vite + TypeScript + Tailwind
    └── src/
        ├── public/         website: layout, header, footer, content blocks
        └── admin/          admin panel: menus, page editor, publish, settings, …
```

## Run it (development)

Prerequisites: Python 3.11+, Node 18+, and PostgreSQL with a database named `sonxai1`.

**1. Backend** (terminal 1)

First-time setup:

```powershell
cd backend
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
copy .env.example .env                  # then edit SECRET_KEY etc.
.venv\Scripts\python -m app.seed        # creates tables, seeds content, creates the admin, publishes v1
```

Start the API (every time):

```powershell
cd backend
.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000
```

> Always use the Python inside `.venv` (as above, or after activating the venv with
> `.venv\Scripts\Activate.ps1`). Your system Python does not have the project's packages
> and fails with `ModuleNotFoundError: No module named 'pydantic_settings'`.
> On macOS/Linux use `.venv/bin/python` instead of `.venv\Scripts\python`.

API docs (development only): http://localhost:8000/api/docs

**2. Frontend** (terminal 2)

```bash
cd frontend
npm install
npm run dev
```

Website: http://localhost:5173 · Admin: http://localhost:5173/admin

The admin username and password are `INITIAL_ADMIN_USERNAME` / `INITIAL_ADMIN_PASSWORD` in
`backend/.env`. After the first login, change the password from the account menu
(top-right) → **Change password**.

## Using the admin panel

| Screen | What you can do |
|---|---|
| **Menus & Pages** | Create, rename, reorder (↑ ↓), hide or delete top-navigation items. A menu is either a **page** (built from content blocks) or a **link** (external URL). Choose which page is the home page. |
| **Edit content** | Build a page from blocks: Hero banner, Page header, Statistics, Feature cards, Call to action, Text section (rich text editor), Image + text, Partners, Application form. Add, insert, reorder, duplicate, hide and delete blocks. Use the **English / ລາວ** switch to edit each language. |
| **Site settings** | School name and logo, Dashboard button, footer text, contact details, social links, application form grades. |
| **Publish** | Your edits are saved as a **draft**. Visitors only see them after you click **Publish**. The publish dialog lists what changed. **Preview draft** shows the unpublished site. |
| **Publish & history** | Every publish is kept as a version. **Restore** loads an old version into the draft; publish it to roll back the live site. |
| **Applications** | Admission requests from the "Apply now" pop-up and the Application form block. Set a status and keep internal notes. |
| **Administrators** | Add or disable admin accounts and reset their passwords. |

Images are uploaded from any image field (Upload / Library). Allowed formats are PNG, JPEG,
GIF and WebP, up to 5 MB.

## Security

- Passwords are hashed with bcrypt. Login takes the same time whether or not the user exists,
  and an IP is blocked for 15 minutes after 8 failed attempts.
- The session is a signed JWT in an **httpOnly, SameSite=Lax** cookie, so JavaScript cannot
  read it. Changing a password or disabling a user invalidates their existing sessions.
- CSRF protection: every write request must send the `X-Requested-With` header, and CORS
  only allows the configured origins.
- All CMS content is sanitised on the server. Rich text goes through an allow-list HTML
  cleaner (nh3), and `javascript:` and other unsafe links are rejected. The public site only
  reads published snapshots.
- Uploads are checked by their actual file bytes, not their extension, and saved under
  random names. SVG is not allowed.
- Security headers are set: CSP on HTML, `X-Frame-Options: DENY`, `nosniff`, and
  `Referrer-Policy`. API docs are disabled outside development.
- The application form has a honeypot field and is rate limited per IP.

## Production

```bash
cd frontend && npm run build          # creates frontend/dist
cd ../backend
# .env: ENVIRONMENT=production, COOKIE_SECURE=true, a new SECRET_KEY, real CORS_ORIGINS
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1
```

FastAPI serves the built React app from `frontend/dist`, so a single process runs the whole
site. Put it behind HTTPS (for example nginx or Caddy). The login and form rate limiters are
in memory, so if you run several workers, use a shared limiter (Redis or the reverse proxy).

Useful commands:

- `python -m app.seed --reset-content`: wipe menus, blocks and settings and re-seed the original content.
- Back up the database with `pg_dump sonxai1` and the `backend/uploads/` folder.
