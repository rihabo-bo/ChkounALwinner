window.onload = () => {
    if (!window.fb) return console.error("Firebase is not loaded!");
    const { methods, db, auth, provider } = window.fb;


    const ADMIN_UID = "wdVDUFEE3dS97K853IXimNEtHw82";


    auth.onAuthStateChanged(user => {
        if (user) {
            document.getElementById("authSection").style.display = "none";
            document.getElementById("mainContent").style.display = "block";
            

            document.getElementById("userAvatar").src = user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`;
            document.getElementById("pfpInput").onchange = function(e) {
                 const file = e.target.files[0];
                 if (!file) return;

                 const user = auth.currentUser;
                 if (!user) return alert("Sajli dkhoul 9bal ma tbadli l'pfp!");

                 if (file.size > 500 * 1024) return alert("Bzaf kbira dir whda 500kb");

                 const reader = new FileReader();
                 reader.onload = function(event) {
                     const base64Image = event.target.result;
                     localStorage.setItem(`customPfp_${user.uid}`, base64Image);
                     document.getElementById("userAvatar").src = base64Image;
                      alert("Pfp updated! ✨");
              };
             reader.readAsDataURL(file);
            };
            
            const savedPfp = localStorage.getItem(`customPfp_${user.uid}`);
  
            document.getElementById("userAvatar").src = savedPfp || user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`;
    

            const savedName = localStorage.getItem(`customName_${user.uid}`);
            document.getElementById("userNameDisplay").innerText = savedName || user.displayName || "User";
            
            loadGoals(); 
            setInterval(loadGoals, 60000);
        } else {
            document.getElementById("authSection").style.display = "block";
            document.getElementById("mainContent").style.display = "none";
        }
    });


    document.getElementById("loginBtn").onclick = () => methods.signInWithPopup(auth, provider);
    document.getElementById("logoutBtn").onclick = () => methods.signOut(auth);


    document.getElementById("updateNameBtn").onclick = () => {
        const newName = document.getElementById("customNameInput").value.trim();
        if (!newName) return alert("Write a name!");
        localStorage.setItem(`customName_${auth.currentUser.uid}`, newName);
        document.getElementById("userNameDisplay").innerText = newName; 
        alert("asm chbab bsa7 ta3i khir hehehee! ✅");
    };


    document.getElementById("submitGoalBtn").onclick = async () => {
        const input = document.getElementById("goalInput");
        const user = auth.currentUser;
        if (!input.value.trim()) return alert("Aktab goal l3ziz!");
        
        const now = new Date();
        const last5AM = new Date();
        last5AM.setHours(5, 0, 0, 0);
        if (now < last5AM) last5AM.setDate(last5AM.getDate() - 1);

        const qCheck = methods.query(
            methods.collection(db, "goals"),
            methods.where("userId", "==", user.uid),
            methods.where("createdAt", ">=", methods.Timestamp.fromDate(last5AM))
        );

        try {
            const alreadyExists = await new Promise((resolve) => {
                const unsub = methods.onSnapshot(qCheck, (snap) => {
                    unsub();
                    resolve(!snap.empty);
                });
            });

            if (alreadyExists) {
                return alert("🚫 One big goal per day only");
            }
            
            const customPfp = localStorage.getItem(`customPfp_${user.uid}`);
            const displayName = localStorage.getItem(`customName_${user.uid}`) || user.displayName;
            await methods.addDoc(methods.collection(db, "goals"), {
                text: input.value,
                userId: user.uid,
                userName: displayName,
                userPhoto: customPfp || user.photoURL || "",
                status: "pending",
                votes: 0,
                voters: [], 
                comments: [], 
                createdAt: methods.serverTimestamp()
            });
            input.value = "";
            alert("Dok li yswa wly mayswach y9dar ychof ur goal hhh rani ngsar 😗");
        } catch (e) { console.error("Error adding goal:", e); }
    };

    function loadGoals() {
        const now = new Date();
        const last5AM = new Date();
        last5AM.setHours(5, 0, 0, 0);
        if (now < last5AM) last5AM.setDate(last5AM.getDate() - 1);

        const q = methods.query(
            methods.collection(db, "goals"),
            methods.where("createdAt", ">=", methods.Timestamp.fromDate(last5AM)),
            methods.orderBy("createdAt", "desc")
        );

        methods.onSnapshot(q, (snapshot) => {
            const list = document.getElementById("goalsList");
            list.innerHTML = "";
            const user = auth.currentUser;
            const isAdmin = user?.uid === ADMIN_UID;
            
            const currentTime = now.getHours() * 60 + now.getMinutes();
            const doneTime = 22 * 60 + 20;   
            const voteStart = 22 * 60 + 30;  
            const voteEnd = 23 * 60;         

            let allGoals = [];

            snapshot.forEach(doc => {
                const g = doc.data();
                const goalId = doc.id;
                allGoals.push({ id: goalId, ...g });
                const isOwner = user?.uid === g.userId;
                const hasVoted = g.voters?.includes(user?.uid);
                const comments = g.comments || [];
                const hasCommented = comments.some(c => c.userId === user?.uid);

                const div = document.createElement("div");
                div.className = "goal-card";
                

                let borderCol = "#f59e0b"; 
                if (g.status === "completed") borderCol = "#10b981";
                if (g.status === "failed") borderCol = "#ef4444";
                
                div.style = `border-left: 8px solid ${borderCol}; position: relative; padding: 0; overflow: hidden;`;
            
                div.innerHTML = `
                    <div style="padding: 15px;">
                        ${isAdmin ? `<button onclick="deleteGoal('${goalId}')" style="position:absolute; left:10px; top:10px; width:auto; background:none; color:red; font-size:1.2rem; margin:0; border:none; cursor:pointer;">🗑️</button>` : ''}
                        <div style="display: flex; align-items: center; margin-bottom: 10px;">
                            <img src="${g.userPhoto || 'https://ui-avatars.com/api/?name=' + g.userName}" style="width: 30px; height: 30px; border-radius: 50%; margin-left: 10px;">
                            <b>${g.userName || "User"}</b>
                        </div>
                        <p style="font-size: 1.1rem; margin: 10px 0; ${g.status === 'failed' ? 'text-decoration: line-through; color: gray;' : ''}">${g.text}</p>
                        
                        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #eff3f4; padding-top: 10px;">
                            <div style="display: flex; gap: 10px;">
                                <span style="font-weight: bold; color: #536471; display:flex; align-items:center;">${g.votes || 0} 🔥</span>
                                <button class="toggle-comments-btn" onclick="toggleComments('${goalId}')">💬 ${comments.length}</button>
                            </div>

                            <div>
                                ${isOwner && g.status === 'pending' ? `
                                    <button onclick="editGoal('${goalId}', '${g.text.replace(/'/g, "\\'")}')" style="background:#1d9bf0; color:white; width:auto; padding:5px 12px; border-radius: 20px; cursor:pointer; margin-right:5px;">✏️ edit</button>
                                ` : ''}
                                ${isOwner && g.status === 'pending' && currentTime >= doneTime ? `
                                    <button onclick="updateStatus('${goalId}', 'completed')" style="background:#10b981; color:white; width:auto; padding:5px 12px; border-radius: 20px; cursor:pointer;">✅ done</button>
                                    <button onclick="updateStatus('${goalId}', 'failed')" style="background:#ef4444; color:white; width:auto; padding:5px 12px; border-radius: 20px; cursor:pointer;">❌ failed</button>
                                ` : ''}
                                ${!isOwner && g.status === 'completed' && currentTime >= voteStart && currentTime < voteEnd ? `
                                    <button onclick="voteGoal('${goalId}')" style="background:${hasVoted ? '#ef4444' : '#1d9bf0'}; color:white; width:auto; padding:5px 12px; border-radius: 20px; cursor:pointer;">
                                        ${hasVoted ? '👎 nuh' : '👍 Vote'}
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>

                    <div id="commentsSection-${goalId}" class="comments-container" style="display:none;">
                        <div class="comments-list">
                            ${comments.map((c, index) => `
                                <div class="comment-item" style="display: flex; justify-content: space-between; align-items: center;">
                                    <div style="display: flex; align-items: center;">
                                        <img src="${c.userPhoto || 'https://ui-avatars.com/api/?name=' + c.userName}" class="comment-avatar">
                                        <div class="comment-content">
                                            <span class="comment-author">${c.userName || "User"}</span>
                                            <div class="comment-text">${c.text}</div>
                                        </div>
                                    </div>
                                    ${isAdmin ? `<button onclick="deleteComment('${goalId}', ${index})" style="background:none; border:none; color:red; cursor:pointer; font-size:0.8rem;">🗑️</button>` : ''}
                                </div>
                            `).join('')}
                            ${comments.length === 0 ? '<p style="text-align:center; color:#536471; font-size:0.8rem; padding:10px;">No motivation yet.. be the first! 🚀</p>' : ''}
                        </div>
                        <div class="comment-input-area">
                            <input type="text" id="commInput-${goalId}" placeholder="Write motivation..">
                            <button class="send-comment-btn" onclick="addComment('${goalId}')">Reply</button>
                        </div>
                    </div>`;
                
                list.appendChild(div);
            });

            if (currentTime >= voteEnd) {
                handleWinnerLogic(allGoals, isAdmin);
            }
        });
    }


    window.toggleComments = (goalId) => {
        const el = document.getElementById(`commentsSection-${goalId}`);
        el.style.display = (el.style.display === "block") ? "none" : "block";
    };

    window.addComment = async (goalId) => {
        const user = auth.currentUser;
        if (!user) return alert("Login first!");
        const input = document.getElementById(`commInput-${goalId}`);
        const text = input.value.trim();
        if (!text) return;
        if (text.length > 200) return alert("Too long!");

        const displayName = localStorage.getItem(`customName_${user.uid}`) || user.displayName;
        try {
            const customPfp = localStorage.getItem(`customPfp_${user.uid}`);
            const customName = localStorage.getItem(`customName_${user.uid}`);
        
            const goalRef = methods.doc(db, "goals", goalId);
            await methods.updateDoc(methods.doc(db, "goals", goalId), {
                comments: methods.arrayUnion({
                    userId: user.uid,
                    userName: customName || displayName,
                    userPhoto: customPfp || user.photoURL || "",
                    text: text,
                    at: new Date().toISOString()
                })
            });
            input.value = ""; 
        } catch (e) { alert("Awilyyy kayn error"); }
    };
    
    window.deleteComment = async (goalId, index) => {
        if (!confirm("raky sure ya zala haba tn7i this comment?")) return;
        try {
            const goalRef = methods.doc(db, "goals", goalId);
            const docSnap = await methods.getDoc(goalRef);
            if (docSnap.exists()) {
                const comments = docSnap.data().comments || [];
                comments.splice(index, 1);
                await methods.updateDoc(goalRef, { comments: comments });
            }
        } catch (e) { console.error("Error deleting comment:", e); }
    };

        function handleWinnerLogic(goals, isAdmin) {
        const winnerSection = document.getElementById("winnerSection");
        const completedGoals = goals.filter(g => g.status === "completed");
        if (completedGoals.length === 0) return;

        const manualWinner = completedGoals.find(g => g.isWinner === true);
        if (manualWinner) return displayWinner(manualWinner);

        const maxVotes = Math.max(...completedGoals.map(g => g.votes || 0));
        const topGoals = completedGoals.filter(g => (g.votes || 0) === maxVotes);

        if (topGoals.length === 1) {
            displayWinner(topGoals[0]);
        } else if (topGoals.length > 1 && isAdmin) {
            winnerSection.innerHTML = `
                <div class="card" style="background: white; color: black; border: 2px dashed gold; text-align:center; padding: 20px; border-radius:15px; margin-bottom:20px;">
                    <h3>⚠️ khyri al winner ya zala:</h3>
                    ${topGoals.map(g => `<button onclick="setManualWinner('${g.id}')" style="margin:5px; width:auto; padding: 10px; background: gold; border:none; border-radius:8px; cursor:pointer;">🏆 ${g.userName} (${g.votes})</button>`).join('')}
                </div>`;
        }
    }

    function displayWinner(winner) {
        const winnerSection = document.getElementById("winnerSection");
        

        if (winnerSection.getAttribute("celebrated") === "true") {
            renderPermanentWinner(winner);
            return;
        }
        
        document.body.classList.add("winner-celebration-mode");

        const end = Date.now() + (10 * 1000); 

    (function frame() {
     
        confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#ffd700', '#38f8ae', '#ffffff']
        });
    
        confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#ffd700', '#38f8ae', '#ffffff']
        });

        if (Date.now() < end) {
            requestAnimationFrame(frame);
        }
    }());

        winnerSection.innerHTML = `
            <div class="epic-winner-announcement">
                <div style="font-size: 3.5rem;">👑</div>
                <img src="${winner.userPhoto || 'https://ui-avatars.com/api/?name=' + winner.userName}" style="width:130px; height:130px; border-radius:50%; border:5px solid white; box-shadow:0 10px 20px rgba(0,0,0,0.2); object-fit:cover;">
                <h1 style="margin:15px 0 5px 0;">${winner.userName}</h1>
                <p style="font-weight:bold; font-size:1.2rem;">  🔥!Winner ta3 L'YOUM</p>
            </div>`;
        
        winnerSection.setAttribute("celebrated", "true");

   
        setTimeout(() => {
            document.body.classList.remove("winner-celebration-mode");
            renderPermanentWinner(winner);
        }, 10000);
    }

    function renderPermanentWinner(winner) {
        document.getElementById("winnerSection").innerHTML = `
            <div class="goal-card winner-card-permanent" style="margin: 0 auto 20px auto; text-align:right;">
                <div style="padding: 15px; display: flex; align-items: center; gap: 15px; flex-direction: row-reverse;">
                    <img src="${winner.userPhoto || 'https://ui-avatars.com/api/?name=' + winner.userName}" style="width: 55px; height: 55px; border-radius: 50%; border: 2px solid gold; object-fit:cover;">
                    <div style="flex-grow:1;">
                        <b style="font-size: 1.2rem;">🏆 ${winner.userName}</b>
                        <p style="margin: 5px 0 0 0; font-size: 0.95rem;">${winner.text}</p>
                        <span style="font-size:0.8rem; font-weight:bold;">${winner.votes} 🔥 VOTES</span>
                    </div>
                </div>
            </div>`;
    }


    window.updateStatus = async (id, status) => { 
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        if (currentTime < (22 * 60 + 20)) return alert("⏰ Too early! Wait until 22:20");
        
        await methods.updateDoc(methods.doc(db, "goals", id), { status }); 
    };
    
    window.deleteGoal = async (id) => { 
        if (confirm("raki sure tna7ih?")) await methods.deleteDoc(methods.doc(db, "goals", id)); 
    };

    window.setManualWinner = async (id) => {
        await methods.updateDoc(methods.doc(db, "goals", id), { isWinner: true });
    };

    window.editGoal = async (id, currentText) => {
    const user = auth.currentUser;
    if (!user) return;

    const newText = prompt("Edit your goal:", currentText);
    
    if (newText === null || newText.trim() === "" || newText === currentText) return;
    if (newText.length > 200) return alert("Too long!");

    try {
        const goalRef = methods.doc(db, "goals", id);
        
      
        await methods.updateDoc(goalRef, {
            text: newText.trim(),
            editedAt: methods.serverTimestamp()
        });
        
        alert("Goal updated!✨");
         } catch (e) {
        console.error("Awillyyy kayn Error updating goal", e);
       
        alert("Permission Denied: You can only edit 'pending' goals no للغش");
        }
   };


    window.voteGoal = async (id) => {
        const user = auth.currentUser;
        if (!user) return alert("Login first!");
        const goalRef = methods.doc(db, "goals", id);
        const g = (await methods.getDoc(goalRef)).data();
        
        if (g.userId === user.uid) return alert("You can't vote for yourself! 😗");

        if (g.voters?.includes(user.uid)) {
            await methods.updateDoc(goalRef, { voters: methods.arrayRemove(user.uid), votes: methods.increment(-1) });
        } else {
            await methods.updateDoc(goalRef, { voters: methods.arrayUnion(user.uid), votes: methods.increment(1) });
        }
    };
};

