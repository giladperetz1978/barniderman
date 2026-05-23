document.addEventListener('DOMContentLoaded', () => {
    // --- State & Constants ---
    const launchSplash = document.getElementById('launchSplash');
    const minSplashDurationMs = 3000;
    const trainerAuthStorageKey = 'barTrainerAuthenticated';
    const trainerCredentials = {
        username: 'bar',
        password: 'mazda3'
    };
    let soundEnabled = true;
    let currentRole = 'trainee'; // 'trainee' or 'trainer'
    let selectedTraineeId = '';
    let currentSelectedCheat = '';

    // Custom sound synthesizer using Web Audio API (No files needed!)
    const soundEngine = {
        ctx: null,
        init() {
            if (!this.ctx) {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        },
        play(type) {
            if (!soundEnabled) return;
            try {
                this.init();
                const now = this.ctx.currentTime;
                
                switch (type) {
                    case 'whip': // Whip crack sound effect
                        const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.1, this.ctx.sampleRate);
                        const output = noiseBuffer.getChannelData(0);
                        for (let i = 0; i < noiseBuffer.length; i++) {
                            output[i] = Math.random() * 2 - 1;
                        }
                        const whiteNoise = this.ctx.createBufferSource();
                        whiteNoise.buffer = noiseBuffer;

                        const filter = this.ctx.createBiquadFilter();
                        filter.type = 'bandpass';
                        filter.frequency.value = 1200;
                        filter.Q.value = 3;

                        const gain = this.ctx.createGain();
                        gain.gain.setValueAtTime(0.3, now);
                        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

                        whiteNoise.connect(filter);
                        filter.connect(gain);
                        gain.connect(this.ctx.destination);

                        // Also add a low crack pop
                        const osc = this.ctx.createOscillator();
                        const oscGain = this.ctx.createGain();
                        osc.type = 'triangle';
                        osc.frequency.setValueAtTime(150, now);
                        osc.frequency.exponentialRampToValueAtTime(40, now + 0.05);
                        oscGain.gain.setValueAtTime(0.4, now);
                        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

                        osc.connect(oscGain);
                        oscGain.connect(this.ctx.destination);

                        whiteNoise.start(now);
                        osc.start(now);
                        break;

                    case 'celebrate': // Arcade win chord
                        const chord = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
                        chord.forEach((freq, index) => {
                            const osc = this.ctx.createOscillator();
                            const gain = this.ctx.createGain();
                            osc.type = 'sine';
                            osc.frequency.setValueAtTime(freq, now + index * 0.08);
                            gain.gain.setValueAtTime(0, now);
                            gain.gain.linearRampToValueAtTime(0.12, now + index * 0.08 + 0.02);
                            gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.08 + 0.4);
                            
                            osc.connect(gain);
                            gain.connect(this.ctx.destination);
                            osc.start(now + index * 0.08);
                            osc.stop(now + index * 0.08 + 0.5);
                        });
                        break;

                    case 'fail': // Wah-wah buzzer
                        const oscFail = this.ctx.createOscillator();
                        const gainFail = this.ctx.createGain();
                        oscFail.type = 'sawtooth';
                        oscFail.frequency.setValueAtTime(180, now);
                        oscFail.frequency.linearRampToValueAtTime(110, now + 0.45);
                        
                        gainFail.gain.setValueAtTime(0.18, now);
                        gainFail.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
                        
                        oscFail.connect(gainFail);
                        gainFail.connect(this.ctx.destination);
                        oscFail.start(now);
                        oscFail.stop(now + 0.5);
                        break;

                    case 'water': // Bubbles rising sound
                        for (let i = 0; i < 4; i++) {
                            const oscW = this.ctx.createOscillator();
                            const gainW = this.ctx.createGain();
                            const delay = i * 0.1;
                            
                            oscW.type = 'sine';
                            oscW.frequency.setValueAtTime(800 + i * 200, now + delay);
                            oscW.frequency.exponentialRampToValueAtTime(1600 + i * 200, now + delay + 0.08);
                            
                            gainW.gain.setValueAtTime(0.08, now + delay);
                            gainW.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.08);
                            
                            oscW.connect(gainW);
                            gainW.connect(this.ctx.destination);
                            oscW.start(now + delay);
                            oscW.stop(now + delay + 0.1);
                        }
                        break;

                    case 'airhorn': // High pitch siren blast
                        const hornFreqs = [220, 225, 230];
                        hornFreqs.forEach(freq => {
                            const oscH = this.ctx.createOscillator();
                            const gainH = this.ctx.createGain();
                            oscH.type = 'sawtooth';
                            oscH.frequency.setValueAtTime(freq, now);
                            gainH.gain.setValueAtTime(0.15, now);
                            gainH.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
                            
                            oscH.connect(gainH);
                            gainH.connect(this.ctx.destination);
                            oscH.start(now);
                            oscH.stop(now + 0.65);
                        });
                        break;
                }
            } catch (e) {
                console.warn('Audio synthesis issue:', e);
            }
        }
    };

    // Default Seed Trainees
    const defaultTrainees = [
        {
            id: 't1',
            name: 'דודו הבורקס',
            emoji: '🥐',
            slogan: '"סקוואט אחד = בורקס תפוח אדמה אחד"',
            workouts: 1,
            water: 4, // 1 Liter
            sins: 3,
            cheats: ['בורקס גבינה', 'פיצה שלמה בחושך'],
            workoutsChecked: [false, true, false, false]
        },
        {
            id: 't2',
            name: 'מיכל הספינינג',
            emoji: '🚴‍♀️',
            slogan: '"חיה על שייקים של אבקת חלבון ודמעות של קורבנות"',
            workouts: 4,
            water: 10, // 2.5 Liters
            sins: 0,
            cheats: [],
            workoutsChecked: [true, true, true, true]
        },
        {
            id: 't3',
            name: 'רונן הבטטה',
            emoji: '🥔',
            slogan: '"אני בחיטוב פנימי אז אסור לי להתאמץ חיצונית"',
            workouts: 0,
            water: 1, // 0.25 Liter
            sins: 5,
            cheats: ['המבורגר כפול', 'וופל בלגי מוגזם', 'פיצה עם מיונז'],
            workoutsChecked: [false, false, false, false]
        }
    ];

    // Funny Workout torture templates
    const workoutTemplates = [
        { id: 'w1', text: 'ריצת קלה כדי לברוח מהמאמנת בר', diff: 'easy', diffLabel: 'קל' },
        { id: 'w2', text: '50 סקוואטים ישר לתוך הירכיים של מחר', diff: 'medium', diffLabel: 'בינוני' },
        { id: 'w3', text: 'פלאנק של דקה וחצי תוך זעקות שבר קולניות', diff: 'hard', diffLabel: 'קשה' },
        { id: 'w4', text: 'כפיפות בטן כדי לעשות מקום לשווארמה בערב', diff: 'medium', diffLabel: 'בינוני' }
    ];
    const workoutDifficultyLabels = {
        easy: 'קל',
        medium: 'בינוני',
        hard: 'קשה'
    };

    // Excuses Database
    const excusesTemplates = [
        "הנעלי ספורט שלי פיתחו תודעה עצמית והן מסרבות לעלות למזרון.",
        "היה פקק תנועה עצום במסדרון שמוביל למשקולות.",
        "החתול שלי התיישב לי על הבטן ואסור לפי חוק צער בעלי חיים להזיז אותו.",
        "השרירים שלי תפוסים מהמחשבה על האימון שתכננת לי.",
        "אני עושה חיטוב רוחני עמוק כרגע, הזעת יתר עלולה לשבש את הצ'אקרות.",
        "שתיתי מים עם קרח והגרון שלי קפוא מכדי לבצע סקוואטים.",
        "שברתי את הציפורן של הבוהן כשפתחתי את הדלת של המקרר.",
        "הבגדי ספורט שלי בכביסה ואין לי חשק להתאמן בעירום מלא."
    ];

    const excuseBusterQuotes = [
        "תירוץ של חלשים! 50 סקוואטים מייד ודבר איתי אחרי זה!",
        "עצלן! עוד 20 שכיבות סמיכה מייד על חוצפה!",
        "אין תירוצים! רוץ 3 קילומטר כשאני איתך בטלפון ובוכה איתך!",
        "אני מתחילה לבכות פה בפינה מהרמות עצלנות שלך. זוז!",
        "מהר להרים את הישבן מהספה לפני שאני באה אליך הביתה עם השוט!",
        "אם היית שורף קלוריות כמו שאתה מייצר תירוצים, היית כבר אלוף עולם. קדימה!"
    ];

    // Initialize Trainees in LocalStorage
    if (!localStorage.getItem('trainees')) {
        localStorage.setItem('trainees', JSON.stringify(defaultTrainees));
    }
    if (!localStorage.getItem('customWorkoutTemplates')) {
        localStorage.setItem('customWorkoutTemplates', JSON.stringify([]));
    }

    // --- DOM Elements ---
    const roleTraineeBtn = document.getElementById('roleTraineeBtn');
    const roleTrainerBtn = document.getElementById('roleTrainerBtn');
    const traineeView = document.getElementById('traineeView');
    const trainerView = document.getElementById('trainerView');
    const trainerLoginModal = document.getElementById('trainerLoginModal');
    const trainerLoginBackdrop = document.getElementById('trainerLoginBackdrop');
    const trainerLoginForm = document.getElementById('trainerLoginForm');
    const trainerUsername = document.getElementById('trainerUsername');
    const trainerPassword = document.getElementById('trainerPassword');
    const trainerLoginError = document.getElementById('trainerLoginError');
    const trainerLoginCancelBtn = document.getElementById('trainerLoginCancelBtn');
    
    const traineeSelect = document.getElementById('traineeSelect');
    const traineeSlogan = document.getElementById('traineeSlogan');
    const statWorkouts = document.getElementById('statWorkouts');
    const statWater = document.getElementById('statWater');
    const statSins = document.getElementById('statSins');

    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const workoutList = document.getElementById('workoutList');
    const finishWorkoutBtn = document.getElementById('finishWorkoutBtn');

    // Confession Elements
    const cheatItemBtns = document.querySelectorAll('.cheat-item-btn');
    const customCheatInput = document.getElementById('customCheatInput');
    const cheatGuiltRange = document.getElementById('cheatGuiltRange');
    const confessBtn = document.getElementById('confessBtn');
    const guiltScanner = document.getElementById('guiltScanner');
    const confessionResult = document.getElementById('confessionResult');
    const barReactEmoji = document.getElementById('barReactEmoji');
    const barReactQuote = document.getElementById('barReactQuote');
    const punishmentText = document.getElementById('punishmentText');

    // Water Elements
    const waterMinusBtn = document.getElementById('waterMinusBtn');
    const waterPlusBtn = document.getElementById('waterPlusBtn');
    const waterCount = document.getElementById('waterCount');
    const waterVolume = document.getElementById('waterVolume');
    const bottleWaterLevel = document.getElementById('bottleWaterLevel');
    const bottleTextPercent = document.getElementById('bottleTextPercent');
    const waterSpeech = document.getElementById('waterSpeech');

    // Excuse Elements
    const generatedExcuseText = document.getElementById('generatedExcuseText');
    const generateExcuseBtn = document.getElementById('generateExcuseBtn');
    const sendExcuseBtn = document.getElementById('sendExcuseBtn');
    const excuseResponseCard = document.getElementById('excuseResponseCard');
    const excuseResponseText = document.getElementById('excuseResponseText');

    // Trainer Elements
    const trainerTraineeTabs = document.getElementById('trainerTraineeTabs');
    const trainerTraineePanel = document.getElementById('trainerTraineePanel');
    const newTraineeName = document.getElementById('newTraineeName');
    const newTraineeEmoji = document.getElementById('newTraineeEmoji');
    const newTraineeSlogan = document.getElementById('newTraineeSlogan');
    const addTraineeBtn = document.getElementById('addTraineeBtn');
    const newWorkoutText = document.getElementById('newWorkoutText');
    const newWorkoutDifficulty = document.getElementById('newWorkoutDifficulty');
    const addWorkoutBtn = document.getElementById('addWorkoutBtn');
    
    const challengeSelect = document.getElementById('challengeSelect');
    const broadcastBtn = document.getElementById('broadcastBtn');

    const clubTotalTrainees = document.getElementById('clubTotalTrainees');
    const clubTotalSins = document.getElementById('clubTotalSins');
    const clubTotalWater = document.getElementById('clubTotalWater');

    // Audio & Toast Alert
    const soundToggleBtn = document.getElementById('soundToggleBtn');
    const soundIcon = document.getElementById('soundIcon');
    const toastNotification = document.getElementById('toastNotification');
    const toastTitle = document.getElementById('toastTitle');
    const toastMessage = document.getElementById('toastMessage');
    const closeToastBtn = document.getElementById('closeToastBtn');
    const confettiContainer = document.getElementById('confettiContainer');

    let trainerActiveTraineeId = null;

    // --- Helper Functions ---
    function getTrainees() {
        return JSON.parse(localStorage.getItem('trainees'));
    }

    function saveTrainees(trainees) {
        localStorage.setItem('trainees', JSON.stringify(trainees));
    }

    function getCustomWorkoutTemplates() {
        return JSON.parse(localStorage.getItem('customWorkoutTemplates') || '[]');
    }

    function saveCustomWorkoutTemplates(templates) {
        localStorage.setItem('customWorkoutTemplates', JSON.stringify(templates));
    }

    function getAllWorkoutTemplates() {
        return [...workoutTemplates, ...getCustomWorkoutTemplates()];
    }

    function normalizeTraineeWorkouts(trainee, expectedLength = getAllWorkoutTemplates().length) {
        const normalized = Array.isArray(trainee.workoutsChecked) ? [...trainee.workoutsChecked] : [];

        while (normalized.length < expectedLength) {
            normalized.push(false);
        }

        if (normalized.length > expectedLength) {
            normalized.length = expectedLength;
        }

        trainee.workoutsChecked = normalized;
        return trainee;
    }

    function syncWorkoutChecklistLengths() {
        const trainees = getTrainees();
        const expectedLength = getAllWorkoutTemplates().length;
        let hasChanges = false;

        trainees.forEach(trainee => {
            const previousLength = Array.isArray(trainee.workoutsChecked) ? trainee.workoutsChecked.length : 0;
            normalizeTraineeWorkouts(trainee, expectedLength);
            if (trainee.workoutsChecked.length !== previousLength || previousLength !== expectedLength) {
                hasChanges = true;
            }
        });

        if (hasChanges) {
            saveTrainees(trainees);
        }
    }

    function getCurrentTrainee() {
        const trainees = getTrainees();
        const trainee = trainees.find(t => t.id === selectedTraineeId) || trainees[0];
        return trainee ? normalizeTraineeWorkouts(trainee) : trainee;
    }

    function isTrainerAuthenticated() {
        return sessionStorage.getItem(trainerAuthStorageKey) === 'true';
    }

    function setTrainerAuthenticated(isAuthenticated) {
        sessionStorage.setItem(trainerAuthStorageKey, isAuthenticated ? 'true' : 'false');
    }

    function resetTrainerLoginForm() {
        trainerLoginForm.reset();
        trainerLoginError.classList.add('hidden');
    }

    function openTrainerLogin() {
        resetTrainerLoginForm();
        trainerLoginModal.classList.remove('hidden');
        trainerLoginModal.setAttribute('aria-hidden', 'false');
        setTimeout(() => {
            trainerUsername.focus();
        }, 0);
    }

    function closeTrainerLogin() {
        trainerLoginModal.classList.add('hidden');
        trainerLoginModal.setAttribute('aria-hidden', 'true');
    }

    // Update single trainee record
    function updateTraineeRecord(updatedTrainee) {
        const trainees = getTrainees();
        const index = trainees.findIndex(t => t.id === updatedTrainee.id);
        if (index !== -1) {
            trainees[index] = normalizeTraineeWorkouts(updatedTrainee);
            saveTrainees(trainees);
            updateStatsUI();
            if (currentRole === 'trainer') {
                renderTrainerDashboard();
            }
        }
    }

    // Toast alert trigger
    function showToast(title, message, isWhip = false) {
        toastTitle.textContent = title;
        toastMessage.textContent = message;
        toastNotification.classList.remove('hidden');
        
        if (isWhip) {
            toastNotification.classList.add('whip-vibrate');
            soundEngine.play('whip');
            setTimeout(() => {
                toastNotification.classList.remove('whip-vibrate');
            }, 1200);
        } else {
            soundEngine.play('airhorn');
        }
    }

    // Confetti Celebration
    function triggerConfetti() {
        confettiContainer.innerHTML = '';
        soundEngine.play('celebrate');
        
        for (let i = 0; i < 80; i++) {
            const piece = document.createElement('div');
            piece.className = 'confetti-piece';
            
            // Random styling
            piece.style.left = Math.random() * 100 + 'vw';
            piece.style.backgroundColor = ['#ccff00', '#ff0055', '#00f0ff', '#ffffff'][Math.floor(Math.random() * 4)];
            piece.style.width = Math.random() * 8 + 6 + 'px';
            piece.style.height = Math.random() * 8 + 6 + 'px';
            piece.style.animationDuration = Math.random() * 2 + 1.5 + 's';
            piece.style.animationDelay = Math.random() * 0.5 + 's';
            
            confettiContainer.appendChild(piece);
        }

        setTimeout(() => {
            confettiContainer.innerHTML = '';
        }, 4000);
    }

    // --- Tab Navigation Setup ---
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            const tabId = btn.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });

    // --- Sound Toggle ---
    soundToggleBtn.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        soundIcon.textContent = soundEnabled ? '🔊' : '🔇';
        soundToggleBtn.style.borderColor = soundEnabled ? 'var(--volt)' : 'rgba(255, 255, 255, 0.1)';
        soundToggleBtn.style.color = soundEnabled ? 'var(--volt)' : 'var(--text-muted)';
        
        if (soundEnabled) {
            soundEngine.init();
            soundEngine.play('water');
        }
    });

    // --- Role Switching Logic ---
    roleTraineeBtn.addEventListener('click', () => switchRole('trainee'));
    roleTrainerBtn.addEventListener('click', () => {
        if (isTrainerAuthenticated()) {
            switchRole('trainer');
            return;
        }

        openTrainerLogin();
    });

    trainerLoginCancelBtn.addEventListener('click', () => {
        closeTrainerLogin();
        switchRole('trainee');
    });

    trainerLoginBackdrop.addEventListener('click', () => {
        closeTrainerLogin();
        switchRole('trainee');
    });

    trainerLoginForm.addEventListener('submit', (event) => {
        event.preventDefault();

        const username = trainerUsername.value.trim();
        const password = trainerPassword.value;
        const isValid = username === trainerCredentials.username && password === trainerCredentials.password;

        if (!isValid) {
            trainerLoginError.classList.remove('hidden');
            trainerPassword.value = '';
            trainerPassword.focus();
            soundEngine.play('fail');
            return;
        }

        setTrainerAuthenticated(true);
        closeTrainerLogin();
        switchRole('trainer');
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !trainerLoginModal.classList.contains('hidden')) {
            closeTrainerLogin();
            switchRole('trainee');
        }
    });

    function switchRole(role) {
        currentRole = role;
        roleTraineeBtn.classList.toggle('active', role === 'trainee');
        roleTrainerBtn.classList.toggle('active', role === 'trainer');
        
        traineeView.classList.toggle('hidden', role !== 'trainee');
        trainerView.classList.toggle('hidden', role !== 'trainer');
        
        if (role === 'trainer') {
            renderTrainerDashboard();
            soundEngine.play('celebrate');
        } else {
            initTraineeView();
            soundEngine.play('water');
        }
    }

    // --- Trainee Select Box Initialization ---
    function initTraineeSelect() {
        syncWorkoutChecklistLengths();
        const trainees = getTrainees();
        traineeSelect.innerHTML = '';
        trainees.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.id;
            opt.textContent = `${t.emoji} ${t.name}`;
            traineeSelect.appendChild(opt);
        });

        // Set default selected trainee
        if (!selectedTraineeId || !trainees.some(t => t.id === selectedTraineeId)) {
            selectedTraineeId = trainees[0].id;
        }
        traineeSelect.value = selectedTraineeId;
    }

    traineeSelect.addEventListener('change', (e) => {
        selectedTraineeId = e.target.value;
        initTraineeView();
    });

    // --- Trainee View Initialize ---
    function initTraineeView() {
        initTraineeSelect();
        updateStatsUI();
        renderWorkoutList();
        resetConfessionUI();
        updateWaterUI();
        generateExcuse();
    }

    function updateStatsUI() {
        const trainee = getCurrentTrainee();
        traineeSlogan.textContent = trainee.slogan;
        statWorkouts.textContent = trainee.workouts;
        statWater.textContent = (trainee.water * 0.25).toFixed(2) + 'L';
        statSins.textContent = trainee.sins;
    }

    // --- 1. Workout Section ---
    function renderWorkoutList() {
        const trainee = getCurrentTrainee();
        const allWorkoutTemplates = getAllWorkoutTemplates();
        workoutList.innerHTML = '';
        
        allWorkoutTemplates.forEach((w, index) => {
            const isCompleted = trainee.workoutsChecked[index] || false;
            
            const li = document.createElement('li');
            li.className = `workout-item ${isCompleted ? 'completed' : ''}`;
            li.innerHTML = `
                <div class="workout-left">
                    <span class="custom-checkbox"></span>
                    <span class="workout-text">${w.text}</span>
                </div>
                <span class="workout-difficulty diff-${w.diff}">${w.diffLabel}</span>
            `;
            
            li.addEventListener('click', () => {
                toggleWorkoutItem(index);
            });
            
            workoutList.appendChild(li);
        });
    }

    function toggleWorkoutItem(index) {
        const trainee = getCurrentTrainee();
        const currentlyChecked = trainee.workoutsChecked[index] || false;
        
        // Toggle item status
        trainee.workoutsChecked[index] = !currentlyChecked;
        
        if (!currentlyChecked) {
            soundEngine.play('water'); // Light success bubble sound
        }
        
        updateTraineeRecord(trainee);
        renderWorkoutList();
    }

    finishWorkoutBtn.addEventListener('click', () => {
        const trainee = getCurrentTrainee();
        const allDone = trainee.workoutsChecked.length > 0 && trainee.workoutsChecked.every(val => val === true);
        
        if (allDone) {
            trainee.workouts += 1;
            // Reset daily checklist
            trainee.workoutsChecked = trainee.workoutsChecked.map(() => false);
            updateTraineeRecord(trainee);
            triggerConfetti();
            showToast('כל הכבוד אלוף/ה! 🏆', `בר מאשרת את סיום האימון! שבוע הבא משקלים כפולים.`);
            setTimeout(() => {
                renderWorkoutList();
            }, 1000);
        } else {
            soundEngine.play('fail');
            showToast('מה נראה לך?! 🤬', 'לא סיימת את כל תוכנית העינויים! תחזור לעשות פלאנק.', false);
        }
    });

    // --- 2. Cheat Confession Section ---
    cheatItemBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            cheatItemBtns.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            
            const type = btn.getAttribute('data-cheat');
            currentSelectedCheat = type;
            
            if (type === 'אחר') {
                customCheatInput.classList.remove('hidden');
                customCheatInput.focus();
            } else {
                customCheatInput.classList.add('hidden');
                customCheatInput.value = '';
            }
        });
    });

    function resetConfessionUI() {
        cheatItemBtns.forEach(b => b.classList.remove('selected'));
        customCheatInput.classList.add('hidden');
        customCheatInput.value = '';
        currentSelectedCheat = '';
        guiltScanner.classList.add('hidden');
        confessionResult.classList.add('hidden');
    }

    confessBtn.addEventListener('click', () => {
        let finalCheatName = currentSelectedCheat;
        if (currentSelectedCheat === 'אחר') {
            finalCheatName = customCheatInput.value.trim();
        }

        if (!finalCheatName) {
            alert('קודם כל תבחר מה אכלת, יא חתיכת גרגרן!');
            return;
        }

        // Trigger Scanner Loader
        confessionResult.classList.add('hidden');
        guiltScanner.classList.remove('hidden');
        soundEngine.play('whip');
        
        setTimeout(() => {
            guiltScanner.classList.add('hidden');
            processConfession(finalCheatName);
        }, 1800);
    });

    function processConfession(cheatName) {
        const trainee = getCurrentTrainee();
        const severity = parseInt(cheatGuiltRange.value);
        
        // Log to trainee data
        trainee.sins += 1;
        trainee.cheats.push(cheatName);
        updateTraineeRecord(trainee);

        // Generate customized reaction & punishment based on severity level
        let emoji = '😤';
        let quote = '';
        let punishment = '';

        if (severity <= 1) { // Tiny bite
            emoji = '😐';
            quote = `"רק ביס? נו מילא. בטח הביס הזה היה גדול כמו הפרצוף שלי."`;
            punishment = `10 סקוואטים מייד, ולבטא באנגלית 'סליחה בר' 20 פעם.`;
            soundEngine.play('fail');
        } else if (severity <= 3) { // Normal cheat
            emoji = '🤬';
            quote = `"${cheatName}?! באמצע החיטוב? מי נתן לך אישור בכלל? שירה מהספינינג לא הייתה מעזה!"`;
            punishment = `40 ג'אמפינג ג'קס, 2 סבבים של פלאנק דקה וחצי, ולהסתכל במראה ולהגיד 'אני חלש'.`;
            soundEngine.play('whip');
        } else { // Huge binge
            emoji = '🌋';
            quote = `"חיסלת את כל ה${cheatName}?! דודו הבורקס גאה בך, אבל אני ממש לא! תתכונן למוות בקליניקה מחר."`;
            punishment = `150 ברפיז, ריצה של 5 ק"מ בחוץ בשיא החום, ותוך כדי תתקשר אלי לבקש מחילה.`;
            soundEngine.play('airhorn');
        }

        barReactEmoji.textContent = emoji;
        barReactQuote.textContent = quote;
        punishmentText.textContent = punishment;
        confessionResult.classList.remove('hidden');
    }

    // --- 3. Water Tracker Section ---
    function updateWaterUI() {
        const trainee = getCurrentTrainee();
        const maxCups = 12; // 3 Liters (each cup is 0.25L)
        const currentCups = trainee.water || 0;

        waterCount.textContent = currentCups;
        waterVolume.textContent = (currentCups * 0.25).toFixed(2);

        // Update visual cup water level
        const percent = Math.min((currentCups / maxCups) * 100, 100);
        bottleWaterLevel.style.height = percent + '%';
        bottleTextPercent.textContent = Math.round(percent) + '%';

        // Update dynamic speech bubble from Bar
        let msg = '';
        if (currentCups === 0) {
            msg = `"כרגע אתה נראה כמו שזיף מיובש בארגז של ט"ו בשבט. תשתה מים!"`;
        } else if (currentCups <= 4) {
            msg = `"ליטר אחד? זה הכל? השרירים שלך יתייבשו ואז איך תרים משקולות? שייקר חלבון ריק!"`;
        } else if (currentCups <= 8) {
            msg = `"חצי דרך להפוך לבנאדם נורמלי. סביר, אבל אל תתעצל. עוד שלוק."`;
        } else if (currentCups < 12) {
            msg = `"יפה מאוד, כבר לא רואים קמטי יובש על המצח. כמעט שם!"`;
        } else {
            msg = `"וואו! הגעת למדד ההידרציה המושלם! הפכת למלפפון עסיסי במיוחד! בר גאה בך!"`;
        }
        waterSpeech.textContent = msg;
    }

    waterMinusBtn.addEventListener('click', () => {
        const trainee = getCurrentTrainee();
        if (trainee.water > 0) {
            trainee.water -= 1;
            updateTraineeRecord(trainee);
            updateWaterUI();
            soundEngine.play('fail');
        }
    });

    waterPlusBtn.addEventListener('click', () => {
        const trainee = getCurrentTrainee();
        if (trainee.water < 20) { // Max cap
            trainee.water += 1;
            updateTraineeRecord(trainee);
            updateWaterUI();
            soundEngine.play('water');
        }
    });

    // --- 4. Excuse Generator Section ---
    function generateExcuse() {
        const rand = excusesTemplates[Math.floor(Math.random() * excusesTemplates.length)];
        generatedExcuseText.textContent = rand;
        excuseResponseCard.classList.add('hidden');
    }

    generateExcuseBtn.addEventListener('click', () => {
        generateExcuse();
        soundEngine.play('water');
    });

    sendExcuseBtn.addEventListener('click', () => {
        const response = excuseBusterQuotes[Math.floor(Math.random() * excuseBusterQuotes.length)];
        excuseResponseText.textContent = response;
        excuseResponseCard.classList.remove('hidden');
        soundEngine.play('whip');
    });

    // --- 5. Trainer Dashboard View ---
    function getTrainerStatusBadge(trainee) {
        if (trainee.workouts >= 3 && trainee.water >= 8) {
            return '<span class="status-badge status-hero">חיית כושר 🦖</span>';
        }
        if (trainee.water >= 6) {
            return '<span class="status-badge status-hydrated">הידרציה סבירה 💧</span>';
        }
        return '<span class="status-badge status-lazy">עצלן בטטה 🥔</span>';
    }

    function renderTrainerDashboard() {
        syncWorkoutChecklistLengths();
        const trainees = getTrainees();
        trainerTraineeTabs.innerHTML = '';
        trainerTraineePanel.innerHTML = '';

        if (!trainerActiveTraineeId || !trainees.some(t => t.id === trainerActiveTraineeId)) {
            trainerActiveTraineeId = trainees[0]?.id || null;
        }

        let totalSins = 0;
        let totalWater = 0;

        trainees.forEach(t => {
            totalSins += t.sins;
            totalWater += (t.water * 0.25);

            const tabBtn = document.createElement('button');
            tabBtn.className = `trainer-trainee-tab ${t.id === trainerActiveTraineeId ? 'active' : ''}`;
            tabBtn.type = 'button';
            tabBtn.innerHTML = `<span>${t.emoji}</span><span>${t.name}</span>`;
            tabBtn.addEventListener('click', () => {
                trainerActiveTraineeId = t.id;
                renderTrainerDashboard();
            });
            trainerTraineeTabs.appendChild(tabBtn);
        });

        const activeTrainee = trainees.find(t => t.id === trainerActiveTraineeId);
        if (activeTrainee) {
            const lastCheat = activeTrainee.cheats.slice(-1)[0] || 'נקי מחטאים';
            const allCheats = activeTrainee.cheats.length ? activeTrainee.cheats.join(', ') : 'אין';
            trainerTraineePanel.innerHTML = `
                <div class="trainer-panel-header">
                    <div class="trainee-name-cell">
                        <span class="trainee-emoji">${activeTrainee.emoji}</span>
                        <strong>${activeTrainee.name}</strong>
                    </div>
                    ${getTrainerStatusBadge(activeTrainee)}
                </div>
                <div class="trainer-stats-grid">
                    <div class="trainer-stat-col">
                        <span class="trainer-stat-label">אימונים השבוע</span>
                        <span class="trainer-stat-value">${activeTrainee.workouts}</span>
                    </div>
                    <div class="trainer-stat-col">
                        <span class="trainer-stat-label">מים (ליטר)</span>
                        <span class="trainer-stat-value">${(activeTrainee.water * 0.25).toFixed(2)}L</span>
                    </div>
                    <div class="trainer-stat-col">
                        <span class="trainer-stat-label">חטאים</span>
                        <span class="trainer-stat-value">${activeTrainee.sins}</span>
                    </div>
                </div>
                <div class="trainer-cheat-row" title="${allCheats}">
                    <span class="trainer-stat-label">חטא אחרון</span>
                    <span class="trainer-cheat-value">${lastCheat}</span>
                </div>
                <div class="action-buttons-cell trainer-actions-row">
                    <button class="action-icon-btn whip-btn" title="שלח התרעת שוט" onclick="window.triggerWhipAlert('${activeTrainee.id}')">💥</button>
                    <button class="action-icon-btn delete-btn" title="מחק מתאמן" onclick="window.deleteTrainee('${activeTrainee.id}')">🗑️</button>
                </div>
            `;
        }

        // Update stats summary
        clubTotalTrainees.textContent = trainees.length;
        clubTotalSins.textContent = totalSins;
        clubTotalWater.textContent = totalWater.toFixed(1) + 'L';

        renderChallengeOptions();
    }

    function renderChallengeOptions() {
        const templates = getAllWorkoutTemplates();
        const previousValue = challengeSelect.value;

        challengeSelect.innerHTML = '<option value="">בחרי אתגר לשידור</option>';

        templates.forEach(template => {
            const option = document.createElement('option');
            option.value = template.id;
            option.textContent = `${template.text} (${template.diffLabel})`;
            challengeSelect.appendChild(option);
        });

        const waterOption = document.createElement('option');
        waterOption.value = 'water';
        waterOption.textContent = 'שלוק חירום: ליטר מים עכשיו, המוח שלכם מתייבש!';
        challengeSelect.appendChild(waterOption);

        if ([...challengeSelect.options].some(option => option.value === previousValue)) {
            challengeSelect.value = previousValue;
        }
    }

    // Global handles for trainer actions (so onclick attributes in templates function)
    window.triggerWhipAlert = (traineeId) => {
        const trainees = getTrainees();
        const trainee = trainees.find(t => t.id === traineeId);
        if (trainee) {
            // In demo mode, trigger a vibration and whip notification immediately on the screen
            showToast(`התרעת שוט מבר! 🚨`, `נוזפת ב-${trainee.name}: תפסיק לאכול ${trainee.cheats.slice(-1)[0] || 'שטויות'} ותעשה 30 סקוואטים מייד!`, true);
        }
    };

    window.deleteTrainee = (traineeId) => {
        const trainees = getTrainees();
        if (trainees.length <= 1) {
            alert('אי אפשר למחוק את כל המתאמנים! מישהו חייב לסבול.');
            return;
        }
        if (confirm('בטוח שאתה רוצה למחוק את המתאמן הזה מלוח העינויים?')) {
            const filtered = trainees.filter(t => t.id !== traineeId);
            saveTrainees(filtered);
            renderTrainerDashboard();
            soundEngine.play('fail');
        }
    };

    // Add trainee submit
    addTraineeBtn.addEventListener('click', () => {
        const name = newTraineeName.value.trim();
        const emoji = newTraineeEmoji.value.trim() || '🏃‍♂️';
        const slogan = newTraineeSlogan.value.trim() || '"אני פה בשביל הכיף"';

        if (!name) {
            alert('נא להזין שם מתאמן!');
            return;
        }

        const trainees = getTrainees();
        const newT = {
            id: 't' + Date.now(),
            name,
            emoji,
            slogan: `"${slogan}"`,
            workouts: 0,
            water: 0,
            sins: 0,
            cheats: [],
            workoutsChecked: Array(getAllWorkoutTemplates().length).fill(false)
        };

        trainees.push(newT);
        saveTrainees(trainees);
        
        // Reset fields
        newTraineeName.value = '';
        newTraineeEmoji.value = '';
        newTraineeSlogan.value = '';

        renderTrainerDashboard();
        soundEngine.play('celebrate');
        showToast('נוסף קורבן חדש! ⛓️', `המתאמן ${name} התווסף בהצלחה למאגר של בר.`);
    });

    addWorkoutBtn.addEventListener('click', () => {
        const text = newWorkoutText.value.trim();
        const diff = newWorkoutDifficulty.value;

        if (!text) {
            alert('נא להזין תרגיל חדש לפני ההוספה.');
            return;
        }

        const customTemplates = getCustomWorkoutTemplates();
        const alreadyExists = getAllWorkoutTemplates().some(template => template.text === text);

        if (alreadyExists) {
            alert('התרגיל הזה כבר קיים בתוכנית.');
            return;
        }

        customTemplates.push({
            id: 'cw' + Date.now(),
            text,
            diff,
            diffLabel: workoutDifficultyLabels[diff] || workoutDifficultyLabels.medium
        });

        saveCustomWorkoutTemplates(customTemplates);
        syncWorkoutChecklistLengths();
        newWorkoutText.value = '';
        newWorkoutDifficulty.value = 'medium';

        if (currentRole === 'trainer') {
            renderTrainerDashboard();
        } else {
            renderWorkoutList();
        }

        showToast('נוסף תרגיל חדש! 🧨', `התרגיל "${text}" נוסף לרשימת העינויים.`);
        soundEngine.play('celebrate');
    });

    // Broadcast challenge toast
    broadcastBtn.addEventListener('click', () => {
        const challenge = challengeSelect.value;
        let challengeMsg = '';

        if (!challenge) {
            alert('בחרי אתגר לשידור קודם.');
            return;
        }

        if (challenge === 'water') {
            challengeMsg = "שלוק חירום: ליטר מים עכשיו, המוח שלכם מתייבש!";
        } else {
            const template = getAllWorkoutTemplates().find(item => item.id === challenge);
            if (!template) {
                alert('האתגר שנבחר לא נמצא.');
                return;
            }
            challengeMsg = `אתגר פתע: ${template.text}`;
        }

        showToast('💥 אתגר פתע מבר לכולם! 💥', challengeMsg, true);
    });

    // Close Toast Action
    closeToastBtn.addEventListener('click', () => {
        toastNotification.classList.add('hidden');
    });

    // --- Start App ---
    initTraineeView();

    const elapsedSinceNavigation = performance.now();
    const remainingSplashTime = Math.max(0, minSplashDurationMs - elapsedSinceNavigation);

    setTimeout(() => {
        document.body.classList.add('app-ready');
        if (launchSplash) {
            launchSplash.classList.add('is-exiting');
            setTimeout(() => {
                launchSplash.remove();
            }, 450);
        }
    }, remainingSplashTime);
});
