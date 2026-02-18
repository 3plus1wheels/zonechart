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
- CORS headers configured for React
- Sample Item model with CRUD operations
- **PostgreSQL database (Neon)**
- Environment-based configuration

### API Endpoints

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
- Modern JavaScript (ES6+)
- Ready to connect to Django API

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
- django-cors-headers

### Frontend
- React 18
- JavaScript (ES6+)
- npm/npx

## Notes

- CORS is configured to allow requests from `http://localhost:3000`
- The backend uses SQLite for development (change to PostgreSQL/MySQL for production)
- Debug mode is ON (disable for production)
- Secret key should be changed for production
