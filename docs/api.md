# API REST

API REST desarrollada con Django REST Framework para la gestión de empleados y departamentos.

## Base URL

```text
http://localhost:8000/api/
```

## Departamentos

### Listar

```http
GET /api/departments/
```

Devuelve todos los departamentos registrados.

### Obtener uno

```http
GET /api/departments/<id>/
```

### Crear

```http
POST /api/departments/
Content-Type: application/json
```

```json
{
    "code": "DEP-001",
    "name": "Recursos Humanos",
    "description": "Departamento de recursos humanos"
}
```

`code` y `name` son obligatorios y el código debe ser único.

### Actualizar

```http
PATCH /api/departments/<id>/
Content-Type: application/json
```

```json
{
    "name": "Recursos Humanos"
}
```

### Eliminar

```http
DELETE /api/departments/<id>/
```

---

## Empleados

### Listar

```http
GET /api/employees/
```

Devuelve todos los empleados registrados junto con su departamento.

### Obtener uno

```http
GET /api/employees/<id>/
```

### Crear

```http
POST /api/employees/
Content-Type: application/json
```

```json
{
    "name": "Juan",
    "last_name": "Pérez",
    "birthdate": "2000-12-13",
    "department_id": 1
}
```

El código del empleado es generado automáticamente por el backend:

```text
EMP-0001
EMP-0002
EMP-0003
...
```

El cliente no debe enviar ni modificar este código.

`name`, `last_name` y `department_id` son obligatorios.

### Actualizar

```http
PATCH /api/employees/<id>/
Content-Type: application/json
```

```json
{
    "name": "Juan Carlos"
}
```

### Eliminar

```http
DELETE /api/employees/<id>/
```

---

## Respuestas HTTP principales

| Código | Descripción                       |
| ------ | --------------------------------- |
| `200`  | Operación realizada correctamente |
| `201`  | Registro creado correctamente     |
| `204`  | Registro eliminado correctamente  |
| `400`  | Datos enviados no válidos         |
| `404`  | Registro no encontrado            |

## Relaciones

Un empleado pertenece a un único departamento.

Para crear o actualizar un empleado se utiliza:

```json
{
    "department_id": 1
}
```

En las respuestas, el departamento se muestra como un objeto anidado.

```json
{
    "id": 1,
    "code": "EMP-0001",
    "name": "Juan",
    "last_name": "Pérez",
    "birthdate": "2000-12-13",
    "department": {
        "id": 1,
        "code": "DEP-001",
        "name": "Recursos Humanos",
        "description": "Departamento de recursos humanos"
    }
}
```

## Notas

* No se utiliza autenticación ni manejo de sesiones, de acuerdo con los requerimientos de la prueba.
* La API utiliza Django REST Framework mediante `APIView`.
* La base de datos utilizada actualmente es SQLite.
