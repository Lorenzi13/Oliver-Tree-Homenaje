// Mensajes de homenaje con Firebase Firestore:
// - Cualquier visitante puede leer y publicar mensajes
// - Solo el administrador autenticado puede eliminarlos (reforzado con reglas de Firestore)
// Importaciones desde el CDN de Firebase (necesario para el navegador sin npm)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getFirestore, collection, addDoc, deleteDoc, doc, updateDoc, increment,
  onSnapshot, query, orderBy, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

// TODO: Add SDKs for Firebase products that you want to use

// https://firebase.google.com/docs/web/setup#available-libraries


// Your web app's Firebase configuration

// For Firebase JS SDK v7.20.0 and later, measurementId is optional

const firebaseConfig = {

  apiKey: "AIzaSyDnNp4YBsV-Rn8IgNYRjsJ8B_Q2R891lqg",

  authDomain: "oliver-tree-homenaje.firebaseapp.com",

  projectId: "oliver-tree-homenaje",

  storageBucket: "oliver-tree-homenaje.firebasestorage.app",

  messagingSenderId: "534727501284",

  appId: "1:534727501284:web:dd0bbf3793b6ebafd913f1",

  measurementId: "G-139FSDRSFG"

};




const form = document.getElementById('form-comentario');
const lista = document.getElementById('lista-comentarios');
const estado = document.getElementById('estado-comentarios');
const btnAcceso = document.getElementById('btn-acceso-admin');
const adminLogin = document.getElementById('admin-login');
const adminActivo = document.getElementById('admin-activo');
const btnSalir = document.getElementById('btn-salir-admin');

if (firebaseConfig.apiKey.startsWith('PEGA_AQUI')) {
  estado.textContent = '⚠️ Firebase aún no está configurado. Sigue la guía en FIREBASE_SETUP.md y pega tu firebaseConfig en script.js.';
  btnAcceso.hidden = true;
  form.addEventListener('submit', (e) => e.preventDefault());
} else {
  iniciarFirebase();
}

function iniciarFirebase() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const auth = getAuth(app);
  const comentariosRef = collection(db, 'comentarios');

  let esAdmin = false;
  let ultimosDocs = [];

  // 2) Publicar un mensaje nuevo
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const nombre = form.nombre.value.trim();
    const mensaje = form.mensaje.value.trim();
    if (!nombre || !mensaje) return;

    try {
      await addDoc(comentariosRef, { nombre, mensaje, creado: serverTimestamp(), reacciones: 0 });
      form.reset();
      form.nombre.focus();
    } catch (error) {
      estado.textContent = 'No se pudo publicar el mensaje. Inténtalo de nuevo.';
      console.error(error);
    }
  });

  // 3) Escuchar los mensajes en tiempo real
  const consulta = query(comentariosRef, orderBy('creado', 'desc'));
  onSnapshot(consulta, (snapshot) => {
    ultimosDocs = snapshot.docs;
    pintarComentarios();
  }, (error) => {
    estado.textContent = 'No se pudieron cargar los mensajes.';
    console.error(error);
  });

  function pintarComentarios() {
    lista.innerHTML = '';
    if (ultimosDocs.length === 0) {
      estado.textContent = 'Aún no hay mensajes. ¡Sé la primera persona en dejar uno!';
      return;
    }
    estado.textContent = '';
    ultimosDocs.forEach((docSnap) => {
      lista.append(crearComentario(docSnap.id, docSnap.data()));
    });
  }

  // Reacciones ya dadas desde este navegador (un corazón por mensaje)
  const reaccionados = new Set(JSON.parse(localStorage.getItem('reaccionados') || '[]'));

  function crearComentario(id, { nombre, mensaje, reacciones }) {
    const item = document.createElement('li');
    item.className = 'comentario';

    const texto = document.createElement('p');
    texto.className = 'comentario-texto';
    texto.textContent = `«${mensaje}»`;

    const autor = document.createElement('p');
    autor.className = 'comentario-autor';
    autor.textContent = `— ${nombre}`;

    const yaReaccionado = reaccionados.has(id);
    const btnReaccion = document.createElement('button');
    btnReaccion.type = 'button';
    btnReaccion.className = 'reaccion';
    btnReaccion.disabled = yaReaccionado;
    btnReaccion.title = yaReaccionado ? 'Ya reaccionaste a este mensaje' : 'Reaccionar con un corazón';
    btnReaccion.textContent = `${yaReaccionado ? '💜' : '🤍'} ${reacciones ?? 0}`;
    btnReaccion.addEventListener('click', () => reaccionar(id));

    item.append(texto, autor, btnReaccion);

    if (esAdmin) {
      const btnEliminar = document.createElement('button');
      btnEliminar.type = 'button';
      btnEliminar.className = 'eliminar';
      btnEliminar.textContent = 'Eliminar';
      btnEliminar.addEventListener('click', () => eliminarComentario(id));
      item.append(btnEliminar);
    }
    return item;
  }

  // 3b) Reacciones: suma 1 al contador en Firestore (las reglas solo permiten eso)
  async function reaccionar(id) {
    if (reaccionados.has(id)) return;
    reaccionados.add(id);
    localStorage.setItem('reaccionados', JSON.stringify([...reaccionados]));
    try {
      await updateDoc(doc(db, 'comentarios', id), { reacciones: increment(1) });
    } catch (error) {
      console.error('No se pudo registrar la reacción', error);
    }
  }

  // 4) Borrado de mensajes (Firestore lo rechaza si no hay sesión)
  async function eliminarComentario(id) {
    if (!confirm('¿Eliminar este mensaje de forma permanente?')) return;
    try {
      await deleteDoc(doc(db, 'comentarios', id));
    } catch (error) {
      alert('No se pudo eliminar el mensaje.');
      console.error(error);
    }
  }

  // 5) Acceso del administrador
  btnAcceso.addEventListener('click', () => {
    adminLogin.hidden = !adminLogin.hidden;
  });

  adminLogin.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await signInWithEmailAndPassword(
        auth,
        adminLogin['admin-email'].value,
        adminLogin['admin-password'].value
      );
      adminLogin.reset();
    } catch (error) {
      alert('Correo o contraseña incorrectos.');
      console.error(error);
    }
  });

  btnSalir.addEventListener('click', () => signOut(auth));

  onAuthStateChanged(auth, (user) => {
    esAdmin = Boolean(user);
    btnAcceso.hidden = esAdmin;
    adminLogin.hidden = true;
    adminActivo.hidden = !esAdmin;
    pintarComentarios();
  });
}

// ===== Mini Oliver: asistente interactivo (independiente de Firebase) =====
const miniCara = document.getElementById('mini-cara');
const miniBurbuja = document.getElementById('mini-burbuja');
const miniPanel = document.getElementById('mini-panel');
const miniCerrar = document.getElementById('mini-cerrar');
const miniLeer = document.getElementById('mini-leer');
const miniMensajes = document.getElementById('mini-mensajes');
const miniForm = document.getElementById('mini-form');
const miniInput = document.getElementById('mini-input');

let burbujaTimer;

function mostrarBurbuja(texto, duracion = 6000) {
  miniBurbuja.textContent = texto;
  miniBurbuja.hidden = false;
  clearTimeout(burbujaTimer);
  burbujaTimer = setTimeout(() => { miniBurbuja.hidden = true; }, duracion);
}

// Saludo al cargar la página
setTimeout(() => {
  mostrarBurbuja('¡Hola! Soy Mini Oliver 🎤 Haz clic en mí: puedo leer la página en voz alta o responder tus preguntas.', 9000);
}, 1500);

// Clic en Mini Oliver: abre o cierra su panel
miniCara.addEventListener('click', () => {
  miniPanel.hidden = !miniPanel.hidden;
  if (!miniPanel.hidden && miniMensajes.childElementCount === 0) {
    agregarMensaje('¡Hola! Soy Mini Oliver 🎤 Pregúntame lo que quieras sobre Oliver Tree, o pulsa 🔊 y te leo la página.', 'oliver');
  }
});

// Botón 🔊 del panel: lee (o detiene la lectura de) el contenido de la página
miniLeer.addEventListener('click', () => {
  if (!('speechSynthesis' in window)) {
    mostrarBurbuja('Tu navegador no admite lectura en voz alta.');
    return;
  }

  if (speechSynthesis.speaking) {
    speechSynthesis.cancel();
    miniCara.classList.remove('leyendo');
    mostrarBurbuja('Lectura detenida. Pulsa 🔊 para seguir escuchando.');
    return;
  }

  const contenido = document.querySelector('main').innerText;
  const lectura = new SpeechSynthesisUtterance(contenido);
  lectura.lang = 'es-ES';
  speechSynthesis.speak(lectura);
  miniCara.classList.add('leyendo');
  mostrarBurbuja('🔊 Leyendo la página… pulsa 🔊 de nuevo para detener.', 10000);
  lectura.onend = () => miniCara.classList.remove('leyendo');
});

// Base de conocimientos sobre Oliver Tree
const conocimiento = [
  {
    claves: ['hola', 'buenas', 'hey', 'saludos'],
    respuesta: '¡Hola! Puedo contarte sobre la biografía, discografía, estética, obras o el accidente de Oliver Tree. ¿Por dónde empezamos?'
  },
  {
    claves: ['quien', 'quién', 'biografía', 'biografia', 'nació', 'nacio', 'nacimiento', 'vida'],
    respuesta: 'Oliver Tree Nickell nació el 29 de junio de 1993 en Santa Cruz, California. Empezó en la escena electrónica underground bajo el alias Tree y acabó desafiando las convenciones de la industria musical.'
  },
  {
    claves: ['discografía', 'discografia', 'álbum', 'album', 'álbumes', 'albumes', 'ep', 'disco'],
    respuesta: 'Sus álbumes: Splitting Branches (2013), Ugly Is Beautiful (2020), Cowboy Tears (2022), Alone in a Crowd (2023) y Love You Madly Hate You Badly (2026). Entre sus EPs destacan Demons (2013) y Alien Boy (2018).'
  },
  {
    claves: ['miss you', 'robin', 'schulz', 'tiktok', 'famosa', 'éxito', 'exito', 'hit', 'canción', 'cancion', 'life goes on'],
    respuesta: 'Su mayor éxito global es «Miss You» junto a Robin Schulz, un fenómeno en TikTok. También destacan «Life Goes On» y «When I\'m Down», su primer gran viral en 2016.'
  },
  {
    claves: ['murió', 'murio', 'muerte', 'accidente', 'helicóptero', 'helicoptero', 'falleció', 'fallecio', 'pasó', 'paso'],
    respuesta: 'El 14 de junio de 2026 falleció en una colisión aérea entre dos helicópteros en Río de Janeiro. La investigación señaló un error de radar y un operador de vuelo irregular. Tienes los detalles en la sección del accidente.'
  },
  {
    claves: ['tazón', 'tazon', 'corte', 'pelo', 'peinado', 'estética', 'estetica', 'gafas', 'look', 'vestimenta'],
    respuesta: 'Su imagen es inconfundible: corte de tazón estilo hongo, trajes de neopreno retro, gafas de sol enormes y scooters gigantes. Una armadura excéntrica diseñada para ser inolvidable.'
  },
  {
    claves: ['scooter', 'récord', 'record', 'guinness', 'patinete', 'acrobacia', 'camión', 'camion'],
    respuesta: 'Entró al Libro Guinness con acrobacias absurdas: un scooter de más de 4 metros, la escultura humana de tazón más grande del mundo y un concierto sobre un monster truck gigante.'
  },
  {
    claves: ['película', 'pelicula', 'corto', 'documental', 'novela', 'cómic', 'comic', 'libro', 'obra', 'alien'],
    respuesta: 'Bajo el seudónimo Alien Boy dirigió cortometrajes y falsos documentales como «Alien Boy: The Movie». En 2021 publicó una novela gráfica con Z2 Comics sobre un viaje a Rusia contra la banda Little Big.'
  },
  {
    claves: ['oficial', 'redes', 'instagram', 'youtube', 'tiktok', 'página', 'pagina', 'twitter', 'facebook'],
    respuesta: 'Encontrarás su sitio web oficial y todas sus redes en el pie de página. Arriba, en «Videos destacados», puedes ver «Hurt», «Life Goes On» y «Miss You» sin salir de aquí.'
  }
];

function responder(pregunta) {
  const texto = pregunta.toLowerCase();
  const entrada = conocimiento.find((item) => item.claves.some((c) => texto.includes(c)));
  return entrada
    ? entrada.respuesta
    : 'Mmm, eso no está en mi repertorio 🤔. Prueba preguntarme por su discografía, su estética, sus récords Guinness o el accidente.';
}

function agregarMensaje(texto, autor) {
  const msg = document.createElement('p');
  msg.className = `msg ${autor}`;
  msg.textContent = texto;
  miniMensajes.append(msg);
  miniMensajes.scrollTop = miniMensajes.scrollHeight;
}

miniCerrar.addEventListener('click', () => { miniPanel.hidden = true; });

miniForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const pregunta = miniInput.value.trim();
  if (!pregunta) return;
  agregarMensaje(pregunta, 'usuario');
  miniInput.value = '';
  setTimeout(() => agregarMensaje(responder(pregunta), 'oliver'), 450);
});
