# Odisea Digital: Humanismo y Ciudadanía Digital

"Odisea Digital" es una aplicación web interactiva diseñada como una actividad de aprendizaje para el curso de Humanismo y Ciudadanía Digital. La plataforma gamifica el aprendizaje a través de una serie de desafíos y juegos de preguntas, permitiendo a los usuarios poner a prueba sus conocimientos, competir en un salón de la fama y participar en un foro de discusión.

## Características

- **Autenticación de Usuarios:** Inicio de sesión seguro utilizando múltiples proveedores de Firebase (Google, Facebook, etc.).
- **Juegos de Preguntas (Quizzes):** Diversos desafíos temáticos con preguntas de opción múltiple, límite de tiempo y sistema de intentos.
- **Salón de la Fama (Leaderboard):** Un ranking en tiempo real que muestra las puntuaciones más altas de los usuarios.
- **Foro de Comunidad:** Un espacio para que los usuarios compartan reflexiones y respondan a otros comentarios.
- **Perfil de Usuario:** Visualización de estadísticas de progreso, rango y un gráfico del historial de puntuaciones.
- **Diseño Moderno:** Una interfaz de usuario atractiva y responsiva con un tema de neón futurista.

## Tecnologías Utilizadas

- **Frontend:** HTML5, CSS3, JavaScript (ES6 Modules)
- **Backend y Base de Datos:** Google Firebase
  - **Firebase Authentication:** Para la gestión de usuarios.
  - **Cloud Firestore:** Como base de datos NoSQL en tiempo real.
  - **Firebase Hosting:** Para el despliegue y alojamiento de la aplicación.

## Despliegue

Este proyecto está configurado para un despliegue continuo en Firebase Hosting. El comando para desplegar la aplicación es:

```bash
firebase deploy
```
