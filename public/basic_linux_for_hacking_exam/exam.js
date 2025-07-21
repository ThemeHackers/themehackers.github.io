document.addEventListener('DOMContentLoaded', function () {

    if (!document.getElementById('th-choice-style')) {
        const style = document.createElement('style');
        style.id = 'th-choice-style';
        style.innerHTML = `
        .th-choice-label {
            display: flex;
            align-items: center;
            background: rgba(26,26,26,0.95);
            border: 2px solid #333;
            border-radius: 12px;
            padding: 1rem 1.2rem;
            margin-bottom: 1rem;
            font-size: 1.08rem;
            cursor: pointer;
            transition: border 0.2s, box-shadow 0.2s, background 0.2s;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            position: relative;
        }
        .th-choice-label:hover {
            border: 2px solid var(--th-primary);
            background: rgba(0,255,65,0.07);
        }
        .th-choice-radio {
            accent-color: var(--th-primary);
            margin-right: 1em;
            width: 1.2em;
            height: 1.2em;
        }
        .th-choice-label.selected {
            border: 2.5px solid var(--th-primary);
            background: rgba(0,255,65,0.13);
            box-shadow: 0 0 0 2px var(--th-primary), 0 2px 8px rgba(0,255,65,0.08);
        }
        .th-section-summary {
            margin: 1.5rem 0 0.5rem 0;
            padding: 1.2rem 1.5rem;
            background: rgba(26,26,26,0.95);
            border-radius: 12px;
            border: 2px solid var(--th-primary);
            box-shadow: 0 2px 8px rgba(0,255,65,0.08);
        }
        .th-section-title {
            color: var(--th-primary);
            font-weight: bold;
            font-size: 1.1rem;
            margin-bottom: 0.5rem;
        }
        .th-section-feedback {
            font-size: 1rem;
            margin-top: 0.2rem;
        }
        .th-section-feedback.bad {
            color: var(--th-danger);
            font-weight: bold;
        }
        .th-section-feedback.good {
            color: var(--th-primary);
            font-weight: bold;
        }
        .th-section-bar {
            width: 100%;
            height: 12px;
            background: #222;
            border-radius: 8px;
            margin: 0.3rem 0 0.7rem 0;
            overflow: hidden;
        }
        .th-section-bar-inner {
            height: 100%;
            border-radius: 8px;
            background: var(--th-gradient);
            transition: width 0.5s;
        }
        .th-review-section {
            margin-bottom: 2.2rem;
        }
        .th-review-q {
            margin-bottom: 1.2rem;
            padding: 1.1rem 1.2rem;
            border-radius: 10px;
            background: rgba(26,26,26,0.93);
            border-left: 5px solid #444;
            box-shadow: 0 2px 8px rgba(0,255,65,0.04);
        }
        .th-review-q.correct {
            border-left: 5px solid var(--th-primary);
        }
        .th-review-q.incorrect {
            border-left: 5px solid var(--th-danger);
        }
        .th-review-q-title {
            font-weight: bold;
            margin-bottom: 0.5rem;
        }
        .th-review-choice {
            display: flex;
            align-items: center;
            margin-bottom: 0.2rem;
            font-size: 1.02rem;
            padding: 0.2rem 0.5rem;
            border-radius: 6px;
        }
        .th-review-choice.correct {
            color: var(--th-primary);
            font-weight: bold;
            background: rgba(0,255,65,0.08);
        }
        .th-review-choice.incorrect {
            color: var(--th-danger);
            background: rgba(255,71,87,0.08);
        }
        .th-review-choice.user {
            border: 1.5px solid var(--th-accent);
            background: rgba(255,107,53,0.07);
        }
        .th-review-icon {
            margin-right: 0.6em;
            font-size: 1.1em;
        }
        `;
        document.head.appendChild(style);
    }

    const container = document.getElementById('exam-container');
    fetch('basic_linux_for_hacking_exam.json')
        .then(response => response.json())
        .then(questions => startExam(questions));

    function startExam(questions) {
        let current = 0;
        let score = 0;
        let userAnswers = [];
        const passingScore = 40;
        const totalQuestions = questions.length;
        showQuestion();

        function getSections() {
           
            const sections = {};
            let currentSection = 'General';
            questions.forEach((q, idx) => {
                if (q.section) currentSection = q.section;
                if (!sections[currentSection]) sections[currentSection] = [];
                sections[currentSection].push({ ...q, idx });
            });
            return sections;
        }

        function showQuestion() {
            if (current >= questions.length) {
                showResult();
                return;
            }
            const q = questions[current];
            container.innerHTML = `
                <div class="th-container th-card th-fade-in" style="max-width:600px;margin:2rem auto;padding:2rem 2.5rem 1.5rem 2.5rem;">
                    <div style="margin-bottom:1.5rem;">
                        <div class="th-progress" style="height:10px;margin-bottom:1rem;">
                            <div class="th-progress-bar" style="width:${((current+1)/questions.length)*100}%;height:100%;transition:width 0.4s;"></div>
                        </div>
                        <span class="th-text-primary" style="font-weight:bold;">Question ${current + 1} of ${questions.length}</span>
                    </div>
                    <h2 style="margin-bottom:1.2rem;">${q.question}</h2>
                    <form id="question-form">
                        ${q.options.map((opt, i) => `
                            <label class="th-choice-label" data-index="${i}">
                                <input type="radio" class="th-choice-radio" name="option" value="${i}" style="vertical-align:middle;"> ${opt}
                            </label>
                        `).join('')}
                        <button type="submit" class="th-btn-primary" style="margin-top:1.2rem;width:100%;font-size:1.1rem;">${current === questions.length-1 ? 'Finish' : 'Next'}</button>
                    </form>
                </div>
            `;
            
            const labels = Array.from(container.querySelectorAll('.th-choice-label'));
            labels.forEach(label => {
                label.addEventListener('click', function(e) {
                    labels.forEach(l => l.classList.remove('selected'));
                    this.classList.add('selected');
                });
            });
            document.getElementById('question-form').onsubmit = function (e) {
                e.preventDefault();
                const selected = container.querySelector('input[name="option"]:checked');
                if (!selected) {
                    showAlert('Please select an answer.', 'danger');
                    return;
                }
                userAnswers.push(parseInt(selected.value));
                if (parseInt(selected.value) === q.answer) score++;
                current++;
                showQuestion();
            };
        }

        function showSectionSummary() {
            const sections = getSections();
            let html = '<div class="th-section-summary">';
            html += '<div class="th-section-title">Performance by Section</div>';
            Object.entries(sections).forEach(([section, qs]) => {
                const correct = qs.filter(q => userAnswers[q.idx] === q.answer).length;
                const total = qs.length;
                const percent = Math.round((correct / total) * 100);
                let feedback = '';
                if (percent >= 80) {
                    feedback = `<span class='th-section-feedback good'>Excellent!</span>`;
                } else if (percent >= 60) {
                    feedback = `<span class='th-section-feedback'>Good, but can improve.</span>`;
                } else {
                    feedback = `<span class='th-section-feedback bad'>Needs review!</span>`;
                }
                html += `<div style="margin-bottom:1.1rem;">
                    <div style="display:flex;align-items:center;justify-content:space-between;">
                        <span style="font-weight:bold;">${section}</span>
                        <span><b>${correct} / ${total}</b> (${percent}%)</span>
                    </div>
                    <div class="th-section-bar"><div class="th-section-bar-inner" style="width:${percent}%;"></div></div>
                    <div>${feedback}</div>
                </div>`;
            });
            html += '</div>';
            return html;
        }

        function showResult() {
            const passed = score >= passingScore;
            container.innerHTML = `
                <div class="th-container th-card th-fade-in" style="max-width:600px;margin:2rem auto;padding:2rem 2.5rem 1.5rem 2.5rem;text-align:center;">
                    <h2 class="th-text-primary" style="margin-bottom:1.5rem;">Exam Complete!</h2>
                    <div class="th-alert ${passed ? 'th-alert-success' : 'th-alert-danger'}" style="font-size:1.3rem;margin-bottom:1.5rem;">
                        Your score: <b>${score} / ${totalQuestions}</b><br>
                        ${passed ? '<span style=\"color:var(--th-primary);font-weight:bold;\">Congratulations! You passed the exam.</span>' : '<span style=\"color:var(--th-danger);font-weight:bold;\">You did not pass. Please review and try again.</span>'}
                        <div style="margin-top:0.7rem;font-size:1rem;">Passing score: <b>40 / 50</b></div>
                    </div>
                    ${showSectionSummary()}
                    <button id="retry-btn" class="th-btn-primary" style="width:60%;font-size:1.1rem;">Retry</button>
                    <button id="review-btn" class="th-btn-outline-primary" style="width:60%;margin-top:1rem;font-size:1.1rem;">Review Answers</button>
                    ${passed ? `<button id=\"dashboard-btn\" class=\"th-btn-primary\" style=\"width:60%;margin-top:1rem;font-size:1.1rem;background:var(--th-gradient);\">Go to Dashboard</button>
                    <button id=\"index-btn\" class=\"th-btn-outline-primary\" style=\"width:60%;margin-top:1rem;font-size:1.1rem;\">Go to Home</button>` : ''}
                </div>
            `;
            document.getElementById('retry-btn').onclick = () => {
                current = 0;
                score = 0;
                userAnswers = [];
                showQuestion();
            };
            document.getElementById('review-btn').onclick = () => {
                showReview();
            };
            if (passed) {
                document.getElementById('dashboard-btn').onclick = () => {
                    window.location.href = '../login/dashboard.html';
                };
                document.getElementById('index-btn').onclick = () => {
                    window.location.href = '../index.html';
                };
            }
        }

        function showReview() {

            const sections = getSections();
            let html = `<div class="th-container th-card th-fade-in" style="max-width:800px;margin:2rem auto;padding:2rem 2.5rem 1.5rem 2.5rem;">
                <h2 class="th-text-primary" style="margin-bottom:1.5rem;">Review Answers</h2>
                <div style="max-height:60vh;overflow-y:auto;">`;
            Object.entries(sections).forEach(([section, qs], sidx) => {
                html += `<div class="th-review-section">
                    <div class="th-section-title" style="margin-bottom:0.7rem;font-size:1.08rem;">${section}</div>`;
                qs.forEach((q, idx) => {
                    const userAns = userAnswers[q.idx];
                    const isCorrect = userAns === q.answer;
                    html += `<div class="th-review-q ${isCorrect ? 'correct' : 'incorrect'}">
                        <div class="th-review-q-title">Q${q.idx+1}: ${q.question}</div>
                        <div>`;
                    q.options.forEach((opt, i) => {
                        let classes = 'th-review-choice';
                        let icon = '';
                        if (i === q.answer) {
                            classes += ' correct';
                            icon = '✔️';
                        }
                        if (userAns === i && userAns !== q.answer) {
                            classes += ' incorrect user';
                            icon = '❌';
                        }
                        if (userAns === i && userAns === q.answer) {
                            classes += ' user';
                        }
                        html += `<div class="${classes}"><span class="th-review-icon">${icon}</span> ${opt}</div>`;
                    });
                    html += `</div></div>`;
                });
                html += `</div>`;
            });
            html += `</div><button id="back-btn" class="th-btn-outline-primary" style="width:60%;margin-top:1.5rem;font-size:1.1rem;">Back to Result</button></div>`;
            container.innerHTML = html;
            document.getElementById('back-btn').onclick = () => showResult();
        }

        function showAlert(msg, type) {
            let alert = document.createElement('div');
            alert.className = `th-alert th-alert-${type}`;
            alert.style.position = 'fixed';
            alert.style.top = '30px';
            alert.style.left = '50%';
            alert.style.transform = 'translateX(-50%)';
            alert.style.zIndex = '9999';
            alert.style.minWidth = '220px';
            alert.style.textAlign = 'center';
            alert.style.fontSize = '1.1rem';
            alert.innerText = msg;
            document.body.appendChild(alert);
            setTimeout(() => {
                alert.style.transition = 'opacity 0.5s';
                alert.style.opacity = 0;
                setTimeout(() => alert.remove(), 500);
            }, 1800);
        }
    }
}); 