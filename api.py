from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Exam, Question, Option, ExamAttempt, Result, ProctorLog, User, StudentAnswer
from auth import role_required
from datetime import datetime

api_bp = Blueprint('api', __name__)

# --- Examiner Endpoints ---

@api_bp.route('/exams', methods=['POST'])
@role_required('examiner')
def create_exam():
    data = request.get_json()
    user_id = get_jwt_identity()
    
    new_exam = Exam(
        title=data['title'],
        description=data.get('description', ''),
        duration=data['duration'],
        total_marks=data.get('total_marks', 100),
        created_by=user_id
    )
    db.session.add(new_exam)
    db.session.commit()
    
    return jsonify({"msg": "Exam created successfully", "exam_id": new_exam.id}), 201

@api_bp.route('/exams/<int:exam_id>/questions', methods=['POST'])
@role_required('examiner')
def add_question(exam_id):
    data = request.get_json()
    exam = Exam.query.get_or_404(exam_id)
    
    new_question = Question(
        exam_id=exam.id,
        text=data['text'],
        question_type=data.get('question_type', 'mcq'),
        marks=data.get('marks', 1),
        difficulty=data.get('difficulty', 'medium'),
        topic=data.get('topic', 'General')
    )
    db.session.add(new_question)
    db.session.flush() # Get question ID
    
    for opt in data['options']:
        new_option = Option(
            question_id=new_question.id,
            text=opt['text'],
            is_correct=opt.get('is_correct', False)
        )
        db.session.add(new_option)
    
    db.session.commit()
    return jsonify({"msg": "Question added successfully"}), 201

@api_bp.route('/exams/<int:exam_id>', methods=['DELETE'])
@role_required('examiner')
def delete_exam(exam_id):
    user_id = get_jwt_identity()
    exam = Exam.query.get_or_404(exam_id)
    if exam.created_by != int(user_id):
        return jsonify({"msg": "Unauthorized"}), 403
    
    db.session.delete(exam)
    db.session.commit()
    return jsonify({"msg": "Exam deleted successfully"}), 200

@api_bp.route('/examiner/exams', methods=['GET'])
@role_required('examiner')
def get_examiner_exams():
    user_id = get_jwt_identity()
    exams = Exam.query.filter_by(created_by=user_id).all()
    results = []
    
    for e in exams:
        # Calculate stats
        pass_count = 0
        fail_count = 0
        attempts = ExamAttempt.query.filter_by(exam_id=e.id, status='completed').all()
        for att in attempts:
            if att.result:
                if att.result.status == 'pass':
                    pass_count += 1
                else:
                    fail_count += 1
                    
        results.append({
            "id": e.id,
            "title": e.title,
            "description": e.description,
            "duration": e.duration,
            "created_at": e.created_at.isoformat(),
            "pass_count": pass_count,
            "fail_count": fail_count
        })
        
    return jsonify(results), 200

@api_bp.route('/examiner/exams/<int:exam_id>', methods=['GET'])
@role_required('examiner')
def get_examiner_exam_details(exam_id):
    user_id = get_jwt_identity()
    exam = Exam.query.get_or_404(exam_id)
    if exam.created_by != int(user_id):
        return jsonify({"msg": "Unauthorized"}), 403
    
    questions = []
    for q in exam.questions:
        questions.append({
            "id": q.id,
            "text": q.text,
            "type": q.question_type,
            "topic": q.topic,
            "options": [{"id": o.id, "text": o.text, "is_correct": o.is_correct} for o in q.options]
        })
        
    return jsonify({
        "id": exam.id,
        "title": exam.title,
        "description": exam.description,
        "duration": exam.duration,
        "total_marks": exam.total_marks,
        "questions": questions
    }), 200

@api_bp.route('/exams/<int:exam_id>/results', methods=['GET'])
@role_required('examiner')
def get_exam_results_for_examiner(exam_id):
    user_id = get_jwt_identity()
    exam = Exam.query.get_or_404(exam_id)
    if exam.created_by != int(user_id):
        return jsonify({"msg": "Unauthorized"}), 403
        
    attempts = ExamAttempt.query.filter_by(exam_id=exam_id, status='completed').all()
    data = []
    
    for att in attempts:
        student = User.query.get(att.student_id)
        if att.result:
            data.append({
                "student_name": student.name,
                "student_email": student.email,
                "score": att.result.score,
                "total_marks": exam.total_marks,
                "status": att.result.status,
                "date": att.end_time.strftime("%Y-%m-%d %H:%M")
            })
            
    return jsonify(data), 200

# --- Student Endpoints ---

@api_bp.route('/student/exams', methods=['GET'])
@jwt_required()
def get_available_exams():
    user_id = get_jwt_identity()
    exams = Exam.query.all()
    
    exam_list = []
    for e in exams:
        # Check for existing attempts
        attempt = ExamAttempt.query.filter_by(student_id=user_id, exam_id=e.id).order_by(ExamAttempt.start_time.desc()).first()
        status = 'none'
        attempt_id = None
        if attempt:
            status = attempt.status # 'ongoing' or 'completed'
            attempt_id = attempt.id

        exam_list.append({
            "id": e.id,
            "title": e.title,
            "description": e.description,
            "duration": e.duration,
            "attempt_status": status,
            "last_attempt_id": attempt_id
        })

    return jsonify(exam_list), 200

@api_bp.route('/exams/<int:exam_id>', methods=['GET'])
@jwt_required()
def get_exam_details(exam_id):
    exam = Exam.query.get_or_404(exam_id)
    questions = []
    
    # We don't send is_correct to students during the exam!
    for q in exam.questions:
        questions.append({
            "id": q.id,
            "text": q.text,
            "type": q.question_type,
            "options": [{"id": o.id, "text": o.text} for o in q.options]
        })
        
    return jsonify({
        "id": exam.id,
        "title": exam.title,
        "duration": exam.duration,
        "questions": questions
    }), 200

@api_bp.route('/exams/<int:exam_id>/attempt', methods=['POST'])
@role_required('student')
def start_attempt(exam_id):
    user_id = get_jwt_identity()
    
    # Check for ANY attempt (completed or ongoing)
    existing_completed = ExamAttempt.query.filter_by(student_id=user_id, exam_id=exam_id, status='completed').first()
    if existing_completed:
        return jsonify({"msg": "You have already completed this exam."}), 403

    # Check if already has an ongoing attempt
    existing = ExamAttempt.query.filter_by(student_id=user_id, exam_id=exam_id, status='ongoing').first()
    if existing:
        return jsonify({"msg": "Attempt already in progress", "attempt_id": existing.id}), 200
        
    new_attempt = ExamAttempt(
        student_id=user_id,
        exam_id=exam_id,
        start_time=datetime.utcnow(),
        status='ongoing',
        ip_address=request.remote_addr,
        device_fingerprint=request.headers.get('User-Agent')
    )
    db.session.add(new_attempt)
    db.session.commit()
    
    return jsonify({"msg": "Exam started", "attempt_id": new_attempt.id}), 201

# --- Submission & Proctoring ---

@api_bp.route('/attempts/<int:attempt_id>/log', methods=['POST'])
@jwt_required()
def log_event(attempt_id):
    data = request.get_json()
    new_log = ProctorLog(
        attempt_id=attempt_id,
        event_type=data['event_type'],
        details=data.get('details', '')
    )
    db.session.add(new_log)
    
    # Optionally increase cheating score
    if data['event_type'] in ['tab_switch', 'minimize']:
        attempt = ExamAttempt.query.get(attempt_id)
        attempt.cheating_score += 1
        
    db.session.commit()
    return jsonify({"msg": "Event logged"}), 200

@api_bp.route('/attempts/<int:attempt_id>/submit', methods=['POST'])
@jwt_required()
def submit_exam(attempt_id):
    data = request.get_json() # List of {question_id, selected_option_id}
    attempt = ExamAttempt.query.get_or_404(attempt_id)
    
    if attempt.status == 'completed':
        return jsonify({"msg": "Exam already submitted"}), 400
        
    score = 0
    correct_count = 0
    total_q = len(attempt.exam.questions)
    
    # Clear any previous answers if it's a re-submission (though status check prevents this)
    # But for robustness, we just iterate data
    for ans in data.get('answers', []):
        q_id = ans['question_id']
        opt_id = ans.get('selected_option_id')
        
        question = Question.query.get(q_id)
        is_correct = False
        
        if opt_id:
            correct_opt = Option.query.filter_by(question_id=q_id, is_correct=True).first()
            if correct_opt and correct_opt.id == opt_id:
                is_correct = True
                score += question.marks
                correct_count += 1
        
        new_ans = StudentAnswer(
            attempt_id=attempt_id,
            question_id=q_id,
            selected_option_id=opt_id,
            is_correct=is_correct
        )
        db.session.add(new_ans)
    
    attempt.status = 'completed'
    attempt.end_time = datetime.utcnow()
    
    # Generate Result
    accuracy = (correct_count / total_q * 100) if total_q > 0 else 0
    pass_mark = attempt.exam.total_marks * 0.4 # 40% pass
    
    result = Result(
        attempt_id=attempt_id,
        score=score,
        total_questions=total_q,
        correct_answers=correct_count,
        accuracy=accuracy,
        status='pass' if score >= pass_mark else 'fail'
    )
    db.session.add(result)
    db.session.commit()
    
    return jsonify({
        "msg": "Exam submitted successfully",
        "score": score,
        "status": result.status
    }), 200

@api_bp.route('/attempts/<int:attempt_id>/result', methods=['GET'])
@jwt_required()
def get_result(attempt_id):
    attempt = ExamAttempt.query.get_or_404(attempt_id)
    if attempt.status != 'completed' or not attempt.result:
        return jsonify({"msg": "Result not yet available"}), 404
        
    # Calculate Rank and Percentile
    all_results = Result.query.join(ExamAttempt).filter(ExamAttempt.exam_id == attempt.exam_id).order_by(Result.score.desc()).all()
    rank = 1
    for r in all_results:
        if r.id == attempt.result.id:
            break
        rank += 1
    
    total_candidates = len(all_results)
    percentile = ((total_candidates - rank) / total_candidates * 100) if total_candidates > 0 else 100

    # Topic-wise Analysis
    topic_scores = {}
    for ans in attempt.answers:
        topic = ans.question.topic or 'General'
        if topic not in topic_scores:
            topic_scores[topic] = {'correct': 0, 'total': 0}
        topic_scores[topic]['total'] += 1
        if ans.is_correct:
            topic_scores[topic]['correct'] += 1

    return jsonify({
        "exam_title": attempt.exam.title,
        "attempt_date": attempt.start_time.strftime("%d %B %Y, %I:%M %p"),
        "score": attempt.result.score,
        "total_marks": attempt.exam.total_marks,
        "correct_answers": attempt.result.correct_answers,
        "total_questions": attempt.result.total_questions,
        "accuracy": attempt.result.accuracy,
        "status": attempt.result.status,
        "rank": rank,
        "percentile": round(percentile, 2),
        "topic_analysis": topic_scores,
        "questions_analysis": [
            {
                "id": q.id,
                "text": q.text,
                "topic": q.topic,
                "selected_option_id": next((ans.selected_option_id for ans in attempt.answers if ans.question_id == q.id), None),
                "correct_option_id": next((opt.id for opt in q.options if opt.is_correct), None),
                "options": [{"id": o.id, "text": o.text} for o in q.options]
            } for q in attempt.exam.questions
        ]
    }), 200
