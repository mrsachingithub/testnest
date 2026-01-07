from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from models import db, User
from functools import wraps

auth_bp = Blueprint('auth', __name__)

def role_required(role):
    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            claims = get_jwt()
            if claims.get('role') != role:
                return jsonify({"msg": "Access forbidden: Insufficient permissions"}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password') or not data.get('role'):
        return jsonify({"msg": "Missing required fields"}), 400
    
    if User.query.filter_by(email=data['email']).first():
        return jsonify({"msg": "User already exists"}), 400
    
    new_user = User(
        name=data.get('name', ''),
        email=data['email'],
        role=data['role']
    )
    new_user.set_password(data['password'])
    db.session.add(new_user)
    db.session.commit()
    
    return jsonify({"msg": "User registered successfully"}), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({"msg": "Missing email or password"}), 400
    
    user = User.query.filter_by(email=data['email']).first()
    if user and user.check_password(data['password']):
        access_token = create_access_token(
            identity=str(user.id), 
            additional_claims={"role": user.role, "name": user.name}
        )
        return jsonify(access_token=access_token, role=user.role, name=user.name), 200
    
    return jsonify({"msg": "Invalid email or password"}), 401

from flask import current_app

# Helper to get serializer using app's secret key
def get_serializer():
    return URLSafeTimedSerializer(current_app.config['SECRET_KEY'])


@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    email = data.get('email')
    if not email:
        return jsonify({"msg": "Email required"}), 400
    user = User.query.filter_by(email=email).first()
    if not user:
        # Do not reveal user existence
        return jsonify({"msg": "If the email exists, a reset link has been sent"}), 200
    
    # Ensure serializer is initialized before use
    if 'serializer' not in globals():
        # This block handles the case where 'app' might not have been imported/available
        # and the serializer wasn't initialized. This is a safeguard for the edit.
        # In a real app, ensure app and its config are loaded before this point.
        return jsonify({"msg": "Server configuration error: SECRET_KEY not set for password reset"}), 500

    # Ensure serializer is initialized before use
    # Use helper to get serializer
    token = get_serializer().dumps(email, salt='password-reset-salt')
    # In a real app, send email with link containing token
    # Here we just return token for testing
    return jsonify({"msg": "Reset token generated", "reset_token": token}), 200


@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json()
    token = data.get('token')
    new_password = data.get('new_password')
    if not token or not new_password:
        return jsonify({"msg": "Token and new password required"}), 400
    
    # Ensure serializer is initialized before use
    if 'serializer' not in globals():
        return jsonify({"msg": "Server configuration error: SECRET_KEY not set for password reset"}), 500

    try:
        email = serializer.loads(token, salt='password-reset-salt', max_age=3600)
    except SignatureExpired:
        return jsonify({"msg": "Token expired"}), 400
    except BadSignature:
        return jsonify({"msg": "Invalid token"}), 400
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"msg": "User not found"}), 404
    user.set_password(new_password)
    db.session.commit()
    return jsonify({"msg": "Password updated successfully"}), 200


@auth_bp.route('/profile', methods=['GET'])
@jwt_required()
def profile():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    return jsonify(id=user.id, name=user.name, email=user.email, role=user.role), 200
