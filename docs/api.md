# Documentación de API

## 1. Descripción

Esta API REST permite administrar dos recursos de una empresa: **departamentos** y **empleados**.

- Un **departamento** tiene un código único, un nombre y una descripción opcional.
- Un **empleado** pertenece a un departamento (relación obligatoria) y recibe un código interno
  generado automáticamente por el backend.

El objetivo de la API es-centralizar la información de la organización para poder listar, crear,
consultar, actualizar y eliminar departamentos y empleados desde cualquier cliente (por ejemplo, el
frontend incluido en este proyecto, que consume las mismas rutas).

---

## 2. Tecnologías

| Tecnología              | Versión / detalle                        |
| ----------------------- | ---------------------------------------- |
| Django                  | 6.1.1                                    |
| Django REST Framework   | 3.18.1                                   |
| Base de datos           | SQLite (`backend/db.sqlite3`)            |
| Estilo de vistas        | `APIView` (clases por recurso)           |
| Autenticación           | No existe (API abierta, sin sesiones)    |
| CORS                    | `django-cors-headers`, orígenes `localhost:3000` y `127.0.0.1:3000` |

No hay autenticación, tokens ni sesiones: cualquier cliente puede leer y escribir datos.

---

## 3. Base URL

El backend se sirve en el puerto `8000` (valor por defecto de `manage.py runserver`) y todas las
rutas de la API viven bajo el prefijo `/api/`:

```
http://localhost:8000/api/
```

Esta es la URL que usa el frontend del proyecto (`frontend/js/departments.js` y
`frontend/js/employees.js`).

| Recurso      | URL base                            |
| ------------ | ----------------------------------- |
| Departamentos| `http://localhost:8000/api/departments/` |
| Empleados    | `http://localhost:8000/api/employees/`     |

Notas sobre la URL:

- Todas las rutas terminan en **/** (barra final). Sin ella, Django responde `301 Moved Permanently`
  y redirige a la ruta con barra.
- El `pk` (identificador) siempre es un **número entero**. Un valor no numérico no coincide con la
  ruta y Django responde `404`.
- La raíz `http://localhost:8000/api/` no expone ningún recurso: responde `404`.
- Fuera de `/api/` solo existe el panel de administración de Django en `/admin/`.

Todos los cuerpos de request y response usan **JSON**. Content-Type esperado en las escrituras:
`application/json`.

---

## 4. Recursos disponibles

### 4.1 Departamento

| Campo         | Tipo   | Obligatorio | Descripción                              |
| ------------- | ------ | ----------- | ---------------------------------------- |
| `id`          | integer| No          | Generado por la base de datos. Solo lectura. |
| `code`        | string | **Sí**      | Código único del departamento (máx. 200 caracteres). |
| `name`        | string | **Sí**      | Nombre del departamento (máx. 200 caracteres). |
| `description` | string | No          | Descripción (texto). Si se omite, se guarda como `""`. |

Ejemplo de objeto departamento:

```json
{
  "id": 1,
  "code": "TI",
  "name": "Tecnología",
  "description": "Área técnica"
}
```

### 4.2 Empleado

| Campo          | Tipo    | Obligatorio | Descripción                                        |
| -------------- | ------- | ----------- | -------------------------------------------------- |
| `id`           | integer | No          | Generado por la base de datos. Solo lectura.       |
| `code`         | string  | No (en request) | **Generado automáticamente.** Solo lectura.    |
| `name`         | string  | **Sí**      | Nombre (máx. 50 caracteres).                       |
| `last_name`    | string  | **Sí**      | Apellido (máx. 50 caracteres).                     |
| `birthdate`    | string  | No          | Fecha de nacimiento en formato `YYYY-MM-DD`. Puede ser `null`. |
| `department`   | object  | No (en request) | Departamento completo anidado. **Solo lectura.** |
| `department_id`| integer | **Sí**      | ID del departamento. **Solo se usa para escribir.** |

Ejemplo de objeto empleado:

```json
{
  "id": 1,
  "code": "EMP-0001",
  "name": "Ana",
  "last_name": "Gómez",
  "birthdate": "1995-04-12",
  "department": {
    "id": 1,
    "code": "TI",
    "name": "Tecnología",
    "description": "Área técnica"
  }
}
```

`department_id` **nunca** aparece en las respuestas: la API siempre devuelve el departamento
anidado dentro de `department`.

---

## 5. API de Departamentos

Las rutas están definidas en `backend/departments/urls.py` y la lógica en
`backend/departments/views.py` (clase `DepartmentView`).

**No hay parámetros de query**: los listados no admiten paginación, orden ni filtros.

### 5.1 Listar departamentos

- **Método HTTP:** `GET`
- **URL:** `/api/departments/`
- **Descripción:** devuelve todos los departamentos ordenados por `id` y luego por `code`.

**Ejemplo de request:**

```bash
curl http://localhost:8000/api/departments/
```

**Ejemplo de response (200):**

```json
[
  {
    "id": 1,
    "code": "TI",
    "name": "Tecnología",
    "description": "Área técnica"
  },
  {
    "id": 2,
    "code": "RRHH",
    "name": "Recursos Humanos",
    "description": ""
  }
]
```

Si no hay departamentos, devuelve `200` con un arreglo vacío: `[]`.

**Códigos HTTP:** `200`.

---

### 5.2 Crear departamento

- **Método HTTP:** `POST`
- **URL:** `/api/departments/`
- **Descripción:** crea un departamento nuevo.

**Body esperado:**

| Campo         | Obligatorio | Notas                                     |
| ------------- | ----------- | ----------------------------------------- |
| `code`        | **Sí**      | Debe ser único. Máximo 200 caracteres. No puede ser vacío. |
| `name`        | **Sí**      | Máximo 200 caracteres. No puede ser vacío. |
| `description` | No          | Si se omite, se guarda como `""`. No puede ser `null`. |

**Ejemplo de request:**

```bash
curl -X POST http://localhost:8000/api/departments/ \
  -H "Content-Type: application/json" \
  -d '{"code": "TI", "name": "Tecnología", "description": "Área técnica"}'
```

**Ejemplo de response (201):**

```json
{
  "id": 1,
  "code": "TI",
  "name": "Tecnología",
  "description": "Área técnica"
}
```

La respuesta es el objeto creado, con el `id` asignado por la base de datos.

**Códigos HTTP:** `201` (creado), `400` (datos inválidos), `415` (Content-Type no soportado).

---

### 5.3 Obtener un departamento

- **Método HTTP:** `GET`
- **URL:** `/api/departments/{id}/`
- **Parámetros de path:** `id` (integer, obligatorio) — es el `id` del departamento.
- **Descripción:** devuelve un departamento por su identificador.

**Ejemplo de request:**

```bash
curl http://localhost:8000/api/departments/1/
```

**Ejemplo de response (200):**

```json
{
  "id": 1,
  "code": "TI",
  "name": "Tecnología",
  "description": "Área técnica"
}
```

**Códigos HTTP:** `200`, `404` (no existe).

---

### 5.4 Actualizar un departamento

- **Método HTTP:** `PATCH`
- **URL:** `/api/departments/{id}/`
- **Parámetros de path:** `id` (integer, obligatorio).
- **Descripción:** actualiza parcialmente un departamento. Solo se modifican los campos enviados;
  los demás quedan intactos. Un body vacío `{}` devuelve el departamento sin cambios.

**Body esperado:** cualquiera de los campos `code`, `name`, `description` (todos opcionales en
PATCH). Para dejar la descripción vacía, envíala como `""` (no como `null`).

**Ejemplo de request:**

```bash
curl -X PATCH http://localhost:8000/api/departments/1/ \
  -H "Content-Type: application/json" \
  -d '{"name": "Tecnología y Datos"}'
```

**Ejemplo de response (200):**

```json
{
  "id": 1,
  "code": "TI",
  "name": "Tecnología y Datos",
  "description": "Área técnica"
}
```

**Códigos HTTP:** `200`, `400` (datos inválidos), `404` (no existe).

> `PUT` no está implementado: devuelve `405 Method Not Allowed`. La actualización es solo `PATCH`.

---

### 5.5 Eliminar un departamento

- **Método HTTP:** `DELETE`
- **URL:** `/api/departments/{id}/`
- **Parámetros de path:** `id` (integer, obligatorio).
- **Descripción:** elimina el departamento. **No devuelve cuerpo**, solo el código `204`.

**Ejemplo de request:**

```bash
curl -X DELETE http://localhost:8000/api/departments/2/
```

**Ejemplo de response (204):** cuerpo vacío.

**Códigos HTTP:** `204` (eliminado), `404` (no existe), `500` (ver nota 10.2).

> **Importante:** un departamento que tiene empleados asociados **no se puede eliminar**. La
> relación usa `on_delete=PROTECT` y la vista no captura el error, por lo que la API responde
> `500 Internal Server Error`. Ver la sección [10.2](#102-un-departamento-con-empleados-no-se-puede-eliminar).

---

### 5.6 Validaciones del código único y campos obligatorios

Todo lo siguiente proviene de los modelos y serializers reales:

- **`code` es único.** Está definido como `unique=True` en el modelo `Department`
  (`backend/departments/models.py`). El serializer `ModelSerializer` de DRF convierte esa
  restricción en una validación automática.
- **`code` y `name` son obligatorios** al crear, y no pueden ser cadenas vacías.
- **`description` es opcional**, pero si se envía debe ser texto; `null` no se acepta.
- **Límites de longitud:** `code` y `name` hasta 200 caracteres.
- **`id` es de solo lectura:** se ignora cualquier `id` enviado por el cliente.
- En `PATCH` las validaciones se aplican **solo a los campos enviados**, porque la actualización es
  parcial.

Ejemplos de error real:

```json
// Código duplicado
{
  "code": ["Departamento with this code already exists."]
}
```

```json
// Faltan campos obligatorios
{
  "code": ["This field is required."],
  "name": ["This field is required."]
}
```

```json
// Campo obligatorio vacío
{
  "code": ["This field may not be blank."]
}
```

```json
// Longitud excedida
{
  "name": ["Ensure this field has no more than 200 characters."]
}
```

---

## 6. API de Empleados

Las rutas están definidas en `backend/employees/urls.py` y la lógica en
`backend/employees/views.py` (clase `EmployeeView`).

**No hay parámetros de query**: los listados no admiten paginación, orden ni filtros.

### 6.1 El código del empleado

El campo `code` **se genera automáticamente en el backend**. No se pide al cliente.

- **Formato:** `EMP-0001`, `EMP-0002`, `EMP-0003`, ... (prefijo `EMP-` + número de 4 dígitos con
  ceros a la izquierda).
- **Cómo se genera:** el modelo `Employee` sobrescribe el método `save()`
  (`backend/employees/models.py`). Cuando `code` viene vacío, dentro de una transacción toma el
  registro `EmployeeSequence` con `pk=1`, incrementa `last_number` y arma
  `f"EMP-{last_number:04d}"`.
- **Consecuencia práctica:** la numeración es **global y correlativa**. El primer empleado creado es
  `EMP-0001`, el segundo `EMP-0002`, y así sucesivamente. No se reinicia por departamento.
- **El cliente no puede enviarlo ni modificarlo.** El campo es `read_only` en el serializer
  (`read_only_fields = ["id", "code"]`) y además es `editable=False` en el modelo. Si se envía
  `code` en un POST o PATCH, **se ignora silenciosamente** y el backend asigna el siguiente código.
  La API no devuelve error por esto.

```json
// Request con "code" incluido -> el valor se descarta
{
  "code": "EMP-9999",
  "name": "Pedro",
  "last_name": "Soto",
  "department_id": 1
}
```

```json
// Response: el código generado por el backend, no el enviado
{
  "id": 3,
  "code": "EMP-0003",
  "name": "Pedro",
  "last_name": "Soto",
  "birthdate": null,
  "department": {
    "id": 1,
    "code": "TI",
    "name": "Tecnología",
    "description": "Área técnica"
  }
}
```

### 6.2 Cómo se asigna el departamento

- **Al escribir:** se envía **`department_id`** con el **id numérico** del departamento. Es un campo
  de solo escritura (`write_only`).
- **Al leer:** la API devuelve **`department`** con el **departamento completo anidado** (mismos
  campos que en la API de departamentos: `id`, `code`, `name`, `description`).
- Es obligatorio: todo empleado pertenece a exactamente un departamento.
- `department_id` acepta el valor como número o como string numérico (`"1"`), pero debe
  corresponder a un departamento existente.
- Enviar un objeto en `department` (por ejemplo `{"id": 1}`) **no funciona**: como `department` es
  de solo lectura, el backend ignora su contenido y responde `400` pidiendo `department_id`.

**Ejemplo de respuesta con el departamento anidado:**

```json
{
  "id": 1,
  "code": "EMP-0001",
  "name": "Ana",
  "last_name": "Gómez",
  "birthdate": "1995-04-12",
  "department": {
    "id": 1,
    "code": "TI",
    "name": "Tecnología",
    "description": "Área técnica"
  }
}
```

### 6.3 Listar empleados

- **Método HTTP:** `GET`
- **URL:** `/api/employees/`
- **Descripción:** devuelve todos los empleados, ordenados por `id` y luego por `code`, cada uno con
  su departamento anidado.

**Ejemplo de request:**

```bash
curl http://localhost:8000/api/employees/
```

**Ejemplo de response (200):**

```json
[
  {
    "id": 1,
    "code": "EMP-0001",
    "name": "Ana",
    "last_name": "Gómez",
    "birthdate": "1995-04-12",
    "department": {
      "id": 1,
      "code": "TI",
      "name": "Tecnología",
      "description": "Área técnica"
    }
  },
  {
    "id": 2,
    "code": "EMP-0002",
    "name": "Luis",
    "last_name": "Pérez",
    "birthdate": null,
    "department": {
      "id": 2,
      "code": "RRHH",
      "name": "Recursos Humanos",
      "description": ""
    }
  }
]
```

Si no hay empleados, devuelve `200` con un arreglo vacío: `[]`.

**Códigos HTTP:** `200`.

---

### 6.4 Crear empleado

- **Método HTTP:** `POST`
- **URL:** `/api/employees/`
- **Descripción:** crea un empleado. El `id` y el `code` los asigna el backend.

**Body esperado:**

| Campo           | Obligatorio | Notas                                                          |
| --------------- | ----------- | -------------------------------------------------------------- |
| `name`          | **Sí**      | Máximo 50 caracteres. No puede ser vacío.                      |
| `last_name`     | **Sí**      | Máximo 50 caracteres. No puede ser vacío.                      |
| `birthdate`     | No          | Fecha `YYYY-MM-DD`. Puede omitirse o enviarse como `null`.     |
| `department_id` | **Sí**      | ID de un departamento existente.                               |
| `id`            | No          | Solo lectura, se ignora.                                       |
| `code`          | No          | Solo lectura, se ignora (ver [6.1](#61-el-código-del-empleado)). |

**Ejemplo de request:**

```bash
curl -X POST http://localhost:8000/api/employees/ \
  -H "Content-Type: application/json" \
  -d '{"name": "Ana", "last_name": "Gómez", "birthdate": "1995-04-12", "department_id": 1}'
```

**Ejemplo de response (201):**

```json
{
  "id": 1,
  "code": "EMP-0001",
  "name": "Ana",
  "last_name": "Gómez",
  "birthdate": "1995-04-12",
  "department": {
    "id": 1,
    "code": "TI",
    "name": "Tecnología",
    "description": "Área técnica"
  }
}
```

**Códigos HTTP:** `201` (creado), `400` (datos inválidos), `415` (Content-Type no soportado).

---

### 6.5 Obtener un empleado

- **Método HTTP:** `GET`
- **URL:** `/api/employees/{id}/`
- **Parámetros de path:** `id` (integer, obligatorio) — es el `id` del empleado (no el `code`).
- **Descripción:** devuelve un empleado con su departamento anidado.

**Ejemplo de request:**

```bash
curl http://localhost:8000/api/employees/1/
```

**Ejemplo de response (200):** igual que el ejemplo de la sección 6.2.

**Códigos HTTP:** `200`, `404` (no existe).

---

### 6.6 Actualizar un empleado

- **Método HTTP:** `PATCH`
- **URL:** `/api/employees/{id}/`
- **Parámetros de path:** `id` (integer, obligatorio).
- **Descripción:** actualiza parcialmente un empleado. Solo se modifican los campos enviados.

**Body esperado:** cualquiera de `name`, `last_name`, `birthdate`, `department_id` (todos
opcionales en PATCH). Para cambiar de departamento se envía `department_id` con el nuevo id. Para
quitar la fecha de nacimiento se envía `"birthdate": null`. Enviar `code` no tiene ningún efecto.

**Ejemplo de request (cambiar el departamento):**

```bash
curl -X PATCH http://localhost:8000/api/employees/1/ \
  -H "Content-Type: application/json" \
  -d '{"department_id": 2}'
```

**Ejemplo de response (200):**

```json
{
  "id": 1,
  "code": "EMP-0001",
  "name": "Ana",
  "last_name": "Gómez",
  "birthdate": "1995-04-12",
  "department": {
    "id": 2,
    "code": "RRHH",
    "name": "Recursos Humanos",
    "description": ""
  }
}
```

> El `code` se mantiene igual (`EMP-0001`): cambiar de departamento no genera un código nuevo.

> `PUT` no está implementado: devuelve `405 Method Not Allowed`. La actualización es solo `PATCH`.

---

### 6.7 Eliminar un empleado

- **Método HTTP:** `DELETE`
- **URL:** `/api/employees/{id}/`
- **Parámetros de path:** `id` (integer, obligatorio).
- **Descripción:** elimina el empleado. **No devuelve cuerpo**, solo el código `204`.

**Ejemplo de request:**

```bash
curl -X DELETE http://localhost:8000/api/employees/1/
```

**Ejemplo de response (204):** cuerpo vacío.

**Códigos HTTP:** `204` (eliminado), `404` (no existe).

---

### 6.8 Campos obligatorios del empleado (resumen)

| Campo           | ¿Obligatorio en POST? | ¿Se puede enviar en PATCH? |
| --------------- | --------------------- | -------------------------- |
| `name`          | **Sí**                | Sí                         |
| `last_name`     | **Sí**                | Sí                         |
| `department_id` | **Sí**                | Sí (para reasignar)        |
| `birthdate`     | No                    | Sí (también `null`)        |
| `id`            | No                    | No                         |
| `code`          | No (se ignora)        | No (se ignora)             |
| `department`    | No (se ignora)        | No (se ignora)             |

---

## 7. Validaciones y errores

Todas las validaciones de esta API provienen de los serializers de DRF y de las restricciones de los
modelos. **Los mensajes de error los genera Django REST Framework**, no están escritos a mano en el
proyecto, por lo que se muestran en los idiomas de Django (los settings actuales usan
`en-us`, por eso aparecen en inglés).

### 7.1 Formato de los errores de validación (400)

Cuando hay errores de validación, el cuerpo es un **objeto JSON** donde cada clave es el campo con
error y el valor es una **lista de mensajes**:

```json
{
  "campo": ["mensaje de error"]
}
```

### 7.2 Formato del error de recurso no encontrado (404)

Cuando el recurso no existe, el backend responde un objeto con la clave `error`:

```json
{
  "error": "not found"
}
```

Nota: el texto difiere según la operación, porque en el código está escrito así —
`"not found"` en `GET` y `DELETE`, y `"Not found"` (con mayúscula) en `PATCH`. El cliente debe
tratar ambos textos como equivalentes.

### 7.3 Código de departamento duplicado

El `code` del departamento es único en la base de datos. Si se repite, el POST o PATCH responde
`400`:

```json
{
  "code": ["Departamento with this code already exists."]
}
```

Este mensaje lo genera DRF a partir de la restricción `unique=True` del modelo `Department`.

### 7.4 Campos obligatorios faltantes

`POST /api/departments/` con body `{}`:

```json
{
  "code": ["This field is required."],
  "name": ["This field is required."]
}
```

`POST /api/employees/` con body `{}`:

```json
{
  "name": ["This field is required."],
  "last_name": ["This field is required."],
  "department_id": ["This field is required."]
}
```

`POST /api/departments/` con `"code": ""`:

```json
{
  "code": ["This field may not be blank."]
}
```

### 7.5 Departamento inexistente

Al crear o actualizar un empleado con un `department_id` que no corresponde a ningún departamento,
el serializer responde `400` (no `404`, porque la validación ocurre en el serializer antes de tocar
la base de datos):

```json
{
  "department_id": ["Invalid pk \"999\" - object does not exist."]
}
```

También ocurre si se envía un objeto en `department` en vez de `department_id`:

```json
{
  "department_id": ["This field is required."]
}
```

### 7.6 Fecha de nacimiento con formato inválido

`birthdate` debe ir en formato `YYYY-MM-DD` (ISO 8601). Con otro formato:

```json
{
  "birthdate": ["Date has wrong format. Use one of these formats instead: YYYY-MM-DD."]
}
```

### 7.7 Longitudes máximas

```json
{
  "name": ["Ensure this field has no more than 50 characters."]
}
```

```json
{
  "name": ["Ensure this field has no more than 200 characters."]
}
```

### 7.8 Recurso no encontrado (404)

Departamento inexistente:

```bash
curl -i http://localhost:8000/api/departments/999/
```

```json
{
  "error": "not found"
}
```

Empleado inexistente:

```bash
curl -i http://localhost:8000/api/employees/999/
```

```json
{
  "error": "not found"
}
```

### 7.9 Content-Type no soportado (415)

Si el body no se envía como `application/json` (por ejemplo `text/plain`), DRF responde `415`:

```json
{
  "detail": "Unsupported media type \"text/plain\" in request."
}
```

### 7.10 Campos desconocidos

Los campos que no existen en el modelo **se ignoran silenciosamente**: no generan error. Por
ejemplo, enviar `"sueldo": 100` al crear un empleado devuelve `201` y el campo no aparece en la
respuesta.

### 7.11 Resumen de validaciones por recurso

| Validación                             | Recurso     | Resultado |
| -------------------------------------- | ----------- | --------- |
| `code` duplicado                       | Departamento | 400       |
| `code` / `name` vacíos                 | Departamento | 400       |
| `code` / `name` > 200 caracteres       | Departamento | 400       |
| `description` = `null`                 | Departamento | 400       |
| `name` / `last_name` vacíos            | Empleado    | 400       |
| `name` / `last_name` > 50 caracteres   | Empleado    | 400       |
| `birthdate` con formato incorrecto     | Empleado    | 400       |
| `department_id` faltante               | Empleado    | 400       |
| `department_id` inexistente            | Empleado    | 400       |
| Departamento inexistente en el path     | Ambos       | 404       |
| Empleado inexistente en el path         | Empleado    | 404       |
| Content-Type distinto de JSON          | Ambos       | 415       |
| `PUT` (no implementado)                | Ambos       | 405       |

---

## 8. Códigos HTTP

| Código | Significado                         | Cuándo ocurre                                                                 |
| ------ | ----------------------------------- | ----------------------------------------------------------------------------- |
| `200`  | OK                                 | Listar, obtener, actualizar correctamente. `PATCH` también responde `200`.     |
| `201`  | Created                            | Se creó correctamente un departamento o un empleado.                            |
| `204`  | No Content                         | Se eliminó correctamente. **La respuesta no tiene cuerpo.**                   |
| `301`  | Moved Permanently                  | Se llamó a la ruta sin la barra final (ej. `/api/departments`). Django redirige. |
| `400`  | Bad Request                        | Faltan campos obligatorios, hay duplicados, formato inválido o `department_id` inexistente. |
| `404`  | Not Found                          | El recurso del path no existe, o la ruta no está registrada.                   |
| `405`  | Method Not Allowed                 | Se usó `PUT` u otro método no implementado en la vista.                        |
| `415`  | Unsupported Media Type             | El body no se envió como `application/json`.                                   |
| `500`  | Internal Server Error              | Se intentó eliminar un departamento que tiene empleados asociados (ver 10.2).   |

---

## 9. Ejemplo de flujo

Flujo completo: crear un departamento, consultarlo, crear un empleado asignado a él y consultarlo.
Los nombres de campo son los reales del proyecto.

### Paso 1 — Crear un departamento

```bash
curl -X POST http://localhost:8000/api/departments/ \
  -H "Content-Type: application/json" \
  -d '{"code": "TI", "name": "Tecnología", "description": "Área técnica"}'
```

**Response (201):**

```json
{
  "id": 1,
  "code": "TI",
  "name": "Tecnología",
  "description": "Área técnica"
}
```

### Paso 2 — Consultar el departamento creado

```bash
curl http://localhost:8000/api/departments/1/
```

**Response (200):**

```json
{
  "id": 1,
  "code": "TI",
  "name": "Tecnología",
  "description": "Área técnica"
}
```

También se puede listar todo:

```bash
curl http://localhost:8000/api/departments/
```

```json
[
  {
    "id": 1,
    "code": "TI",
    "name": "Tecnología",
    "description": "Área técnica"
  }
]
```

### Paso 3 — Crear un empleado asignado a ese departamento

Se envía `department_id: 1`. **No se envía `code`**: lo genera el backend.

```bash
curl -X POST http://localhost:8000/api/employees/ \
  -H "Content-Type: application/json" \
  -d '{"name": "Ana", "last_name": "Gómez", "birthdate": "1995-04-12", "department_id": 1}'
```

**Response (201):**

```json
{
  "id": 1,
  "code": "EMP-0001",
  "name": "Ana",
  "last_name": "Gómez",
  "birthdate": "1995-04-12",
  "department": {
    "id": 1,
    "code": "TI",
    "name": "Tecnología",
    "description": "Área técnica"
  }
}
```

### Paso 4 — Consultar el empleado creado

```bash
curl http://localhost:8000/api/employees/1/
```

**Response (200):**

```json
{
  "id": 1,
  "code": "EMP-0001",
  "name": "Ana",
  "last_name": "Gómez",
  "birthdate": "1995-04-12",
  "department": {
    "id": 1,
    "code": "TI",
    "name": "Tecnología",
    "description": "Área técnica"
  }
}
```

Si se crearan más empleados, los códigos seguirían la secuencia: `EMP-0002`, `EMP-0003`, ...

---

## 10. Notas de implementación

### 10.1 La API es abierta

No hay autenticación, tokens ni sesiones (`django.contrib.auth` está instalado, pero DRF no tiene
configuradas clases de autenticación ni permisos en las vistas). Cualquiera que conozca la URL
puede leer, crear, modificar y eliminar datos. En un entorno real habría que agregar autenticación y
permisos.

### 10.2 Un departamento con empleados no se puede eliminar

La relación `Employee.department` usa `on_delete=models.PROTECT`. La vista `DELETE` de
departamentos llama a `department.delete()` sin envolverlo en un `try/except`, por lo que la
excepción `ProtectedError` de Django **no se maneja** y la API responde:

```
500 Internal Server Error
```

La respuesta es la **página de error de Django en HTML**, no JSON, porque `DEBUG = True` en
`backend/backend/settings.py`. Con `DEBUG = False` sería un `500` genérico, igualmente en HTML.

**Cómo evitarlo desde el cliente:** antes de eliminar un departamento, se debe comprobar que no tenga
empleados asociados. No existe un endpoint que devuelva los empleados de un departamento, así que
hay que consultarlos con `GET /api/employees/` y filtrar por `department.id` en el cliente.

### 10.3 La actualización es solo PATCH

Solo están definidos `GET`, `POST`, `PATCH` y `DELETE`. El método `PUT` devuelve `405 Method Not
Allowed`. Esto es coherente con el uso de `partial=True` en la actualización: los campos no
enviados se conservan.

Además, `PATCH` solo existe en las rutas con `id` (`/api/departments/{id}/`). La actualización no
existe sobre las rutas de listado.

### 10.4 El código del empleado es secuencial y global

El código se genera con un contador en la tabla `EmployeeSequence` (`last_number`), dentro de una
transacción (`transaction.atomic()`), lo que evita duplicados en la numeración. Como el contador es
único para toda la base de datos:

- La numeración **no se reinicia** por departamento ni por año.
- Los códigos **no se reutilizan** al eliminar empleados (el contador no baja).
- Cada empleado nuevo consume el siguiente número, sin importar en qué departamento esté.

### 10.5 Orden de los listados

Ambos modelos definen `ordering = ["id", "code"]`, así que los listados vienen ordenados por `id` y,
a igualdad de `id`, por `code`. No hay forma de cambiar el orden ni de paginar desde la API.

### 10.6 Sin filtros, búsqueda ni paginación

No hay parámetros de query soportados: no se puede filtrar, buscar, ordenar ni paginar. Los
listados devuelven **todos** los registros de una sola vez. Los query strings se ignoran (por
ejemplo `GET /api/employees/?name=Ana` devuelve la lista completa).

### 10.7 Sin endpoint raíz ni listado de recursos

`GET /api/` devuelve `404`: no hay un índice que muestre los recursos disponibles. Esta documento es
la referencia de las rutas.

### 10.8 Envío de datos: JSON o form-urlencoded

Aunque el estándar de la API es JSON, DRF también acepta `application/x-www-form-urlencoded` en los
POST. El frontend del proyecto usa JSON
(`Content-Type: application/json`).

### 10.9 CORS

`backend/backend/settings.py` habilita `django-cors-headers` únicamente para
`http://localhost:3000` y `http://127.0.0.1:3000` (el puerto del frontend en desarrollo). Un cliente
servido desde otro origen será bloqueado por el navegador.

### 10.10 La barra final es obligatoria

Todas las rutas terminan en `/`. Sin la barra, Django responde `301 Moved Permanently` y redirige.
Lo mismo aplica al `pk`: debe ser un entero, por lo que `GET /api/departments/abc/` devuelve `404`
de Django (página HTML), no el JSON de error de la API.

### 10.11 Estructura del proyecto

| Ruta                              | Responsabilidad                                        |
| --------------------------------- | ------------------------------------------------------ |
| `backend/api/urls.py`             | Incluye las rutas de `departments` y `employees` bajo `/api/`. |
| `backend/departments/models.py`   | Modelo `Department` y su unicidad de `code`.           |
| `backend/departments/serializers.py` | `DepartmentSerializer` (expone `id`, `code`, `name`, `description`). |
| `backend/departments/views.py`    | `DepartmentView` (GET, POST, PATCH, DELETE).            |
| `backend/departments/urls.py`     | Rutas `/api/departments/` y `/api/departments/<pk>/`.  |
| `backend/employees/models.py`     | Modelos `Employee` y `EmployeeSequence`; generación del código. |
| `backend/employees/serializers.py`| `EmployeeSerializer` (`code` de solo lectura, `department` anidado, `department_id` de escritura). |
| `backend/employees/views.py`      | `EmployeeView` (GET, POST, PATCH, DELETE).             |
| `backend/employees/urls.py`       | Rutas `/api/employees/` y `/api/employees/<pk>/`.      |

### 10.12 Observación sobre la vista de detalle

El patrón `GET` de ambas vistas resuelve el recurso **antes** de la serialización, mientras que
`POST` usa la variable local `serializer` y `PATCH`/`DELETE` resuelven el recurso por separado. Es
un detalle de implementación menor, pero explica por qué los mensajes 404 tienen textos ligeramente
distintos entre operaciones (ver [7.2](#72-formato-del-error-de-recurso-no-encontrado-404)).
