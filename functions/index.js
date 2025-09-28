const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();

exports.submitAnswer = functions.https.onCall(async (data, context) => {
  // 1. Check for authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be authenticated to submit an answer.",
    );
  }

  const {questionIndex, answer} = data;
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
    const questionsDoc = await db.collection("questions")
        .doc("generations-quiz").get();
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

    // 4. Compare answers and update score if correct
    const userRef = db.collection("users").doc(uid);
    if (answer === correctAnswer) {
      await userRef.update({
        score: admin.firestore.FieldValue.increment(10),
        currentQuestionIndex: questionIndex + 1,
      });
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