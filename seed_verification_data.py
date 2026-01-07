from app import create_app
from models import db, User, Exam, ExamAttempt, Result
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash
import os

app = create_app()

def seed_data():
    with app.app_context():
        # Get password from env or use a placeholder that must be changed
        seed_pass = os.getenv('SEED_USER_PASSWORD', 'change_me_in_env')

        # 1. Create/Get Examiner
        examiner = User.query.filter_by(email='examiner@example.com').first()
        if not examiner:
            examiner = User(
                name="Examiner One",
                email="examiner@example.com",
                role="examiner",
                password="temp"
            )
            examiner.set_password(seed_pass)
            db.session.add(examiner)
            db.session.commit()
            print("Examiner created.")
        else:
            print("Examiner already exists.")

        # 2. Create/Get Student
        student = User.query.filter_by(email='student_verify@example.com').first()
        if not student:
            student = User(
                name="Verification Student",
                email="student_verify@example.com",
                role="student",
                password="temp"
            )
            student.set_password(seed_pass)
            db.session.add(student)
            db.session.commit()
            print("Student created.")
        else:
            print("Student already exists.")

        # 3. Create Verification Exam
        exam = Exam.query.filter_by(title="Verification Exam").first()
        if not exam:
            exam = Exam(
                title="Verification Exam",
                description="This exam is for verifying delete and result features.",
                duration=30,
                total_marks=100,
                created_by=examiner.id,
                created_at=datetime.utcnow()
            )
            db.session.add(exam)
            db.session.commit()
            print("Exam created.")
        else:
            # If exists, ensure it's not deleted (in case of re-run)
            pass 

        # 4. Create Completed Attempt & Result
        attempt = ExamAttempt.query.filter_by(student_id=student.id, exam_id=exam.id).first()
        if not attempt:
            attempt = ExamAttempt(
                student_id=student.id,
                exam_id=exam.id,
                start_time=datetime.utcnow() - timedelta(minutes=35),
                end_time=datetime.utcnow() - timedelta(minutes=5),
                status='completed',
                ip_address='127.0.0.1'
            )
            db.session.add(attempt)
            db.session.commit()

            result = Result(
                attempt_id=attempt.id,
                score=85,
                status='pass',
                total_questions=10,
                correct_answers=8,
                accuracy=85.0
            )
            db.session.add(result)
            db.session.commit()
            print("Attempt and Result created.")
        else:
            print("Attempt already exists.")

if __name__ == '__main__':
    seed_data()
