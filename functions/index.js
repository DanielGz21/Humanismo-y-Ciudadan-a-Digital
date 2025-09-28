const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();

// --- LÓGICA DE MISIONES Y LOGROS ---

const achievements = {
    'score_100': { name: 'Aprendiz de la Odisea', description: 'Alcanza los 100 puntos.', icon: 'fas fa-graduation-cap' },
    'score_250': { name: 'Explorador Digital', description: 'Alcanza los 250 puntos.', icon: 'fas fa-rocket' },
    'forum_1': { name: 'Primer Contacto', description: 'Publica tu primer comentario.', icon: 'fas fa-comments' },
    'forum_5': { name: 'Voz de la Comunidad', description: 'Publica 5 comentarios.', icon: 'fas fa-bullhorn' }
};

const missionTemplates = [
    { type: 'SCORE_POINTS', goal: 50, reward: 25, description: 'Gana 50 puntos en cualquier quiz.' },
    { type: 'CORRECT_ANSWERS', goal: 5, reward: 30, description: 'Responde 5 preguntas correctamente.' },
    { type: 'PLAY_QUIZ', goal: 1, reward: 20, description: 'Completa una sesión de juego.' }
];

// --- FUNCIONES DE LA APP ---

// Función para enviar respuestas (MODIFICADA para misiones)
exports.submitAnswer = functions.https.onCall(async (data, context) => {
  // 1. Check for authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be authenticated to submit an answer.",
    );
  }

  const {questionIndex, answer, quizId} = data;
  const uid = context.auth.uid;

  // 2. Validate input
  if (!Number.isInteger(questionIndex) || !answer) {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "The data sent is not valid.",
    );
  }

  try {
    // 3. Securely get the correct answer from Firestore
    const questionsDoc = await db.collection("quizzes")
        .doc(quizId).get();
    if (!questionsDoc.exists) {
      throw new functions.https.HttpsError(
          "not-found",
          "Question set not found.",
      );
    }

    const questions = questionsDoc.data().questionSet;
    if (questionIndex >= questions.length) {
      throw new functions.https.HttpsError(
          "out-of-range",
          "Question index is out of range.",
      );
    }

    const correctAnswer = questions[questionIndex].answer;
    const userRef = db.collection("users").doc(uid);
    let pointsEarned = 0;

    // 4. Compare answers and update score if correct
    if (answer === correctAnswer) {
      pointsEarned = 10;
      await userRef.update({
        score: admin.firestore.FieldValue.increment(pointsEarned),
        currentQuestionIndex: questionIndex + 1,
      });

      // --- NUEVA LÓGICA DE MISIÓN ---
      await updateUserMissionProgress(uid, 'SCORE_POINTS', pointsEarned);
      await updateUserMissionProgress(uid, 'CORRECT_ANSWERS', 1);

      return {success: true, message: "¡Respuesta correcta!"};
    } else {
      // If the answer is incorrect, just update the progress
      await userRef.update({
        currentQuestionIndex: questionIndex + 1,
      });
      return {
        success: false,
        message: `Incorrecto. La respuesta era: ${correctAnswer}`,
      };
    }
  } catch (error) {
    console.error("Error in submitAnswer Cloud Function:", error);
    throw new functions.https.HttpsError(
        "internal",
        "An internal server error occurred.",
    );
  }
});

// Función para revisar logros (existente)
exports.checkAchievements = functions.firestore
    .document('users/{userId}')
    .onUpdate(async (change, context) => {
        const userId = context.params.userId;
        const newData = change.after.data();
        const oldData = change.before.data();
        
        const userAchievementsRef = db.collection('users').doc(userId).collection('unlockedAchievements');

        // 1. Revisar logros basados en PUNTUACIÓN
        if (newData.score > oldData.score) {
            if (newData.score >= 100) {
                await unlockAchievement(userAchievementsRef, 'score_100');
            }
            if (newData.score >= 250) {
                await unlockAchievement(userAchievementsRef, 'score_250');
            }
        }
        return null;
    });

// --- NUEVA FUNCIÓN PROGRAMADA ---
// Se ejecuta todos los días a medianoche para generar una nueva misión.
exports.generateDailyMission = functions.pubsub.schedule('every 24 hours').onRun(async (context) => {
    console.log('Generando nueva misión diaria...');
    
    // Seleccionar una misión aleatoria de las plantillas
    const missionIndex = Math.floor(Math.random() * missionTemplates.length);
    const newMission = missionTemplates[missionIndex];
    
    const missionId = new Date().toISOString().split('T')[0]; // ID único por día, ej: 2025-09-28
    
    await db.collection('daily_missions').doc(missionId).set({
        ...newMission,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`Misión diaria creada: ${newMission.description}`);
    return null;
});

// --- NUEVAS FUNCIONES AUXILIARES ---

async function unlockAchievement(userAchievementsRef, achievementId) {
    const achievementRef = userAchievementsRef.doc(achievementId);
    const doc = await achievementRef.get();

    if (!doc.exists) {
        console.log(`Desbloqueando logro ${achievementId} para el usuario.`);
        return achievementRef.set({
            ...achievements[achievementId],
            unlockedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }
    return null;
}

async function updateUserMissionProgress(uid, missionType, progressAmount) {
    const missionId = new Date().toISOString().split('T')[0];
    const missionRef = db.collection('daily_missions').doc(missionId);
    const missionDoc = await missionRef.get();

    if (!missionDoc.exists || missionDoc.data().type !== missionType) {
        return; // No hay misión para este tipo de acción o no es la misión de hoy
    }

    const mission = missionDoc.data();
    const progressRef = db.collection('users').doc(uid).collection('mission_progress').doc(missionId);
    const progressDoc = await progressRef.get();

    if (progressDoc.exists && progressDoc.data().completed) {
        return; // Misión ya completada
    }

    const currentProgress = progressDoc.exists ? progressDoc.data().progress : 0;
    const newProgress = currentProgress + progressAmount;

    if (newProgress >= mission.goal) {
        // Misión completada
        await progressRef.set({ progress: newProgress, completed: true });
        // Otorgar recompensa
        const userRef = db.collection("users").doc(uid);
        await userRef.update({ score: admin.firestore.FieldValue.increment(mission.reward) });
        
        console.log(`Usuario ${uid} completó la misión y ganó ${mission.reward} puntos.`);

    } else {
        // Actualizar progreso
        await progressRef.set({ progress: newProgress, completed: false }, { merge: true });
    }
}