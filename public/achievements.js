export const achievements = [
    {
        id: 'first_quiz_completed',
        name: 'Primer Paso',
        description: 'Completa tu primer quiz.',
        criteria: { type: 'quiz_completion', count: 1 }
    },
    {
        id: 'score_100',
        name: 'Cien Puntos',
        description: 'Alcanza una puntuación total de 100 puntos.',
        criteria: { type: 'total_score', value: 100 }
    },
    {
        id: 'first_comment',
        name: 'Voz de la Comunidad',
        description: 'Publica tu primer comentario en el foro.',
        criteria: { type: 'comment_count', count: 1 }
    },
    {
        id: 'quiz_master',
        name: 'Maestro del Quiz',
        description: 'Completa 5 quizzes diferentes.',
        criteria: { type: 'quiz_completion', count: 5 }
    }
];

export async function checkAchievements(user, db) {
    if (!user) return;

    const userRef = db.collection('users').doc(user.uid);
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    const userAchievementsRef = userRef.collection('achievements');
    const earnedAchievementsSnapshot = await userAchievementsRef.get();
    const earnedAchievementIds = earnedAchievementsSnapshot.docs.map(doc => doc.id);

    let newAchievementsEarned = [];

    for (const achievement of achievements) {
        if (!earnedAchievementIds.includes(achievement.id)) {
            let earned = false;
            switch (achievement.criteria.type) {
                case 'quiz_completion':
                    // This will require tracking completed quizzes, which is not yet implemented.
                    // For now, we'll assume a simple check or add more complex logic later.
                    // For 'first_quiz_completed', we can check if currentQuestionIndex > 0 after a game.
                    // For 'quiz_master', we'd need a list of unique quiz IDs completed.
                    if (achievement.id === 'first_quiz_completed' && userData.completedQuizzes && userData.completedQuizzes.length >= 1) {
                        earned = true;
                    } else if (achievement.id === 'quiz_master' && userData.completedQuizzes && userData.completedQuizzes.length >= achievement.criteria.count) {
                        earned = true;
                    }
                    break;
                case 'total_score':
                    if (userData.score >= achievement.criteria.value) {
                        earned = true;
                    }
                    break;
                case 'comment_count':
                    // This will require tracking comment count, which is not yet implemented.
                    // For now, we'll assume a simple check or add more complex logic later.
                    if (userData.commentCount && userData.commentCount >= achievement.criteria.count) {
                        earned = true;
                    }
                    break;
            }

            if (earned) {
                await userAchievementsRef.doc(achievement.id).set({
                    earnedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                newAchievementsEarned.push(achievement);
            }
        }
    }
    return newAchievementsEarned;
}

export async function getEarnedAchievements(user, db) {
    if (!user) return [];
    const userAchievementsRef = db.collection('users').doc(user.uid).collection('achievements');
    const snapshot = await userAchievementsRef.get();
    const earnedAchievementIds = snapshot.docs.map(doc => doc.id);
    return achievements.filter(ach => earnedAchievementIds.includes(ach.id));
}

export async function getAllAchievements() {
    return achievements;
}
