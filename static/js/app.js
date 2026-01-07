// static/js/app.js
// Handles authentication, token storage, exam flow, auto‑save, and result display

const API_BASE = '/api';

function setAuthHeader(config = {}) {
    const token = localStorage.getItem('jwt');
    if (token) {
        config.headers = config.headers || {};
        config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
}

// ---------- Auth ----------
async function login(event) {
    event.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    try {
        const res = await axios.post(`${API_BASE}/auth/login`, { email, password });
        const { access_token, role, name } = res.data;
        localStorage.setItem('jwt', access_token);
        localStorage.setItem('role', role);
        localStorage.setItem('name', name);
        // redirect based on role
        if (role === 'examiner') {
            window.location.href = '/examiner_dashboard.html';
        } else {
            // Redirect students to Home Page as requested
            window.location.href = '/';
        }
    } catch (err) {
        showMessage(err.response?.data?.msg || 'Login failed');
    }
}

function logout() {
    localStorage.clear();
    window.location.href = '/';
}

function showMessage(msg) {
    const el = document.getElementById('msg');
    if (el) {
        el.textContent = msg;
        el.className = 'mt-3 text-center text-danger fw-bold';
    } else {
        alert(msg);
    }
}

// ---------- Student Dashboard ----------
async function loadExams() {
    try {
        const cfg = setAuthHeader();
        const res = await axios.get(`${API_BASE}/student/exams`, cfg);
        const exams = res.data;
        const container = document.getElementById('examsContainer');
        container.innerHTML = '';
        exams.forEach(e => {
            const card = document.createElement('div');
            card.className = 'col-md-4';

            let actionBtn = '';
            if (e.attempt_status === 'completed') {
                actionBtn = `<a href="/result.html?attempt_id=${e.last_attempt_id}" class="btn btn-success w-100">View Result</a>`;
            } else if (e.attempt_status === 'ongoing') {
                actionBtn = `<button class="btn btn-warning w-100 text-dark" onclick="startAttempt(${e.id})">Resume Exam</button>`;
            } else {
                actionBtn = `<button class="btn btn-primary w-100" onclick="startAttempt(${e.id})">Start Exam</button>`;
            }

            card.innerHTML = `
        <div class="card-exam">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <h4 class="text-accent mb-0">${e.title}</h4>
            ${e.attempt_status === 'completed' ? '<span class="badge bg-success">Completed</span>' : ''}
            ${e.attempt_status === 'ongoing' ? '<span class="badge bg-warning text-dark">Ongoing</span>' : ''}
          </div>
          <p class="text-secondary-custom">${e.description || 'No description available.'}</p>
          <div class="mt-auto">
            <p class="fw-bold">⏱ Duration: ${e.duration} min</p>
            ${actionBtn}
          </div>
        </div>`;
            container.appendChild(card);
        });
    } catch (err) {
        console.error(err);
        showMessage('Failed to load exams');
    }
}

// ---------- Examiner Dashboard ----------
async function loadExaminerExams(mode = 'manage') {
    const container = document.getElementById('examsContainer');
    if (!container) return;

    try {
        const config = setAuthHeader();
        const response = await axios.get(`${API_BASE}/examiner/exams`, config);
        const exams = response.data;

        if (exams.length === 0) {
            container.innerHTML = '<div class="col-12 text-center text-secondary-custom"><p>No exams created yet.</p></div>';
            return;
        }

        container.innerHTML = '';
        exams.forEach(exam => {
            const dateStr = new Date(exam.created_at).toLocaleDateString();
            let bodyContent = '';
            let footerContent = '';

            // Title Logic
            const titleClick = mode === 'manage' ? `onclick="viewExamDetails(${exam.id})"` : '';
            const titleClass = mode === 'manage' ? 'text-accent mb-0 cursor-pointer hover-underline' : 'text-accent mb-0';
            const titleStyle = mode === 'manage' ? 'style="cursor:pointer;"' : '';

            if (mode === 'manage') {
                // Manage Mode
                // Body: Description + Duration
                bodyContent = `
                    <p class="text-light small mb-3 description-truncate flex-grow-1" title="${exam.description || ''}">${exam.description || 'No description provided.'}</p>
                    <div class="mb-3">
                         <small class="text-secondary-custom"><i class="far fa-clock"></i> ${exam.duration} mins</small>
                    </div>
                `;

                // Footer: Edit/Delete Buttons (Right Aligned)
                footerContent = `
                    <div class="d-flex justify-content-end gap-2 mt-auto">
                        <button class="btn btn-outline-warning btn-sm" onclick="viewExamDetails(${exam.id})" title="View/Edit Details">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-outline-danger btn-sm" onclick="deleteExam(${exam.id})" title="Delete Exam">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                `;

            } else if (mode === 'analytics') {
                // Analytics Mode
                // Body: Description (Left) -- Stacked Stats (Right, below date)
                bodyContent = `
                    <div class="d-flex justify-content-between">
                        <p class="text-light small mb-3 description-truncate flex-grow-1 pe-3" title="${exam.description || ''}">${exam.description || 'No description provided.'}</p>
                        <div class="text-end ms-2 d-flex flex-column gap-1 mt-2">
                             <span class="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25" style="width: 80px;">
                                <i class="fas fa-check-circle"></i> ${exam.pass_count} Pass
                             </span>
                             <span class="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25" style="width: 80px;">
                                <i class="fas fa-times-circle"></i> ${exam.fail_count} Fail
                             </span>
                        </div>
                    </div>
                `;

                // Footer: View Result (Left only)
                footerContent = `
                    <div class="mt-auto">
                        <button class="btn btn-outline-info btn-sm" onclick="viewResults(${exam.id})" title="View Results">
                            <i class="fas fa-chart-bar"></i> View Results
                        </button>
                    </div>
                `;
            }

            const card = `
                <div class="col-md-4">
                    <div class="glass-card p-4 h-100 position-relative exam-card d-flex flex-column">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                             <h5 class="${titleClass}" ${titleClick} ${titleStyle}>${exam.title}</h5>
                             <small class="text-muted text-nowrap ms-2">${dateStr}</small>
                        </div>
                        
                        ${bodyContent}

                        ${footerContent}
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', card);
        });

    } catch (error) {
        console.error('Error loading exams:', error);
        container.innerHTML = '<div class="col-12 text-center text-danger"><p>Failed to load exams.</p></div>';
    }
}

window.viewExamDetails = async function (examId) {
    try {
        const cfg = setAuthHeader();
        const res = await axios.get(`${API_BASE}/examiner/exams/${examId}`, cfg);
        const exam = res.data;

        document.getElementById('viewExamTitle').textContent = exam.title;
        document.getElementById('viewExamMeta').innerHTML = `
            <strong>Duration:</strong> ${exam.duration} mins &nbsp;|&nbsp; 
            <strong>Total Marks:</strong> ${exam.total_marks} <br/>
            <span class="text-muted">${exam.description || 'No description'}</span>
        `;

        const qContainer = document.getElementById('viewExamQuestions');
        qContainer.innerHTML = '';

        if (!exam.questions || exam.questions.length === 0) {
            qContainer.innerHTML = '<p class="text-muted text-center my-4">No questions added yet.</p>';
        } else {
            exam.questions.forEach((q, idx) => {
                const qDiv = document.createElement('div');
                qDiv.className = 'mb-3 p-3 border border-secondary rounded bg-dark-subtle';
                qDiv.innerHTML = `
                    <div class="d-flex justify-content-between">
                        <h6 class="text-info mb-2">Q${idx + 1}: ${q.text}</h6>
                        <span class="badge bg-secondary">${q.type.toUpperCase()}</span>
                    </div>
                    <small class="text-muted d-block mb-2">Topic: ${q.topic}</small>
                    <ul class="list-group mt-2">
                        ${q.options.map(o => `
                            <li class="list-group-item bg-transparent text-light border-secondary p-2 ${o.is_correct ? 'border-success border-2' : ''}">
                                ${o.text}
                                ${o.is_correct ? '<span class="badge bg-success float-end">Correct</span>' : ''}
                            </li>
                        `).join('')}
                    </ul>
                `;
                qContainer.appendChild(qDiv);
            });
        }

        const myModal = new bootstrap.Modal(document.getElementById('viewExamModal'));
        myModal.show();

    } catch (err) {
        alert('Failed to load exam details');
    }
};

window.viewResults = async function (examId) {
    try {
        const cfg = setAuthHeader();
        const res = await axios.get(`${API_BASE}/exams/${examId}/results`, cfg);
        const data = res.data;

        const tbody = document.getElementById('resultsTableBody');
        tbody.innerHTML = '';

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No completed attempts yet.</td></tr>';
        } else {
            data.forEach(row => {
                const tr = document.createElement('tr');
                const statusColor = row.status === 'pass' ? 'text-success' : 'text-danger';
                tr.innerHTML = `
                 <td>${row.student_name}</td>
                 <td class="text-muted"><small>${row.student_email}</small></td>
                 <td>${row.score} / ${row.total_marks}</td>
                 <td class="fw-bold ${statusColor} text-uppercase">${row.status}</td>
                 <td><small>${row.date}</small></td>
               `;
                tbody.appendChild(tr);
            });
        }

        const myModal = new bootstrap.Modal(document.getElementById('resultsModal'));
        myModal.show();

    } catch (err) {
        alert(err.response?.data?.msg || 'Failed to load results');
    }
};

async function deleteExam(examId) {
    if (!confirm("Are you sure you want to delete this exam? This cannot be undone.")) return;
    try {
        const cfg = setAuthHeader();
        await axios.delete(`${API_BASE}/exams/${examId}`, cfg);
        loadExaminerExams(); // Reload list
    } catch (err) {
        alert(err.response?.data?.msg || 'Failed to delete exam');
    }
}

// Redirect to instructions page instead of direct start
window.startAttempt = function (examId) {
    window.location.href = `/instructions.html?exam_id=${examId}`;
};

// Called from instructions.html
window.startAttemptFromInstructions = async function (examId) {
    try {
        const cfg = setAuthHeader();
        // Check if existing attempt first to avoid errors? API handles it.
        const res = await axios.post(`${API_BASE}/exams/${examId}/attempt`, {}, cfg);
        const attemptId = res.data.attempt_id;

        // load exam details into session
        const detailsRes = await axios.get(`${API_BASE}/exams/${examId}`, cfg);
        sessionStorage.setItem('examData', JSON.stringify(detailsRes.data));

        // navigate to exam page
        window.location.href = `/exam.html?exam_id=${examId}&attempt_id=${attemptId}`;
    } catch (err) {
        if (err.response && err.response.data && err.response.data.attempt_id) {
            // If attempt exists, just resume
            const attemptId = err.response.data.attempt_id;
            const detailsRes = await axios.get(`${API_BASE}/exams/${examId}`, setAuthHeader());
            sessionStorage.setItem('examData', JSON.stringify(detailsRes.data));
            window.location.href = `/exam.html?exam_id=${examId}&attempt_id=${attemptId}`;
        } else {
            alert(err.response?.data?.msg || 'Could not start exam');
        }
    }
};

// ---------- Exam Flow ----------
let currentAttemptId = null;
let examTimer = null;
let remainingSeconds = 0;
let warningCount = 0;
let isSubmitting = false;

// startAttempt is now handled via window.startAttempt redirection above

async function loadExamDetails(examId) {
    const cfg = setAuthHeader();
    const res = await axios.get(`${API_BASE}/exams/${examId}`, cfg);
    // store exam data in sessionStorage for the exam page
    sessionStorage.setItem('examData', JSON.stringify(res.data));
}

// Called from exam.html
function initExamPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const examId = urlParams.get('exam_id');
    const attemptId = urlParams.get('attempt_id');
    currentAttemptId = attemptId;
    const exam = JSON.parse(sessionStorage.getItem('examData'));

    if (!exam) return showMessage('Exam data missing');

    document.getElementById('examTitle').textContent = exam.title;
    renderExam(exam);
    startTimer(exam.duration * 60);

    // auto‑save every 30 seconds
    setInterval(autoSaveAnswers, 30000);

    // START PROCTORING
    initProctoring();
}

function initProctoring() {
    // 1. Tab Switching Detection
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            handleSuspiciousActivity("tab_switch");
        }
    });

    // 2. Window Blur Detection
    window.addEventListener("blur", () => {
        if (!isSubmitting) {
            handleSuspiciousActivity("window_blur");
        }
    });
}

function handleSuspiciousActivity(type) {
    warningCount++;
    console.warn(`Suspicious activity detected: ${type}. Warning ${warningCount}`);

    // Log to server
    logEvent(type, `Warning count: ${warningCount}`);

    // Show Alert
    alert(`⚠️ WARNING: Suspicious activity detected (${type})! \n\nContinuous violations will be recorded.`);
}

async function logEvent(type, details) {
    if (!currentAttemptId) return;
    try {
        await axios.post(`${API_BASE}/attempts/${currentAttemptId}/log`, {
            event_type: type,
            details: details
        }, setAuthHeader());
    } catch (e) {
        console.error("Failed to log event", e);
    }
}

function renderExam(exam) {
    const container = document.getElementById('examContainer');
    container.innerHTML = '';

    exam.questions.forEach((q, idx) => {
        const qDiv = document.createElement('div');
        qDiv.className = 'question-container';
        qDiv.innerHTML = `
      <h5 class="mb-3">Q${idx + 1}. ${q.text}</h5>
      <div id="options-${q.id}">
        ${q.options.map(o => `
          <div class="option-card" onclick="selectOption(${q.id}, ${o.id})">
            <div class="form-check w-100">
              <input class="form-check-input" type="radio" name="question-${q.id}" id="opt-${o.id}" value="${o.id}">
              <label class="form-check-label w-100" style="cursor: pointer;" for="opt-${o.id}">${o.text}</label>
            </div>
          </div>`).join('')}
      </div>`;
        container.appendChild(qDiv);
    });

    // submit button
    const submitBtn = document.createElement('button');
    submitBtn.className = 'btn btn-success btn-lg px-5';
    submitBtn.textContent = 'Submit Exam';
    submitBtn.onclick = submitExam;
    const btnDiv = document.createElement('div');
    btnDiv.className = 'text-center mt-4';
    btnDiv.appendChild(submitBtn);
    container.appendChild(btnDiv);
}

// Global helper for option card clicking
window.selectOption = function (qId, oId) {
    // Determine the radio button
    const rad = document.getElementById(`opt-${oId}`);
    if (rad) {
        rad.checked = true;
        // visual update
        const container = document.getElementById(`options-${qId}`);
        const allCards = container.querySelectorAll('.option-card');
        allCards.forEach(c => c.classList.remove('selected'));
        rad.closest('.option-card').classList.add('selected');
    }
};

function startTimer(seconds) {
    remainingSeconds = seconds;
    const timerEl = document.getElementById('timer');
    updateTimerDisplay(timerEl);
    examTimer = setInterval(() => {
        remainingSeconds--;
        updateTimerDisplay(timerEl);
        if (remainingSeconds <= 0) {
            clearInterval(examTimer);
            submitExam();
        }
    }, 1000);
}

function updateTimerDisplay(el) {
    const mins = Math.floor(remainingSeconds / 60);
    const secs = remainingSeconds % 60;
    el.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    if (remainingSeconds < 60) {
        el.style.color = 'var(--color-danger)';
        el.style.borderColor = 'var(--color-danger)';
    }
}

function collectAnswers() {
    const exam = JSON.parse(sessionStorage.getItem('examData'));
    const answers = [];
    exam.questions.forEach(q => {
        const selected = document.querySelector(`input[name="question-${q.id}"]:checked`);
        answers.push({
            question_id: q.id,
            selected_option_id: selected ? parseInt(selected.value) : null
        });
    });
    return answers;
}

async function autoSaveAnswers() {
    if (!currentAttemptId) return;
    const answers = collectAnswers();
    try {
        await axios.post(`${API_BASE}/attempts/${currentAttemptId}/log`, {
            event_type: 'autosave',
            details: JSON.stringify({ answers })
        }, setAuthHeader());
        console.log('Auto‑saved');
    } catch (e) {
        console.warn('Auto‑save failed');
    }
}

async function submitExam() {
    isSubmitting = true; // Prevent proctoring triggers
    if (!confirm("Are you sure you want to submit?")) {
        isSubmitting = false; // Re-enable if cancelled
        return;
    }

    clearInterval(examTimer);
    const answers = collectAnswers();
    try {
        const res = await axios.post(`${API_BASE}/attempts/${currentAttemptId}/submit`, { answers }, setAuthHeader());
        // redirect to result page
        window.location.href = `/result.html?attempt_id=${currentAttemptId}`;
    } catch (err) {
        showMessage('Submission failed');
    }
}

// ---------- Result Page ----------
async function loadResult() {
    const urlParams = new URLSearchParams(window.location.search);
    const attemptId = urlParams.get('attempt_id');
    try {
        const res = await axios.get(`${API_BASE}/attempts/${attemptId}/result`, setAuthHeader());
        const data = res.data;
        const container = document.getElementById('resultContainer');
        const statusClass = data.status === 'pass' ? 'result-pass' : 'result-fail';

        container.innerHTML = `
          <h3 class="mb-2 text-accent">${data.exam_title}</h3>
          <p class="text-secondary-custom mb-4">Attempted on: ${data.attempt_date}</p>
          
          <div class="result-circle ${statusClass}">
            ${data.score}
          </div>
          
          <div class="row text-start mt-4">
             <div class="col-6 mb-3">
                <span class="text-secondary-custom">Total Marks:</span>
                <span class="fw-bold float-end">${data.total_marks}</span>
             </div>
             <div class="col-6 mb-3">
                <span class="text-secondary-custom">Correct Answers:</span>
                <span class="fw-bold float-end">${data.correct_answers} / ${data.total_questions}</span>
             </div>
             <div class="col-6">
                <span class="text-secondary-custom">Accuracy:</span>
                <span class="fw-bold float-end">${data.accuracy.toFixed(2)}%</span>
             </div>
             <div class="col-6">
                <span class="text-secondary-custom">Status:</span>
                <span class="fw-bold float-end text-uppercase">${data.status}</span>
             </div>
             <div class="col-6 mt-3">
                <span class="text-secondary-custom">Rank:</span>
                <span class="fw-bold float-end text-accent">#${data.rank}</span>
             </div>
             <div class="col-6 mt-3">
                <span class="text-secondary-custom">Percentile:</span>
                <span class="fw-bold float-end text-accent">${data.percentile}%</span>
             </div>
          </div>
          
          
          <h5 class="mt-4 mb-3 text-start">Topic Analysis</h5>
          <div class="text-start">
            ${Object.entries(data.topic_analysis || {}).map(([topic, stats]) => `
                <div class="mb-2">
                    <div class="d-flex justify-content-between">
                        <span>${topic}</span>
                        <span>${stats.correct}/${stats.total}</span>
                    </div>
                    <div class="progress" style="height: 6px;">
                        <div class="progress-bar bg-accent" role="progressbar" style="width: ${(stats.correct / stats.total) * 100}%"></div>
                    </div>
                </div>
            `).join('')}
          </div>

          <h5 class="mt-5 mb-3 text-start">Detailed Question Analysis</h5>
          <div class="text-start">
             ${data.questions_analysis ? data.questions_analysis.map((q, idx) => `
                <div class="card mb-3 bg-dark border-secondary">
                    <div class="card-body">
                        <h6 class="card-title text-accent">Q${idx + 1}: ${q.text}</h6>
                        <small class="text-muted d-block mb-2">Topic: ${q.topic}</small>
                        <div class="list-group">
                            ${q.options.map(opt => {
            let itemClass = 'list-group-item bg-transparent text-light border-secondary';
            let badge = '';

            if (opt.id === q.correct_option_id) {
                itemClass += ' border-success border-2 fw-bold'; // Correct Answer
                badge = '<span class="badge bg-success float-end">Correct Answer</span>';
            }

            if (opt.id === q.selected_option_id) {
                if (opt.id === q.correct_option_id) {
                    itemClass += ' bg-success'; // Selected Correctly
                    itemClass = itemClass.replace('bg-transparent', '');
                    badge = '<span class="badge bg-light text-success float-end">Your Answer (Correct)</span>';
                } else {
                    itemClass += ' bg-danger'; // Selected Incorrectly
                    itemClass = itemClass.replace('bg-transparent', '');
                    badge = '<span class="badge bg-light text-danger float-end">Your Answer (Wrong)</span>';
                }
            }

            return `
                                    <div class="${itemClass}">
                                        ${opt.text}
                                        ${badge}
                                    </div>
                                `;
        }).join('')}
                        </div>
                    </div>
                </div>
             `).join('') : '<p class="text-muted">No detailed analysis available.</p>'}
          </div>
        `;
    } catch (err) {
        showMessage('Could not load result');
    }
}

// ---------- Auth (Signup & Reset) ----------

async function signup(event) {
    event.preventDefault();
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const role = document.getElementById('role').value;

    try {
        await axios.post(`${API_BASE}/auth/register`, { name, email, password, role });
        const msgDiv = document.getElementById('msg');
        msgDiv.textContent = 'Signup successful! Redirecting to login...';
        msgDiv.className = 'mt-3 text-center text-success fw-bold';
        setTimeout(() => window.location.href = '/', 1500);
    } catch (err) {
        showMessage(err.response?.data?.msg || 'Signup failed');
    }
}

async function requestPasswordReset(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    try {
        const res = await axios.post(`${API_BASE}/auth/forgot-password`, { email });
        showMessage(res.data.msg);
        if (res.data.reset_token) {
            const display = document.getElementById('tokenDisplay');
            if (display) {
                display.style.display = 'block';
                display.textContent = `DEV ONLY: Token = ${res.data.reset_token}`;
            }
        }
    } catch (err) {
        showMessage(err.response?.data?.msg || 'Request failed');
    }
}

async function resetPassword(event) {
    event.preventDefault();
    const token = document.getElementById('token').value;
    const newPassword = document.getElementById('newPassword').value;
    try {
        const res = await axios.post(`${API_BASE}/auth/reset-password`, { token, new_password: newPassword });
        showMessage(res.data.msg);
        setTimeout(() => window.location.href = '/', 1500);
    } catch (err) {
        showMessage(err.response?.data?.msg || 'Reset failed');
    }
}

// ---------- Init ----------
document.addEventListener('DOMContentLoaded', () => {
    // login page
    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.addEventListener('submit', login);

    // signup page
    const signupForm = document.getElementById('signupForm');
    if (signupForm) signupForm.addEventListener('submit', signup);

    // forgot password page
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    if (forgotPasswordForm) forgotPasswordForm.addEventListener('submit', requestPasswordReset);

    // reset password page
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    if (resetPasswordForm) resetPasswordForm.addEventListener('submit', resetPassword);

    // logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);

    // student or examiner dashboard handling
    // We removed the auto-detection logic here.
    // Each dashboard template (student_dashboard.html, examiner_dashboard.html, analytics_dashboard.html)
    // now explicitly calls its own load function (loadExams or loadExaminerExams).


    // exam page
    if (document.getElementById('examContainer')) initExamPage();

    // result page
    if (document.getElementById('resultContainer')) loadResult();

    // Create exam page
    const createForm = document.getElementById('createExamForm');
    if (createForm) {
        createForm.addEventListener('submit', createExam);
        document.getElementById('addQuestionForm').addEventListener('submit', addQuestion);
        document.getElementById('finalizeExamBtn').addEventListener('click', finalizeExam);
    }
});

// ---------- Examiner: Create Exam ----------
async function createExam(event) {
    event.preventDefault();
    const title = document.getElementById('examTitle').value.trim();
    const description = document.getElementById('examDescription').value.trim();
    const duration = parseInt(document.getElementById('examDuration').value, 10);
    const totalMarks = parseInt(document.getElementById('totalMarks').value, 10);

    try {
        const cfg = setAuthHeader();
        const res = await axios.post(`${API_BASE}/exams`, {
            title,
            description,
            duration,
            total_marks: totalMarks
        }, cfg);
        const examId = res.data.exam_id;
        sessionStorage.setItem('newExamId', examId);
        document.getElementById('createExamForm').style.display = 'none';
        document.getElementById('questionSection').style.display = 'block';
        initOptions(); // Initialize dynamic inputs

        // Show success message inside the container
        const container = document.querySelector('.container');
        const alert = document.createElement('div');
        alert.className = 'alert alert-success';
        alert.textContent = 'Exam created! now add questions.';
        container.insertBefore(alert, container.firstChild);

    } catch (err) {
        showMessage(err.response?.data?.msg || 'Failed to create exam');
    }
}

// Replaces parseOptions and addQuestion with new logic

// --- Dynamic Option Inputs ---

let optionCount = 0;

function addOptionInput(value = '', isCorrect = false) {
    optionCount++;
    const container = document.getElementById('optionsDynamicContainer');
    const div = document.createElement('div');
    div.className = 'input-group';
    div.innerHTML = `
        <div class="input-group-text">
            <input class="form-check-input mt-0" type="radio" name="correctOption" value="${optionCount}" ${isCorrect ? 'checked' : ''} aria-label="Mark as correct">
        </div>
        <input type="text" class="form-control option-text-input" placeholder="Option ${optionCount}" value="${value}" required>
        <button class="btn btn-outline-danger" type="button" onclick="this.parentElement.remove()">X</button>
    `;
    container.appendChild(div);
}

// Initialize with 2 options
function initOptions() {
    const container = document.getElementById('optionsDynamicContainer');
    if (container) {
        container.innerHTML = '';
        optionCount = 0;
        addOptionInput('', false); // Do NOT pre-select
        addOptionInput('');
    }
}

async function addQuestion(event) {
    event.preventDefault();
    const examId = sessionStorage.getItem('newExamId');
    if (!examId) return showMessage('Exam not created yet.');

    const questionText = document.getElementById('questionText').value.trim();
    const questionType = document.getElementById('questionType').value;
    const topic = document.getElementById('questionTopic').value.trim() || 'General';

    // Gather Options
    const optionsContainer = document.getElementById('optionsDynamicContainer');
    const optionDivs = optionsContainer.querySelectorAll('.input-group');
    const parsedOptions = [];

    optionDivs.forEach(div => {
        const textInput = div.querySelector('.option-text-input');
        const radio = div.querySelector('input[type="radio"]');
        if (textInput.value.trim() !== '') {
            parsedOptions.push({
                text: textInput.value.trim(),
                is_correct: radio.checked
            });
        }
    });

    if (parsedOptions.length < 2) {
        return showMessage('Please provide at least 2 valid options.');
    }

    if (!parsedOptions.some(o => o.is_correct)) {
        return showMessage('Please mark one option as the correct answer.');
    }

    const payload = {
        text: questionText,
        question_type: questionType,
        topic: topic,
        options: parsedOptions
    };

    try {
        const cfg = setAuthHeader();
        await axios.post(`${API_BASE}/exams/${examId}/questions`, payload, cfg);

        // Reset Form
        document.getElementById('questionText').value = '';
        document.getElementById('questionTopic').value = '';
        initOptions(); // Reset options to default state

        const list = document.getElementById('questionsList');
        const qItem = document.createElement('div');
        qItem.className = 'glass-card mb-2 p-3';
        qItem.innerHTML = `<strong class="text-accent">Q:</strong> ${questionText} <br/> <small class="text-muted">(${parsedOptions.length} options)</small>`;
        list.appendChild(qItem);
    } catch (err) {
        showMessage(err.response?.data?.msg || 'Failed to add question');
    }
}

function finalizeExam() {
    window.location.href = '/examiner_dashboard.html';
}
