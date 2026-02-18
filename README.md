# Django + React Full Stack Project

A full-stack web application with Django REST API backend and React frontend.

## Project Structure

```
├── backend/           # Django project settings
├── api/              # Django REST API app
├── frontend/         # React application
├── manage.py         # Django management script
├── .env              # Environment variables (not in git)
├── .env.example      # Environment variables template
└── requirements.txt  # Python dependencies
```

## Backend (Django + REST Framework)

### Features
- Django 6.0.2
- Django REST Framework
- **JWT Authentication** (djangorestframework-simplejwt)
- User registration and login
- CORS headers configured for React
- Sample Item model with CRUD operations
- **PostgreSQL database (Neon)**
- Environment-based configuration

### API Endpoints

#### Authentication
- `POST /api/auth/register/` - Register new user
- `POST /api/auth/login/` - Login (returns JWT tokens)
- `POST /api/auth/refresh/` - Refresh access token
- `GET /api/auth/user/` - Get current user info (requires auth)

#### Items
- `GET /api/items/` - List all items
- `POST /api/items/` - Create new item
- `GET /api/items/{id}/` - Get specific item
- `PUT /api/items/{id}/` - Update item
- `PATCH /api/items/{id}/` - Partial update item
- `DELETE /api/items/{id}/` - Delete item
- `GET /api/items/active/` - Get only active items

### Running the Backend

```bash
# Activate virtual environment
.venv\Scripts\activate

# Run development server
python manage.py runserver
```

Backend will be available at: http://127.0.0.1:8000/

Admin panel: http://127.0.0.1:8000/admin/
API root: http://127.0.0.1:8000/api/

## Frontend (React)

### Features
- React 18
- **JWT Authentication** with login/register pages
- Protected routes (requires authentication)
- User session management
- Modern JavaScript (ES6+)
- Context API for state management
- Connected to Django REST API

### Running the Frontend

```bash
cd frontend
npm start
```

Frontend will be available at: http://localhost:3000/

## Getting Started

### 1. Start the Backend

```bash
# From project root
python manage.py runserver
```

### 2. Start the Frontend

```bash
# In a new terminal
cd frontend
npm start
```

### 3. Create Admin User (Optional)

```bash
python manage.py createsuperuser
```

## Authentication

The app features JWT-based authentication:

1. **First Time**: Register a new account through the React frontend
2. **Login**: Use your credentials to log in
3. **Session**: Your session is maintained using JWT tokens stored in localStorage
4. **Protected Routes**: The dashboard is only accessible when authenticated

### Testing Authentication via API

```bash
# Register a new user
curl -X POST http://127.0.0.1:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "testpass123", "password2": "testpass123", "email": "test@example.com"}'

# Login to get tokens
curl -X POST http://127.0.0.1:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "testpass123"}'

# Use the access token to get user info
curl http://127.0.0.1:8000/api/auth/user/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Development

### Adding New API Endpoints

1. Define models in `api/models.py`
2. Create serializers in `api/serializers.py`
3. Add views in `api/views.py`
4. Register routes in `api/urls.py`
5. Run migrations:
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

### Making Requests from React

```javascript
// Example: Fetch items from API
fetch('http://127.0.0.1:8000/api/items/')
  .then(response => response.json())
  .then(data => console.log(data));
```

## Technologies Used

### Backend
- Python 3.13
- Django 6.0.2
- Django REST Framework
- djangorestframework-simplejwt (JWT Authentication)
- django-cors-headers
- PostgreSQL (Neon)
- psycopg2-binary
- python-dotenv
- dj-database-url
- dj-database-url

### Frontend
- React 18
- JavaScript (ES6+)
- npm/npx

## Environment Variables

The project uses environment variables for configuration. Copy `.env.example` to `.env` and update:

- `SECRET_KEY`: Django secret key (change in production)
- `DEBUG`: Debug mode (True/False)
- `ALLOWED_HOSTS`: Comma-separated list of allowed hosts
- `DATABASE_URL`: Neon Postgres connection string
- `CORS_ALLOWED_ORIGINS`: Comma-separated list of allowed CORS origins
- `API_PAGINATION_SIZE`: Number of items per page in API pagination

## Notes

- CORS is configured via `.env` to allow requests from React frontend
- The backend uses **Neon PostgreSQL** for production-ready database hosting
- SSL mode is required for Neon connections
- Debug mode is ON by default (disable for production in `.env`)
- Never commit your `.env` file to version control
- Update `SECRET_KEY` in `.env` before deploying to production
