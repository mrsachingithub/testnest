# TestNest - AI-Powered Secure Exam Platform

TestNest is a robust, secure, and user-friendly online examination system designed to ensure integrity and ease of use. It features role-based access for Examiners and Students, AI-assisted proctoring capabilities, and detailed analytics.

## 🚀 Features

### For Examiners
*   **Manage Exams:** Create, view, and delete exams with ease.
*   **Detailed View:** Inspect exam questions, options, and correct answers via a secure modal.
*   **Analytics Dashboard:** Track student performance with Pass/Fail statistics and detailed attempt logs.
*   **Secure Content:** Exams description and metadata are clearly visible.

### For Students
*   **Student Dashboard:** Easily view and access available exams.
*   **Secure Testing Environment:** Taking exams in a controlled interface.
*   **Instant Feedback:** (Configurable) Immediate score calculation.

### General
*   **Role-Based Auth:** Secure JWT-based authentication for Students and Examiners.
*   **Responsive Design:** Modern UI built with Bootstrap 5 and custom glassmorphism effects.
*   **PostgreSQL Ready:** Configured for high-performance production deployment.

## 🛠️ Tech Stack

*   **Backend:** Python, Flask, Flask-SQLAlchemy, Flask-JWT-Extended, Flask-Migrate.
*   **Database:** PostgreSQL (Production) / SQLite (Dev).
*   **Frontend:** HTML5, CSS3, JavaScript (ES6+), Bootstrap 5, Axios.
*   **Deployment:** Gunicorn, Render (Procfile included).

## ⚙️ Installation & Local Setup

1.  **Clone the repository**
    ```bash
    git clone <repository-url>
    cd TestNest
    ```

2.  **Create a virtual environment**
    ```bash
    python -m venv venv
    # Windows
    venv\Scripts\activate
    # macOS/Linux
    source venv/bin/activate
    ```

3.  **Install dependencies**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Configure Environment Variables**
    Create a `.env` file in the root directory and add:
    ```ini
    SECRET_KEY=your_super_secret_key
    JWT_SECRET_KEY=your_jwt_secret_key
    DATABASE_URL=sqlite:///testnest_v2.db  # Only for local dev, use Postgres URL for prod
    ```

5.  **Initialize Database**
    ```bash
    # This runs the migration scripts to set up the schema
    flask db upgrade
    ```

6.  **Run the Application**
    ```bash
    python app.py
    ```
    Access the app at `http://127.0.0.1:5000`.

## 📦 Deployment (Render)

This project is configured for deployment on Render.

1.  **Database:** Create a PostgreSQL database on Render.
2.  **Web Service:** Create a new Web Service connected to your GitHub repo.
3.  **Environment Variables:** Add the following in Render dashboard:
    *   `DATABASE_URL`: (Internal URL from your Render Postgres DB)
    *   `SECRET_KEY`: (A strong random string)
    *   `JWT_SECRET_KEY`: (A strong random string)
    *   `PYTHON_VERSION`: `3.11.0` (optional, recommended)
4.  **Start Command:**
    The `Procfile` handles this automatically:
    ```bash
    flask db upgrade && gunicorn "app:create_app()"
    ```
    This ensures migrations run automatically on every deploy.

## 📂 Project Structure

*   `app.py`: Main application entry point and factory.
*   `models.py`: Database models (namespaced with `tn_` prefix).
*   `api.py`: Backend API endpoints.
*   `auth.py`: Authentication routes.
*   `templates/`: HTML templates for the frontend.
*   `static/`: CSS, JS, and image assets.
*   `migrations/`: Database migration scripts (Alembic).

## 🛡️ License

© 2026 TestNest Inc. All rights reserved.
