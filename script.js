window.onload = () => {
    if (!window.fb) return console.error("Firebase is not loaded!");
    const { methods, db, auth, storage, provider } = window.fb;
    
    function scheduleNextDayRefresh() {
       const now = new Date();
       const nextRefresh = new Date();
       nextRefresh.setHours(5, 0, 0, 0);
       if (now >= nextRefresh) { nextRefresh.setDate(now.getDate() + 1); }
       const msUntilRefresh = nextRefresh - now;
       setTimeout(() => {
        loadGoals(); 
        scheduleNextDayRefresh();
       }, msUntilRefresh);
    }
    scheduleNextDayRefresh();

    auth.onAuthStateChanged(user => {
        if (user) {
            document.getElementById("authSection").style.display = "none";
            document.getElementById("mainContent").style.display = "block";
            document.getElementById("userAvatar").src = user.photoURL;
            document.getElementById("userNameDisplay").innerText = user.displayName;
            loadGoals(); 
        } else {
            document.getElementById("authSection").style.display = "block";
            document.getElementById("mainContent").style.display = "none";
        }
    });

    document.getElementById("loginBtn").onclick = () => methods.signInWithPopup(auth, provider);
    document.getElementById("logoutBtn").onclick = () => methods.signOut(auth);

    document.getElementById("submitGoalBtn").onclick = async () => {
        const input = document.getElementById("goalInput");
        const user = auth.currentUser;
        if (!input.value.trim()) return alert("Aktab your goal l3ziz!");

        try {
            await methods.addDoc(methods.collection(db, "goals"), {
                text: input.value,
                userId: user.uid,
                userName: user.displayName,
                userPhoto: user.photoURL,
                status: "pending",
                votes: 0,
                voters: [], 
                createdAt: methods.serverTimestamp()
            });
            input.value = "";
            alert("Dok li yswa wly mayswach y9dar ychof ur goal hhh rani ngsar 😗");
        } catch (e) { console.error(e); }
    };

    function loadGoals() {
        // orderBy hna tmchy
        const q = methods.query(methods.collection(db, "goals"), methods.orderBy("createdAt", "desc"));
        methods.onSnapshot(q, (snapshot) => {
            const list = document.getElementById("goalsList");
            list.innerHTML = "";
            snapshot.forEach(doc => {
                const g = doc.data();
                const goalId = doc.id;
                const user = auth.currentUser;
                const isOwner = user?.uid === g.userId;
                const hasVoted = g.voters && g.voters.includes(user?.uid);

                const div = document.createElement("div");
                div.className = "goal-card";
                let borderCol = "#f59e0b";
                if (g.status === "completed") borderCol = "#10b981";
                if (g.status === "failed") borderCol = "#ef4444";

                div.style = `background: white; padding: 15px; border-radius: 10px; margin-bottom: 15px; color: black; text-align: right; box-shadow: 0 2px 5px rgba(0,0,0,0.1); border-left: 8px solid ${borderCol};`;
                
                div.innerHTML = `
                    <div style="display: flex; align-items: center; margin-bottom: 10px;">
                        <img src="${g.userPhoto}" style="width: 30px; border-radius: 50%; margin-left: 10px;">
                        <b>${g.userName}</b>
                    </div>
                    <p style="font-size: 18px; margin: 10px 0; ${g.status === 'failed' ? 'text-decoration: line-through; color: gray;' : ''}">${g.text}</p>
                    <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #eee; padding-top: 10px;">
                        <span> ${g.votes || 0} hado kaml yjadk🔥</span>
                        <div>
                            ${isOwner && g.status === 'pending' ? `
                                <button onclick="markAsDone('${goalId}')" style="background: #10b981; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer; margin-left: 5px; width:auto;">✅ done </button>
                                <button onclick="markAsFailed('${goalId}')" style="background: #ef4444; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer; width:auto;">❌ failed huh </button>
                            ` : `
                                <span style="font-weight: bold; color: ${borderCol}">
                                    ${g.status === 'completed' ? '✅ done' : (g.status === 'failed' ? '❌ failed' : '⏳ on progress')}
                                </span>
                            `}
                            
                            ${g.status === 'completed' ? `
                                <button onclick="voteForGoal('${goalId}')" style="background: ${hasVoted ? '#ef4444' : '#3b82f6'}; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer; width:auto;">
                                    ${hasVoted ? '👎 nah' : '👍 vote'}
                                </button>
                            ` : ''}
                        </div>
                    </div>`;
                list.appendChild(div);
            });
        });
    }

    window.markAsDone = async (id) => {
        await methods.updateDoc(methods.doc(db, "goals", id), { status: "completed" });
    };

    window.markAsFailed = async (id) => {
        if (confirm(" rak mnytak😔")) {
            await methods.updateDoc(methods.doc(db, "goals", id), { status: "failed" });
        }
    };

    window.voteForGoal = async (id) => {
        const user = auth.currentUser;
        if (!user) return alert("Login first!");
        const goalRef = methods.doc(db, "goals", id);
        const goalSnap = await methods.getDoc(goalRef);
        const g = goalSnap.data();
        const voters = g.voters || [];

        if (voters.includes(user.uid)) {
            await methods.updateDoc(goalRef, { voters: methods.arrayRemove(user.uid), votes: methods.increment(-1) });
        } else {
            await methods.updateDoc(goalRef, { voters: methods.arrayUnion(user.uid), votes: methods.increment(1) });
        }
    };
};