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
// db.settings({
//     timestampsInSnapshots: true
// });
const storage = firebase.storage();

let userCode = '';
let fileName = '';
let currentUser = null;

let exercises = {};
let currentExercise = null;
let totalExercisesAttempted = 0;

// Auth state observer
auth.onAuthStateChanged(user => {
    currentUser = user;
    if (user) {
        // User is logged in - hide modal, show content
        document.getElementById('login-modal').classList.remove('show');
        document.getElementById('main-content').classList.add('show');
        document.getElementById('logged-in-section').classList.remove('hidden');
        document.getElementById('user-email').textContent = user.email;
        // document.getElementById('save-btn').disabled = false;
        // document.getElementById('load-btn').disabled = false;

        // Load profile picture
        loadProfilePicture();

        loadExercises()
            .then(() => totalExercisesAttempted = getTotalExercisesAttempted());

        document.getElementById("profile-username").textContent = user.email.split("@")[0];
    } else {
        // User is logged out - show modal, hide content
        document.getElementById('login-modal').classList.add('show');
        document.getElementById('main-content').classList.remove('show');
        document.getElementById('logged-in-section').classList.add('hidden');
        // document.getElementById('save-btn').disabled = true;
        // document.getElementById('load-btn').disabled = true;
        document.getElementById('solutions-list').style.display = 'none';
    }
});

async function getTotalExercisesAttempted() {
    let total = 0;
    for (const [exerciseId, exercise] of Object.entries(exercises)) {
        const uploaded = await hasUploadedSolution(exerciseId);
        if (uploaded) total++;
    }

    document.getElementById('exercises-attempted').textContent = total;

    return total;
}

// Sign up
function signup() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
        showStatus('Please enter email and password', 'error');
        return;
    }
    
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Create user document immediately
            return db.collection('users').doc(userCredential.user.uid).set({
                email: userCredential.user.email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                profilePictureURL: null
            });
        })
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
        .then((userCredential) => {
            // Ensure user document exists (in case it's an old account)
            return db.collection('users').doc(userCredential.user.uid).update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            }).catch(error => {
                // If document doesn't exist, create it
                if (error.code === 'not-found') {
                    return db.collection('users').doc(userCredential.user.uid).set({
                        email: userCredential.user.email,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
                throw error;
            });
        })
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

// Upload profile picture
function uploadProfilePicture(input) {
    const file = input.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showStatus('Please select an image file', 'error');
        return;
    }
    
    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
        showStatus('Image must be less than 5MB', 'error');
        return;
    }
    
    // Show loading status
    showStatus('Uploading profile picture...', 'success');
    
    // Create a reference to the storage location
    const storageRef = storage.ref();
    const profilePicRef = storageRef.child(`profile_pictures/${currentUser.uid}`);
    
    // Upload the file
    profilePicRef.put(file)
        .then(snapshot => {
            // Get the download URL
            return snapshot.ref.getDownloadURL();
        })
        .then(downloadURL => {
            // Only update the profilePictureURL field
            return db.collection('users').doc(currentUser.uid).update({
                profilePictureURL: downloadURL
            });
        })
        .then(() => {
            showStatus('Profile picture updated!', 'success');
            // Display the new profile picture
            loadProfilePicture();
        })
        .catch(error => {
            showStatus('Upload error: ' + error.message, 'error');
        });
}

// Load and display profile picture
function loadProfilePicture() {
    if (!currentUser) return;
    
    db.collection('users').doc(currentUser.uid).get()
        .then(doc => {
            if (doc.exists && doc.data().profilePictureURL) {
                const img = document.getElementById('profile-picture');
                img.src = doc.data().profilePictureURL;
                img.style.display = 'block';
            } else {
                // Show default placeholder or hide image
                document.getElementById('profile-picture').src = "img/portrait_placeholder.png";
            }
        })
        .catch(error => {
            console.error('Error loading profile picture:', error);
        });
}

async function loadUsersList() {
    const usersList = document.getElementById("users-container");
    usersList.innerHTML = "<p>Loading users...</p>";

    try {
        const snapshot = await db.collection('users').get();

        if (snapshot.empty) {
            usersList.innerHTML = "<p>No users found.</p>";
            return;
        }

        usersList.innerHTML = ''; // Clear loading message

        snapshot.forEach(doc => {
            const user = doc.data();
            if (user == currentUser) return;
            const userId = doc.id;
            
            const userCard = document.createElement('div');
            userCard.className = 'user-card';
            userCard.innerHTML = `
                <div class="user-info">
                    ${user.profilePictureURL ? 
                        `<img src="${user.profilePictureURL}" 
                             alt="${user.email}" 
                             class="user-profile-pic">` 
                        : `<img src="img/portrait_placeholder.png" 
                             alt="${user.email}" 
                             class="user-profile-pic">`
                    }
                    <div>
                        <strong>${user.email}</strong>
                        <p class="user-joined">
                            ${user.createdAt && user.createdAt.seconds ? 
                                `Joined: ${user.createdAt.toDate().toLocaleDateString()}` 
                                : 'Member'}
                        </p>
                        <p class="user-joined">
                            ${user.lastLogin ? 
                                `Last Login: ${user.lastLogin.toDate().toLocaleDateString()}` 
                                : 'Member'}
                        </p>
                    </div>
                </div>
            `;
            
            usersList.appendChild(userCard);
        });
    } catch (error) {
        usersList.innerHTML = `<p class="error">Error loading users: ${error.message}</p>`;
        showStatus('Error loading users: ' + error.message, 'error');
    }
}
loadUsersList();

// Handle file selection
document.getElementById('modal-file-input').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        fileName = file.name;
        const reader = new FileReader();
        
        reader.onload = function(event) {
            //userCode = event.target.result;
            //displayCode(userCode);
            //document.getElementById('file-status').textContent = `File loaded: ${fileName}`;
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
    document.getElementById('modal-code-display').textContent = code;
    document.getElementById('user-code').style.display = 'block';
    // Prism will syntax highlight while preserving formatting
    Prism.highlightAll();
}

// Clear solution display
function clearSolution() {
    userCode = '';
    fileName = '';
    document.getElementById('modal-file-input').value = '';
    document.getElementById('modal-code-display').textContent = '';
    document.getElementById('user-code').style.display = 'none';
    document.getElementById('modal-file-status').textContent = 'No file selected';
    document.getElementById('upload-section').classList.remove('has-file');
}

// Show status messages
function showStatus(message, type) {
    // Check if we're in the modal
    if (!currentUser) {
        const modalStatus = document.getElementById('modal-status');
        modalStatus.textContent = message;
        modalStatus.className = `status ${type}`;
        setTimeout(() => {
            modalStatus.textContent = '';
            modalStatus.className = '';
        }, 5000);
    } else {
        const statusDiv = document.getElementById('status-message');
        statusDiv.textContent = message;
        statusDiv.className = `status ${type}`;
        setTimeout(() => {
            statusDiv.textContent = '';
            statusDiv.className = '';
        }, 5000);
    }
}

/* ---------------------------------------------
 Exercises
--------------------------------------------- */

// Load exercises from JSON
async function loadExercises() {
    try {
        const response = await fetch("data/exercises.json");
        const data = await response.json();
        exercises = data.exercises;
        displayExercises();
    } catch (error) {
        showStatus("Error loading exercises: " + error.message, "error");
    }
}

// Display all exercises
function displayExercises() {
    //const container = document.getElementById('exercises-container');
    //container.innerHTML = '<h2>Programming Exercises</h2>';
    
    for (const [exerciseId, exercise] of Object.entries(exercises)) {
        const card = document.createElement('div');
        card.className = 'exercise';
        card.innerHTML = `
            <h3>${exercise.title}</h3>
            <div class="instructions">${exercise.instructions}</div>
            ${exercise.example_input ? `
                <div class="example">
                    <strong>Example Input:</strong> ${exercise.example_input}<br>
                    <strong>Expected Output:</strong> ${exercise.example_output}
                </div>
            ` : ''}
            ${exercise.hints && exercise.hints.length > 0 ? `
                <div class="hints-container">
                    <h4>Hints (${exercise.hints.length} available)</h4>
                    ${exercise.hints.map((hint, index) => `
                        <div class="hint-wrapper" id="hint-wrapper-${exerciseId}-${index} style="display: ${index === 0 ? 'block' : 'none'};">
                            <div class="hint-reveal" id="hint-reveal-${exerciseId}-${index}">
                                <button onclick="revealHint('${exerciseId}', ${index})">Show Hint ${index + 1}</button>
                            </div>
                            <div class="hint-item" id="hint-content-${exerciseId}-${index}" style="display: none;">
                                <strong>Hint ${index + 1}:</strong> ${hint}
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}

            <div class="collapse-box">
                <div class="collapse-box-title">
                    <span>Solution</span>
                    <span class="down-arrow">&darr;</span>
                </div>
        
                <div class="collapse-box-content">
                    <pre><code id="solution_${exerciseId}" class="language-python">Loading...</code></pre>
                </div>
            </div>

            <button onclick="openUploadModal('${exerciseId}')">Upload Solution</button>
            <button onclick="loadSolution('${exerciseId}')">Load My Solution</button>
            <div id="code-${exerciseId}" style="display: none; margin-top: 15px;">
                <h4>Your Code:</h4>
                <pre><code class="language-python" id="display-${exerciseId}"></code></pre>
            </div>
        `;
        document.getElementById("main-content").appendChild(card);

        const title = card.querySelector(".collapse-box-title");
        const content = card.querySelector(".collapse-box-content");
        const arrow = card.querySelector(".down-arrow");
        setupCollaspableClick(exerciseId, title, content, arrow);
    }
}

function revealHint(exerciseId, hintIndex) {
    // Hide the button
    document.getElementById(`hint-reveal-${exerciseId}-${hintIndex}`).style.display = 'none';
    
    // Show the hint content
    document.getElementById(`hint-content-${exerciseId}-${hintIndex}`).style.display = 'block';
    
    // Show the next hint button if it exists
    const nextHintWrapper = document.getElementById(`hint-wrapper-${exerciseId}-${hintIndex + 1}`);
    if (nextHintWrapper) {
        nextHintWrapper.style.display = 'block';
    }
}

// Handle file selection for specific exercise
function handleFileSelect(exerciseId, input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            // Store in temporary object keyed by exercise
            if (!window.exerciseCodes) window.exerciseCodes = {};
            window.exerciseCodes[exerciseId] = {
                code: event.target.result,
                fileName: file.name
            };
            
            document.getElementById(`status-${exerciseId}`).textContent = `File loaded: ${file.name}`;
            document.getElementById(`btn-${exerciseId}`).disabled = false;
            
            // Display the code
            displayExerciseCode(exerciseId, event.target.result);
        };
        reader.readAsText(file);
    }
}

// Display code for specific exercise
function displayExerciseCode(exerciseId, code) {
    document.getElementById(`display-${exerciseId}`).textContent = code;
    document.getElementById(`code-${exerciseId}`).style.display = 'block';
    Prism.highlightAll();
}

let currentModalExercise = null;
let modalExerciseCode = null;

// Open the upload modal for a specific exercise
function openUploadModal(exerciseId) {
    if (!currentUser) {
        showStatus('Please login first!', 'error');
        return;
    }
    
    currentModalExercise = exerciseId;
    modalExerciseCode = null;
    
    // Set modal title
    document.getElementById('modal-exercise-title').textContent = 
        `Upload Solution: ${exercises[exerciseId].title}`;
    
    // Reset modal state
    document.getElementById('modal-file-input').value = '';
    document.getElementById('modal-file-status').textContent = 'No file selected';
    document.getElementById('modal-code-preview').style.display = 'none';
    document.getElementById('modal-code-display').textContent = '';
    document.getElementById('modal-submit-btn').disabled = true;
    document.getElementById('modal-status-message').textContent = '';
    
    // Show modal
    document.getElementById('upload-modal').classList.add('show');
}

// Close the upload modal
function closeUploadModal() {
    document.getElementById('upload-modal').classList.remove('show');
    currentModalExercise = null;
    modalExerciseCode = null;
}

// Handle file selection in modal
document.getElementById('modal-file-input').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            modalExerciseCode = {
                code: event.target.result,
                fileName: file.name
            };
            
            // Update status
            document.getElementById('modal-file-status').textContent = `File loaded: ${file.name}`;
            document.getElementById('modal-submit-btn').disabled = false;
            
            // Show preview
            document.getElementById('modal-code-display').textContent = event.target.result;
            document.getElementById('modal-code-preview').style.display = 'block';
            Prism.highlightAll();
        };
        reader.readAsText(file);
    }
});

// Submit solution from modal
function submitSolution() {
    if (!currentModalExercise || !modalExerciseCode) {
        showModalStatus('Please select a file first!', 'error');
        return;
    }
    
    const { code, fileName } = modalExerciseCode;
    
    // Save to Firestore
    db.collection('users').doc(currentUser.uid)
      .collection('solutions').doc(currentModalExercise).set({
        fileName: fileName,
        code: code,
        exerciseId: currentModalExercise,
        exerciseTitle: exercises[currentModalExercise].title,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        showModalStatus('Solution saved successfully!', 'success');
        
        // Also display it in the main page
        displayExerciseCode(currentModalExercise, code);
        
        // Store the title before closing modal
        const exerciseTitle = exercises[currentModalExercise].title;
        
        // Close modal after short delay
        setTimeout(() => {
            closeUploadModal();
            showStatus(`Solution for "${exerciseTitle}" saved!`, 'success');
        }, 1500);
    })
    .catch(error => {
        showModalStatus('Save error: ' + error.message, 'error');
    });
}

// Show status in modal
function showModalStatus(message, type) {
    const statusDiv = document.getElementById('modal-status-message');
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
}

// Upload solution for specific exercise
function uploadSolution(exerciseId) {
    if (!currentUser) {
        showStatus('Please login first!', 'error');
        return;
    }
    
    if (!window.exerciseCodes || !window.exerciseCodes[exerciseId]) {
        showStatus('Please select a file first!', 'error');
        return;
    }
    
    const { code, fileName } = window.exerciseCodes[exerciseId];
    
    // Save to Firestore under exercise-specific path
    db.collection('users').doc(currentUser.uid)
      .collection('solutions').doc(exerciseId).set({
        fileName: fileName,
        code: code,
        exerciseId: exerciseId,
        exerciseTitle: exercises[exerciseId].title,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        showStatus(`Solution for "${exercises[exerciseId].title}" saved successfully!`, 'success');
    })
    .catch(error => {
        showStatus('Save error: ' + error.message, 'error');
    });
}

// Load solution for specific exercise
function loadSolution(exerciseId) {
    if (!currentUser) {
        showStatus('Please login first!', 'error');
        return;
    }
    
    db.collection('users').doc(currentUser.uid)
      .collection('solutions').doc(exerciseId).get()
      .then(doc => {
        if (doc.exists) {
            const data = doc.data();
            displayExerciseCode(exerciseId, data.code);
            // document.getElementById(`status-${exerciseId}`).textContent = 
            //     `Loaded: ${data.fileName}`;
            showStatus('Solution loaded!', 'success');
        } else {
            showStatus(`No saved solution for "${exercises[exerciseId].title}"`, 'error');
        }
    })
    .catch(error => {
        showStatus('Load error: ' + error.message, 'error');
    });
}

async function hasUploadedSolution(exerciseId) {
    if (!currentUser) {
        showStatus('Please login first!', 'error');
        return false;
    }
    
    try {
        const doc = await db.collection('users').doc(currentUser.uid)
            .collection('solutions').doc(exerciseId).get();
        
        return doc.exists;
    } catch (error) {
        showStatus('Load error: ' + error.message, 'error');
        return false;
    }
}

/* ---------------------------------------------
 Collapse Box Functionality
--------------------------------------------- */
const collapseBoxTitle   = document.querySelectorAll(".collapse-box-title");
const collapseBoxContent = document.querySelectorAll(".collapse-box-content");
const collapseBoxArrow   = document.querySelectorAll(".down-arrow");

function setupCollaspableClick(ex, title, content, arrow) {
    title.addEventListener("click", async () => {
        const isOpen = content.style.maxHeight;
        
        if (isOpen) {
            content.style.maxHeight  = null;
            content.style.paddingBottom = "0";
            title.classList.remove("open");
            arrow.classList.remove("open");
        } else {
            hasUploaded = await hasUploadedSolution(ex);
            if (!hasUploaded) return;

            const codeSection = document.getElementById(`solution_${ex}`);
            // Only fetch if not already loaded
            if (codeSection.textContent == "Loading...") {
                let code = "";
                fetch(`solutions/${ex}.py`)
                    .then(response => response.text())
                    .then(code => {
                        codeSection.textContent = code;
                        Prism.highlightAll();
                        content.style.maxHeight = content.scrollHeight + "px";
                        // collapseBoxContent[i].style.paddingBottom = "12px";
                        title.classList.add("open");
                        arrow.classList.add("open");
                    })
                    .catch(error => {
                        codeSection.textContent = "Error loading solution";
                    });
            } else {
                content.style.maxHeight = content.scrollHeight + "px";
                // collapseBoxContent[i].style.paddingBottom = "12px";
                title.classList.add("open");
                arrow.classList.add("open");
            }
        }
    });
}

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

// fetch("solutions/test.py")
//     .then(response => response.text())
//     .then(code => {
//         document.getElementById('solution_test').textContent = code;
//         Prism.highlightAll();
//     })
//     .catch(error => {
//         document.getElementById('solution_test').textContent = "Error loading solution";
//     });

/* ---------------------------------------------
 Init
--------------------------------------------- */
// window.addEventListener("load", () => {
//     loadExercises();
// });