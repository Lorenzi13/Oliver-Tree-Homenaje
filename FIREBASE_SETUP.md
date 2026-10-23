# Configuración de Firebase para la sección de comentarios

## ⚠️ Requisito previo: usar un servidor local

Firebase **no funciona abriendo `index.html` con doble clic** (protocolo `file://`).
Los módulos ES y Authentication requieren `http://localhost`. La forma más fácil:

1. Instala la extensión **Live Server** en VS Code.
2. Clic derecho en `index.html` → **"Open with Live Server"**.
3. La página se abrirá en algo como `http://127.0.0.1:5500`.

---

## Paso 1: Crear el proyecto Firebase

1. Ve a <https://console.firebase.google.com>.
2. **Agregar proyecto** → nombre (ej. `homenaje-oliver`) → puedes desactivar Google Analytics → **Crear**.

## Paso 2: Registrar la app web

1. En la página principal del proyecto, pulsa el icono web **`</>`**.
2. Escribe un alias (ej. `pagina-homenaje`) → **Registrar app**.
3. Copia los valores de `firebaseConfig` y pégalos en [script.js](script.js),
   sustituyendo los textos `PEGA_AQUI_...` / `TU_PROYECTO`.

> Nota: estos valores no son secretos; forman parte del código público del cliente.
> La seguridad real la dan las reglas de Firestore (paso 3) y la contraseña del admin (paso 4).

## Paso 3: Crear la base de datos Firestore

1. Menú **Compilación → Firestore Database** → **Crear base de datos**.
2. Elige la ubicación más cercana → **Comenzar en modo de producción**.
3. Ve a la pestaña **Reglas**, pega lo siguiente y pulsa **Publicar**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /comentarios/{comentarioId} {
      // Cualquier visitante puede leer los mensajes
      allow read: if true;

      // Cualquier visitante puede publicar, pero solo con los campos y límites permitidos
      allow create: if request.resource.data.keys().hasOnly(['nombre', 'mensaje', 'creado', 'reacciones'])
        && request.resource.data.nombre is string
        && request.resource.data.nombre.size() > 0
        && request.resource.data.nombre.size() <= 40
        && request.resource.data.mensaje is string
        && request.resource.data.mensaje.size() > 0
        && request.resource.data.mensaje.size() <= 280
        && request.resource.data.reacciones == 0;

      // Cualquiera puede sumar 1 al contador de reacciones, sin tocar otros campos
      // (get('reacciones', 0) cubre los mensajes antiguos que no tienen el campo)
      allow update: if request.resource.data.diff(resource.data).changedKeys().hasOnly(['reacciones'])
        && request.resource.data.reacciones == resource.data.get('reacciones', 0) + 1;

      // Solo el administrador autenticado puede eliminar
      allow delete: if request.auth != null;
    }
  }
}
```

Estas reglas son las que **garantizan de verdad** que solo tú puedes borrar mensajes:
aunque alguien manipule el JavaScript de la página, Firestore rechazará el borrado sin sesión.

## Paso 4: Crear el usuario administrador

1. Menú **Compilación → Authentication** → **Comenzar**.
2. En **Sign-in method**, activa **Correo electrónico/contraseña**.
3. Ve a la pestaña **Usuarios** → **Agregar usuario** → tu correo y una contraseña segura.

## Paso 5: Probar

1. Abre la página con Live Server.
2. Publica un mensaje: aparecerá al instante (y en cualquier otra ventana abierta).
3. Pulsa **"Acceso administrador"** (bajo la lista de mensajes), inicia sesión
   y verás el botón **Eliminar** en cada mensaje.

---

## Publicar la página con Firebase Hosting

Para mostrar tu trabajo en una URL pública (`https://oliver-tree-homenaje.web.app`):

### 1. Instala Node.js
Descarga el instalador **LTS** desde <https://nodejs.org> e instálalo con las opciones
por defecto. Cierra y vuelve a abrir la terminal de VS Code después de instalarlo.

### 2. Instala la CLI de Firebase y despliega
Los archivos `firebase.json` y `.firebaserc` ya están creados y apuntan a tu proyecto,
así que **no** necesitas `firebase init`. Solo ejecuta en la terminal de VS Code:

```powershell
npm install -g firebase-tools
firebase login    # se abre el navegador para entrar con tu cuenta de Google
firebase deploy   # sube la página
```

Al terminar, la consola mostrará tu URL pública: `https://oliver-tree-homenaje.web.app`

### 3. (Opcional) Indexar en Google
Con la página ya en internet, regístrala en <https://search.google.com/search-console>
→ **Añadir propiedad** → pega la URL. Google la indexará en horas o días.
