# Sistema de Manejo de Empleados

Sistema web desarrollado para la gestión de empleados y departamentos mediante una API REST y un frontend web.

## Tecnologías

* Python 3.14
* Django 6.1.1
* Django REST Framework 3.18.1
* SQLite
* HTML
* CSS
* JavaScript

## Funcionalidades

### Departamentos

* Listar departamentos.
* Crear departamentos.
* Editar departamentos.
* Eliminar departamentos.
* Validación de código único.
* Validación de nombre obligatorio.

### Empleados

* Listar empleados.
* Crear empleados.
* Editar empleados.
* Eliminar empleados.
* Asignar un departamento.
* Generación automática del código de empleado.
* Código con formato `EMP-0001`, `EMP-0002`, etc.
* Nombres y apellidos obligatorios.
* Departamento obligatorio.

## Estructura del proyecto

```text
employee-management-system/
├── backend/
│   ├── api/
│   ├── backend/
│   ├── departments/
│   ├── employees/
│   ├── manage.py
│   └── requirements.txt
├── docs/
│   ├── analisis.md
│   └── api.md
├── frontend/
│   ├── css/
│   ├── js/
│   ├── index.html
│   ├── departments.html
│   └── employees.html
├── analisis.MD
└── README.md
```

## Instalación

### 1. Clonar el repositorio

```bash
git clone git@github.com:Sebas16608/employee-management-system.git
cd employee-management-system
```

### 2. Crear el entorno virtual

Desde la raíz del proyecto:

```bash
python -m venv .venv
```

Activar el entorno virtual:

**Linux/macOS:**

```bash
source .venv/bin/activate
```

**Windows:**

```powershell
.venv\Scripts\activate
```

### 3. Instalar dependencias

Entrar al directorio del backend:

```bash
cd backend
```

Instalar las dependencias:

```bash
pip install -r requirements.txt
```

### 4. Ejecutar migraciones

```bash
python manage.py migrate
```

### 5. Iniciar el backend

```bash
python manage.py runserver
```

La API estará disponible en:

```text
http://127.0.0.1:8000/api/
```

El panel administrativo estará disponible en:

```text
http://127.0.0.1:8000/admin/
```

## Ejecutar el frontend

Desde la carpeta `frontend`:

```bash
cd ../frontend
python -m http.server 3000
```

Luego abrir:

```text
http://127.0.0.1:3000/
```

El frontend consume la API proporcionada por el backend.

## Documentación

### API

Documentación de los endpoints disponibles:

[Documentación de la API](docs/api.md)

### Análisis

Documento con el análisis del escenario de planificación y asistencia:

[Análisis](docs/analisis.md)

El archivo `analisis.MD` contiene el análisis solicitado específicamente para la prueba técnica.

## API

Los principales recursos disponibles son:

```text
/api/departments/
/api/employees/
```

Ambos recursos permiten realizar operaciones de consulta, creación, actualización y eliminación.

Para consultar los endpoints, parámetros y ejemplos:

[Ver documentación de la API](docs/api.md)

## Panel administrativo

Django Admin se encuentra disponible en:

```text
http://127.0.0.1:8000/admin/
```

Desde allí se pueden administrar los registros utilizando el panel administrativo de Django.

## Autor

Angel Sebastián Rodas Rodriguez
