import os
from flask import Flask, render_template
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from models import db, bcrypt
from auth import auth_bp
from api import api_bp
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

def create_app():
    app = Flask(__name__)
    app.config.from_object('config.Config')
    
    # Initialize extensions
    db.init_app(app)
    bcrypt.init_app(app)
    CORS(app)
    JWTManager(app)
    Migrate(app, db)
    
    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(api_bp, url_prefix='/api')
    
    @app.route('/')
    def index():
        return render_template('home.html')
    
    @app.route('/home')
    def home():
        return render_template('home.html')

    @app.route('/about')
    def about():
        return render_template('about.html')

    @app.route('/contact')
    def contact():
        return render_template('contact.html')

    @app.route('/login')
    @app.route('/login.html')
    def login_page():
        return render_template('login.html')

    @app.route('/signup.html')
    def signup_page():
        return render_template('signup.html')

    @app.route('/forgot_password.html')
    def forgot_password_page():
        return render_template('forgot_password.html')

    @app.route('/reset_password.html')
    def reset_password_page():
        return render_template('reset_password.html')


    # New routes for dashboards and pages
    @app.route('/examiner_dashboard.html')
    def examiner_dashboard():
        return render_template('examiner_dashboard.html')

    @app.route('/analytics_dashboard.html')
    def analytics_dashboard():
        return render_template('analytics_dashboard.html')

    @app.route('/student_dashboard.html')
    def student_dashboard():
        return render_template('student_dashboard.html')

    @app.route('/create_exam.html')
    def create_exam_page():
        return render_template('create_exam.html')

    @app.route('/exam.html')
    def exam_page():
        return render_template('exam.html')

    @app.route('/result.html')
    def result_page():
        return render_template('result.html')

    @app.route('/instructions.html')
    def instructions_page():
        return render_template('instructions.html')

    
    with app.app_context():
        db.create_all()
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5000)
