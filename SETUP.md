# Quick Setup Guide - Neon PostgreSQL

## Step 1: Get Your Neon Database

1. Go to [https://neon.tech](https://neon.tech) and sign up
2. Create a new project
3. Copy your connection string from the dashboard

Your connection string looks like:
```
postgresql://username:password@ep-xxxx-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

## Step 2: Configure Your Environment

1. Open the `.env` file in the project root
2. Replace the `DATABASE_URL` value with your Neon connection string:

```env
DATABASE_URL=postgresql://your-username:your-password@ep-xxxx-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

## Step 3: Run Migrations

```bash
# From project root
python manage.py migrate
```

This will create all necessary tables in your Neon database.

## Step 4: Create Admin User (Optional)

```bash
python manage.py createsuperuser
```

## Step 5: Start the Servers

### Terminal 1 - Django Backend:
```bash
python manage.py runserver
```

### Terminal 2 - React Frontend:
```bash
cd frontend
npm start
```

## Done! 🎉

- Backend: http://127.0.0.1:8000/
- Frontend: http://localhost:3000/
- Admin: http://127.0.0.1:8000/admin/
- API: http://127.0.0.1:8000/api/items/

## Using the Application

### First Time Setup
1. Open http://localhost:3000/ in your browser
2. Click "Register here" to create a new account
3. Fill in username, password (and optional email)
4. You'll be automatically logged in after registration

### Logging In
1. Enter your username and password
2. Your session will be saved using JWT tokens
3. Access the dashboard to manage items

### Authentication Features
- JWT-based authentication
- Secure token storage in browser localStorage
- Session persists on page refresh
- Logout clears all session data

## Troubleshooting

### Connection Error
- Make sure your Neon connection string is correct in `.env`
- Check that `sslmode=require` is at the end of the connection string
- Verify your Neon database is active (not paused)

### Migration Errors
- Ensure psycopg2-binary is installed: `pip install psycopg2-binary`
- Check your DATABASE_URL formatting

### CORS Errors in React
- Verify Django is running on port 8000
- Check that `CORS_ALLOWED_ORIGINS` in `.env` includes your frontend URL
