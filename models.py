from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from flask_bcrypt import Bcrypt

db = SQLAlchemy()
bcrypt = Bcrypt()

class User(db.Model):
    __tablename__ = 'tn_users'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(20), nullable=False) # 'student', 'examiner'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    exams_created = db.relationship('Exam', backref='creator', lazy=True)
    attempts = db.relationship('ExamAttempt', backref='student', lazy=True)

    def set_password(self, password):
        self.password = bcrypt.generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password, password)

class Exam(db.Model):
    __tablename__ = 'tn_exams'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    duration = db.Column(db.Integer, nullable=False) # In minutes
    total_marks = db.Column(db.Integer, default=100)
    created_by = db.Column(db.Integer, db.ForeignKey('tn_users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    questions = db.relationship('Question', backref='exam', lazy=True, cascade="all, delete-orphan")
    attempts = db.relationship('ExamAttempt', backref='exam', lazy=True, cascade="all, delete-orphan")

class Question(db.Model):
    __tablename__ = 'tn_questions'
    id = db.Column(db.Integer, primary_key=True)
    exam_id = db.Column(db.Integer, db.ForeignKey('tn_exams.id'), nullable=False)
    text = db.Column(db.Text, nullable=False)
    question_type = db.Column(db.String(20), default='mcq') # 'mcq', 'tf'
    marks = db.Column(db.Integer, default=1)
    difficulty = db.Column(db.String(20), default='medium') # 'easy', 'medium', 'hard'
    topic = db.Column(db.String(100), default='General') # New field for Analytics

    options = db.relationship('Option', backref='question', lazy=True, cascade="all, delete-orphan")
    answers = db.relationship('StudentAnswer', backref='question', lazy=True)

class Option(db.Model):
    __tablename__ = 'tn_options'
    id = db.Column(db.Integer, primary_key=True)
    question_id = db.Column(db.Integer, db.ForeignKey('tn_questions.id'), nullable=False)
    text = db.Column(db.Text, nullable=False)
    is_correct = db.Column(db.Boolean, default=False)

class ExamAttempt(db.Model):
    __tablename__ = 'tn_exam_attempts'
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('tn_users.id'), nullable=False)
    exam_id = db.Column(db.Integer, db.ForeignKey('tn_exams.id'), nullable=False)
    start_time = db.Column(db.DateTime, default=datetime.utcnow)
    end_time = db.Column(db.DateTime)
    status = db.Column(db.String(20), default='ongoing') # 'ongoing', 'completed'
    cheating_score = db.Column(db.Integer, default=0)
    ip_address = db.Column(db.String(50))
    device_fingerprint = db.Column(db.Text)

    answers = db.relationship('StudentAnswer', backref='attempt', lazy=True)
    logs = db.relationship('ProctorLog', backref='attempt', lazy=True)
    result = db.relationship('Result', backref='attempt', uselist=False)

class StudentAnswer(db.Model):
    __tablename__ = 'tn_student_answers'
    id = db.Column(db.Integer, primary_key=True)
    attempt_id = db.Column(db.Integer, db.ForeignKey('tn_exam_attempts.id'), nullable=False)
    question_id = db.Column(db.Integer, db.ForeignKey('tn_questions.id'), nullable=False)
    selected_option_id = db.Column(db.Integer, db.ForeignKey('tn_options.id'))
    is_correct = db.Column(db.Boolean)

class Result(db.Model):
    __tablename__ = 'tn_results'
    id = db.Column(db.Integer, primary_key=True)
    attempt_id = db.Column(db.Integer, db.ForeignKey('tn_exam_attempts.id'), nullable=False)
    score = db.Column(db.Float, default=0.0)
    total_questions = db.Column(db.Integer)
    correct_answers = db.Column(db.Integer)
    accuracy = db.Column(db.Float)
    status = db.Column(db.String(20)) # 'pass', 'fail'

class ProctorLog(db.Model):
    __tablename__ = 'tn_proctor_logs'
    id = db.Column(db.Integer, primary_key=True)
    attempt_id = db.Column(db.Integer, db.ForeignKey('tn_exam_attempts.id'), nullable=False)
    event_type = db.Column(db.String(50)) # 'tab_switch', 'minimize', 'refresh'
    details = db.Column(db.Text)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
