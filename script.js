const firebaseConfig = {
    apiKey: "AIzaSyA3Q9V1cet2ETiHpvQUCH3AebNwr3h1eWM",
    authDomain: "pyexercises-4a067.firebaseapp.com",
    projectId: "pyexercises-4a067",
    storageBucket: "pyexercises-4a067.firebasestorage.app",
    messagingSenderId: "73298763302",
    appId: "1:73298763302:web:7837c34db39bd632c610e7"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let userCode = '';
let fileName = '';
let currentUser = null;

// Auth state observer
auth.onAuthStateChanged(user => {
    currentUser = user;
    if (user) {
        // User is logged in - show logged in section, hide login form
        document.getElementById('login-section').classList.add('hidden');
        document.getElementById('logged-in-section').classList.remove('hidden');
        document.getElementById('user-email').textContent = user.email;
        document.getElementById('save-btn').disabled = false;
        document.getElementById('load-btn').disabled = false;
    } else {
        // User is logged out - show login form, hide logged in section
        document.getElementById('login-section').classList.remove('hidden');
        document.getElementById('logged-in-section').classList.add('hidden');
        document.getElementById('save-btn').disabled = true;
        document.getElementById('load-btn').disabled = true;
        document.getElementById('solutions-list').style.display = 'none';
    }
});

// Sign up
function signup() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
        showStatus('Please enter email and password', 'error');
        return;
    }
    
    auth.createUserWithEmailAndPassword(email, password)
        .then(() => {
            showStatus('Account created successfully!', 'success');
            // Clear password field
            document.getElementById('password').value = '';
        })
        .catch(error => showStatus('Error: ' + error.message, 'error'));
}

// Login
function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
        showStatus('Please enter email and password', 'error');
        return;
    }
    
    auth.signInWithEmailAndPassword(email, password)
        .then(() => {
            showStatus('Logged in successfully!', 'success');
            // Clear password field
            document.getElementById('password').value = '';
        })
        .catch(error => showStatus('Error: ' + error.message, 'error'));
}

// Logout
function logout() {
    auth.signOut()
        .then(() => {
            showStatus('Logged out successfully!', 'success');
            clearSolution();
        })
        .catch(error => showStatus('Error: ' + error.message, 'error'));
}

// Handle file selection
document.getElementById('file-input').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        fileName = file.name;
        const reader = new FileReader();
        
        reader.onload = function(event) {
            userCode = event.target.result;
            displayCode(userCode);
            document.getElementById('file-status').textContent = `File loaded: ${fileName}`;
            document.getElementById('upload-section').classList.add('has-file');
        };
        
        reader.readAsText(file);
    }
});

// Save to Firestore - preserves whitespace and formatting
function saveToFirestore() {
    if (!currentUser) {
        showStatus('Please login first!', 'error');
        return;
    }
    
    if (!userCode) {
        showStatus('Please select a file first!', 'error');
        return;
    }
    
    // Save to Firestore - code is stored as-is with all formatting
    db.collection('users').doc(currentUser.uid).collection('solutions').add({
        fileName: fileName,
        code: userCode,  // Stored exactly as read from file
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        showStatus('Solution saved successfully!', 'success');
    })
    .catch(error => {
        showStatus('Save error: ' + error.message, 'error');
    });
}

// Load solutions from Firestore
function loadSolutions() {
    if (!currentUser) {
        showStatus('Please login first!', 'error');
        return;
    }
    
    db.collection('users').doc(currentUser.uid).collection('solutions')
        .orderBy('timestamp', 'desc')
        .get()
        .then(querySnapshot => {
            if (querySnapshot.empty) {
                showStatus('No solutions found. Save one first!', 'error');
                return;
            }
            
            const container = document.getElementById('solutions-container');
            container.innerHTML = '';
            
            querySnapshot.forEach(doc => {
                const data = doc.data();
                const div = document.createElement('div');
                div.className = 'solution-item';
                
                const date = data.timestamp ? data.timestamp.toDate().toLocaleString() : 'Unknown date';
                div.innerHTML = `<strong>${data.fileName}</strong><br><small>Saved: ${date}</small>`;
                
                // When clicked, load the code exactly as it was saved
                div.onclick = () => {
                    userCode = data.code;
                    fileName = data.fileName;
                    displayCode(data.code);
                    document.getElementById('file-status').textContent = `Loaded from cloud: ${data.fileName}`;
                    showStatus('Solution loaded!', 'success');
                };
                
                container.appendChild(div);
            });
            
            document.getElementById('solutions-list').style.display = 'block';
            showStatus(`Found ${querySnapshot.size} saved solution(s)`, 'success');
        })
        .catch(error => {
            showStatus('Load error: ' + error.message, 'error');
        });
}

// Display code with syntax highlighting - preserves all formatting
function displayCode(code) {
    // Use textContent to preserve exact whitespace and tabs
    document.getElementById('code-display').textContent = code;
    document.getElementById('user-code').style.display = 'block';
    // Prism will syntax highlight while preserving formatting
    Prism.highlightAll();
}

// Clear solution display
function clearSolution() {
    userCode = '';
    fileName = '';
    document.getElementById('file-input').value = '';
    document.getElementById('code-display').textContent = '';
    document.getElementById('user-code').style.display = 'none';
    document.getElementById('file-status').textContent = 'No file selected';
    document.getElementById('upload-section').classList.remove('has-file');
}

// Show status messages
function showStatus(message, type) {
    const statusDiv = document.getElementById('status-message');
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    setTimeout(() => {
        statusDiv.textContent = '';
        statusDiv.className = '';
    }, 5000);
}

/* ---------------------------------------------
 Collapse Box Functionality
--------------------------------------------- */
const collapseBoxTitle   = document.querySelectorAll(".collapse-box-title");
const collapseBoxContent = document.querySelectorAll(".collapse-box-content");
const collapseBoxArrow   = document.querySelectorAll(".down-arrow");

// Add event listeners to all collapse boxes
for (let i = 0; i < collapseBoxTitle.length; i++) {
    collapseBoxTitle[i].addEventListener("click", () => {
        const isOpen = collapseBoxContent[i].style.maxHeight;

        if (isOpen) {
            collapseBoxContent[i].style.maxHeight  = null;
            collapseBoxContent[i].style.paddingBottom = "0";
            collapseBoxTitle[i].classList.remove("open");
            collapseBoxArrow[i].classList.remove("open");
        } else {
            collapseBoxContent[i].style.maxHeight = collapseBoxContent[i].scrollHeight + "px";
            // collapseBoxContent[i].style.paddingBottom = "12px";
            collapseBoxTitle[i].classList.add("open");
            collapseBoxArrow[i].classList.add("open");
        }
    });
}

fetch("solutions/test.py")
    .then(response => response.text())
    .then(code => {
        document.getElementById('solution_test').textContent = code;
        Prism.highlightAll();
    })
    .catch(error => {
        document.getElementById('solution_test').textContent = "Error loading solution";
    });