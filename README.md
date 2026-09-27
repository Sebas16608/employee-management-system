# Sistema de manejo de empleados

Sistema web para administrar los departamentos de una empresa y los empleados que pertenecen a
cada uno. El backend expone una API REST y el frontend es una interfaz web sencilla que la consume.

Cada empleado recibe un código único generado automáticamente por el backend (`EMP-0001`,
`EMP-0002`, ...) y pertenece a un departamento, que no puede quedar sin asignar.

## Características

- **Gestión de departamentos:** alta, consulta, edición y eliminación de departamentos.
- **CRUD de departamentos:** cada departamento tiene código único, nombre y descripción opcional.
- **Gestión de empleados:** alta, consulta, edición y eliminación de empleados.
- **CRUD de empleados:** cada empleado tiene nombre, apellido y fecha de nacimiento opcional.
- **Asignación de empleados a departamentos:** un empleado pertenece a un departamento y solo a uno.
- **Generación automática del código de empleado:** el backend asigna el código `EMP-0001`,
  `EMP-0002`, etc., de forma correlativa y con una secuencia atómica. El cliente no puede elegirlo.
- **API REST:** diez endpoints (cinco por recurso) que devuelven JSON.
- **Frontend separado:** interfaz en HTML, CSS y JavaScript, sin framework ni proceso de compilación.
- **Validaciones en el backend y en el frontend:** el backend valida y devuelve `400` con el detalle
  por campo; el frontend marca los campos obligatorios con `required` y controla el flujo de la
  aplicación.
- **Restricción de integridad:** no se puede eliminar un departamento que tenga empleados asociados.

## Tecnologías

| Tecnología             | Versión    |
| ---------------------- | ---------- |
| Django                 | 6.1.1      |
| Django REST Framework  | 3.18.1     |
| SQLite                 | —          |
| HTML                   | —          |
| CSS                    | —          |
| JavaScript             | —          |

Complemento usado por el proyecto: `django-cors-headers` 4.9.0, que habilita el acceso al backend
desde el frontend en desarrollo.

## Estructura del proyecto

```
employee-management-system/
├── backend/                 # API REST (Django + DRF)
│   ├── manage.py
│   ├── requirements.txt
│   ├── backend/             # Configuración del proyecto (settings.py, urls.py)
│   ├── api/                 # Rutas de la API bajo /api/
│   ├── departments/         # App de departamentos (modelo, serializer, vista, urls)
│   └── employees/           # App de empleados (modelo, serializer, vista, urls)
│
├── frontend/                # Interfaz web estática
│   ├── index.html           # Página de inicio
│   ├── departments.html     # CRUD de departamentos
│   ├── employees.html       # CRUD de empleados
│   ├── css/styles.css
│   └── js/                  # departments.js, employees.js
│
└── docs/                    # Documentación del proyecto
    ├── api.md               # Documentación de la API REST
    └── analisis.md          # Análisis de la ampliación de asistencia
```

Las carpetas principales:

- **`backend/`**: toda la lógica del servidor. Cada app (`departments`, `employees`) sigue la misma
  estructura: `models.py` (datos), `serializers.py` (validación y formato JSON), `views.py` (lógica
  de los endpoints), `urls.py` (rutas) y `migrations/` (historial de cambios de la base de datos).
- **`frontend/`**: tres páginas HTML con su CSS y su JavaScript. No hay `package.json`, ni build,
  ni dependencias de JavaScript: se sirve tal cual.
- **`docs/`**: la documentación técnica.

## Documentación

- [Documentación de la API REST](docs/api.md) — endpoints, ejemplos de request y response,
  validaciones y códigos HTTP.
- [Análisis de la ampliación de asistencia](docs/analisis.md) — propuesta de diseño para registrar
  asistencia diaria y planificación mensual de turnos.

## Requisitos previos

- **Python 3.12 o superior.** Django 6.1.1 requiere `>= 3.12`. El proyecto se desarrolló con
  Python 3.14.7.
- **pip**, incluido con Python, para instalar las dependencias de `backend/requirements.txt`.
- **Un navegador web** moderno (Chrome, Firefox, Safari o Edge).
- **Git**, solo si se va a clonar el repositorio.

**No se necesita Node.js ni npm.** El frontend son archivos HTML, CSS y JavaScript estáticos, sin
`package.json` ni proceso de compilación.

## Instalación

### 1. Clonar el repositorio

```bash
git clone git@github.com:Sebas16608/employee-management-system.git
cd employee-management-system
```

### 2. Backend

Entrar al directorio `backend`:

```bash
cd backend
```

Crear el entorno virtual:

```bash
python3 -m venv .venv
```

Activar el entorno virtual:

```bash
source .venv/bin/activate
```

Instalar las dependencias:

```bash
pip install -r requirements.txt
```

Ejecutar las migraciones para crear la base de datos SQLite:

```bash
python manage.py migrate
```

Iniciar el servidor de desarrollo:

```bash
python manage.py runserver
```

El backend queda disponible en `http://localhost:8000/`. El comando queda ejecutándose en primer
plano; para detenerlo se pulsa `Ctrl + C`.

> Las migraciones ya están versionadas en el repositorio, por lo que no hace falta ejecutar
> `makemigrations`. La base de datos `backend/db.sqlite3` se crea sola al aplicar las migraciones y
> está incluida en `.gitignore`.

#### Usuario para el panel de administración (opcional)

El panel de Django registra los modelos `Department` y `Employee`. Para poder entrar se crea un
superusuario:

```bash
python manage.py createsuperuser
```

### 3. Frontend

El frontend es estático y **no tiene proceso de compilación**. Basta con servir la carpeta
`frontend/` con cualquier servidor de archivos estáticos. El puerto debe ser el **3000**, porque es
el único origen permitido por la configuración de CORS del backend
(`CORS_ALLOWED_ORIGINS` en `backend/backend/settings.py`).

Desde la raíz del proyecto, en una terminal aparte:

```bash
cd frontend
python3 -m http.server 3000
```

Si el frontend se sirve con otro puerto u otro origen, el navegador bloqueará las peticiones a la
API por CORS y habría que actualizar `CORS_ALLOWED_ORIGINS` en `backend/backend/settings.py`.

### 4. Acceso

Con el backend y el frontend levantados:

| Componente      | URL                                    |
| --------------- | -------------------------------------- |
| Frontend        | `http://localhost:3000`                |
| API             | `http://localhost:8000/api/`           |
| Departamentos   | `http://localhost:8000/api/departments/` |
| Empleados       | `http://localhost:8000/api/employees/`  |
| Admin de Django | `http://localhost:8000/admin/`          |

> La API no tiene autenticación: se puede entrar y usar sin iniciar sesión. El panel de
> administración sí requiere el superusuario del paso 2.

## Uso

1. **Crear un departamento.** En `http://localhost:3000/departments.html`, completa el formulario
   con código, nombre y descripción, y pulsa **Guardar**. El departamento aparece en la tabla con su
   `id` asignado.
2. **Crear un empleado.** En `http://localhost:3000/employees.html`, completa nombre, apellido y, si
   corresponde, la fecha de nacimiento.
3. **Asignarle un departamento.** El selector **Departamento** de la pantalla de empleados se llena
   solo con los departamentos creados en el paso 1. Elige uno y pulsa **Guardar**. El empleado se
   crea con el código `EMP-0001` asignado por el backend y aparece en la tabla con su departamento.
4. **Editar registros.** Con el botón **Editar** de la fila, el formulario se llena con los datos
   actuales; al guardar se envía un `PATCH` y solo se modifican los campos enviados. El mismo
   proceso sirve para departamentos y para empleados.
5. **Eliminar registros.** Con el botón **Eliminar** de la fila. En el caso de los empleados el
   borrado es directo; en el de los departamentos, si tiene empleados asociados, el backend lo
   rechaza porque la integridad de los datos está protegida.

También se puede consumir la API directamente; la referencia completa está en
[docs/api.md](docs/api.md).

## API

La referencia completa de la API está en **[docs/api.md](docs/api.md)**. Incluye los diez
endpoints, los cuerpos de request y response de cada uno, las validaciones, los códigos HTTP y un
ejemplo de flujo completo.

Resumen de las rutas:

| Método   | URL                    | Descripción                    |
| -------- | ---------------------- | ------------------------------ |
| `GET`    | `/api/departments/`    | Listar departamentos           |
| `POST`   | `/api/departments/`    | Crear departamento             |
| `GET`    | `/api/departments/{id}/` | Obtener departamento         |
| `PATCH`  | `/api/departments/{id}/` | Actualizar departamento      |
| `DELETE` | `/api/departments/{id}/` | Eliminar departamento        |
| `GET`    | `/api/employees/`      | Listar empleados               |
| `POST`   | `/api/employees/`      | Crear empleado                 |
| `GET`    | `/api/employees/{id}/` | Obtener empleado               |
| `PATCH`  | `/api/employees/{id}/` | Actualizar empleado            |
| `DELETE` | `/api/employees/{id}/` | Eliminar empleado              |

## Análisis

En **[docs/analisis.md](docs/analisis.md)** se analiza la ampliación del sistema con dos módulos:
registro de asistencia diaria y planificación mensual de turnos. Contiene el modelo de datos
propuesto, las tablas y sus relaciones, las pantallas, los procesos, las reglas de negocio, las
validaciones y las preguntas que quedan pendientes de resolver antes de implementar.

Es un documento de diseño: describe lo que **se propone** agregar, no funcionalidad ya existente.

## Decisiones técnicas

- **Django REST Framework como base de la API.** Aporta la serialización a JSON, las
  validaciones automáticas a partir de los modelos y las respuestas de error por campo, sin escribir
  la lógica a mano.
- **Vistas con `APIView` en lugar de `ViewSet`.** Cada recurso tiene una vista con los métodos
  `GET`, `POST`, `PATCH` y `DELETE` explícitos. Es más verboso que un `ViewSet`, pero deja el
  control de cada operación a la vista.
- **`PATCH` en lugar de `PUT`.** La actualización es parcial: el cliente envía solo lo que cambia.
  `PUT` no está implementado y devuelve `405`.
- **SQLite para el prototipo.** Cero configuración y el archivo de la base de datos viaja en el
  propio proyecto, suficiente para desarrollo. Para producción habría que migrar a otro motor.
- **Código de empleado autogenerado con una secuencia atómica.** El modelo `Employee` sobrescribe
  `save()` y usa una tabla `EmployeeSequence` con `transaction.atomic()`, lo que garantiza que dos
  empleados simultáneos no obtengan el mismo código. El campo es de solo lectura para el cliente.
- **Departamento anidado en las respuestas.** El empleado devuelve el departamento completo dentro
  de `department` y acepta solo el `department_id` al escribir, de modo que el cliente nunca tiene
  que hacer una segunda consulta para mostrar el área del empleado.
- **Separación entre frontend y backend.** El frontend no contiene lógica de negocio: se limita a
  recopilar datos y a mostrarlos, y toda la validación real ocurre en el backend.
- **CORS limitado a `localhost:3000`.** Configurado de forma explícita en lugar de permitir
  cualquier origen.

## Autor

**Sebas16608** — ([github.com/Sebas16608](https://github.com/Sebas16608))

Proyecto desarrollado como práctica de gestión de empleados con Django y Django REST Framework.
