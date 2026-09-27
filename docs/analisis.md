# Análisis: ampliación de asistencia y planificación mensual

> **Estado de este documento:** propuesta de diseño. **Nada de lo descrito aquí está implementado
> todavía.** El sistema actual solo maneja departamentos y empleados (ver
> [api.md](api.md)). Este documento analiza qué habría que agregar para registrar la asistencia
> diaria y la planificación mensual de turnos.

---

## 1. Descripción del escenario

Hoy el sistema es un CRUD de **departamentos** y **empleados**. Cada empleado tiene un código
generado automáticamente (`EMP-0001`) y pertenece a un departamento obligatorio.

Ese modelo responde "¿quién es y en qué área trabaja?", pero no responde las preguntas que
aparece en la operación diaria de una empresa:

- ¿Quién asistió hoy? ¿Quién llegó tarde o faltó?
- ¿Cuántas horas trabajó cada persona este mes?
- ¿Cómo se Segura la cobertura de un área un sábado festivo?
- ¿Qué turnos se planificaron para el mes que viene?

La ampliación propuesta agrega dos módulos:

1. **Asistencia:** un registro por empleado por día, con su estado (presente, ausente, tarde,
   permiso) y sus horas de entrada y salida.
2. **Planificación mensual:** definición de turnos por empleado para cada mes, con estados de
   borrador y publicado, para poder cerrar la planilla del mes antes de que empiece.

Ambos módulos se apoyan en los empleados y departamentos que ya existen: la asistencia y la
planificación cuelgan de `Employee`, que a su vez cuelga de `Department`.

---

## 2. Objetivos

### Objetivos generales

- Registrar la asistencia diaria de los empleados de forma trazable.
- Poder planificar los turnos de cada empleado mes a mes.
- Permitir consultar indicadores de asistencia (días trabajados, ausencias, horas) por empleado y
  por mes.
- Evitar la carga manual repetitiva: un mismo tipo de turno se reutiliza, no se reescribe cada mes.

### Objetivos específicos

- Definir un modelo de datos que respete las convenciones ya usadas en el proyecto
  (`Employee`, `Department`, `related_name`, códigos autogenerados, orden por `id` y `code`).
- Mantener la coherencia con el patrón de la API actual: recursos REST con `APIView`, entrada y
  salida en JSON, y validación a través de serializers.
- Reutilizar la lógica de secuencias atómicas ya implementada para los códigos de empleado
  (`EmployeeSequence`) en lugar de inventar un mecanismo nuevo.
- Evitar la duplicación de datos: un turno se define una vez y se reutiliza en todos los meses.
- Permitir corregir la planificación mensual mientras esté en estado borrador, y bloquearla una
  vez publicada.

### Fuera de alcance (por ahora)

- Cálculo automático de planilla salaries.
- Dispositivos de marcación (huella, tarjeta, QR) o integración con biométricos.
- Notificaciones por correo o SMS.
- Reportes exportables a PDF o Excel.
- Control de vacaciones, permisos y/licencias médicas como módulo independiente.

---

## 3. Supuestos

Estos supuestos se hicieron para poder diseñar. **Si alguno es falso, el diseño cambia.** Los
preguntos abiertos derivados de ellos están en la sección 12.

| # | Supuesto | Impacto si es falso |
| - | -------- | ------------------- |
| 1 | La asistencia se registra por **día calendario**, no por turno ni por semana. | Si se necesita granularidad por turno, hay que agregar un modelo de turnos del día. |
| 2 | Un empleado tiene como máximo **un registro de asistencia por día**. | Si puede tener varios (por ejemplo, mañana y tarde), la unicidad sería `(empleado, día, turno)`. |
| 3 | La planificación se hace **mes a mes**, para todo el mes por adelantado. | Si se planifica por semanas, el modelo cambia a Periodicidad semanal. |
| 4 | Los turnos se definen como **catálogo reutilizable** (catálogo de turnos). | Si cada turno es único por día, no hace falta la entidad `Shift`. |
| 5 | Las horas se calculan a partir de la entrada y la salida registradas. | Si las horas vienen de un reloj externo, el cálculo no aplica. |
| 6 | La planificación se publica una vez al mes y luego queda congelada. | Si se revisa durante todo el mes, el estado publicado no sirve. |
| 7 | Los empleados **no** se dan de baja en el sistema; se eliminan. | Si habrá bajas históricas, hace falta `is_active` o borrado lógico (hoy no existe ese campo). |
| 8 | Las fechas se manejan en UTC, como está configurado en `backend/backend/settings.py` (`TIME_ZONE = "UTC"`, `USE_TZ = True`). | Si la empresa opera en otra zona horaria, hay que ajustar la configuración antes de calcular horas. |
| 9 | La zona horaria de la empresa es una sola para todos los empleados. | Si hay empleados en varias zonas, la fecha de asistencia se vuelve ambigua. |
| 10 | Un empleado con Department no puede eliminarse si tiene registros relacionados. | Hay que definir si se permite (y con qué se reemplazan) sus dependencias. |
| 11 | El volumen es bajo: cientos de empleados, pocos miles de registros de asistencia al mes. | Si el volumen crece, hacen falta paginación e índices adicionales. |
| 12 | Los estados de asistencia son un conjunto cerrado y conocido. | Si cada empresa tiene sus propios estados, conviene una entidad de catálogo. |

---

## 4. Modelo de datos propuesto

El modelo actual tiene dos entidades de negocio (`Department`, `Employee`) y una tabla técnica de
secuencia (`EmployeeSequence`). La ampliación propone tres entidades de negocio nuevas y reutilizar
la tabla de secuencias.

```
Department (existente)
    │ 1
    │
    │ N
Employee (existente) ──────────┐
    │ 1                        │
    │                          │ 1
    │ N                        │ N
Attendance (nueva)        MonthlyPlan (nueva) ── N ── ScheduleEntry (nueva) ── N ── Shift (nueva)
                                   │ 1
                                   │
                                   │ N
                                   └── Department (opcional, ámbito del plan)
```

Resumen:

| Entidad         | Rol                                              | ¿Nueva? |
| --------------- | ------------------------------------------------ | ------- |
| `Shift`         | Catálogo de turnos reutilizables                  | Sí      |
| `MonthlyPlan`   | Cabecera de la planificación de un mes            | Sí      |
| `ScheduleEntry` | Turno asignado a un empleado en un día del mes    | Sí      |
| `Attendance`    | Registro de asistencia de un empleado en un día   | Sí      |
| `Employee`      | Se reutiliza; se le agrega `is_active`           | Parcial |
| `CodeSequence`  | Generalización de `EmployeeSequence`              | Parcial |

---

## 5. Tablas propuestas

### 5.1 `Shift` — Catálogo de turnos

| Campo        | Tipo         | Restricciones                          | Descripción                          |
| ------------ | ------------ | -------------------------------------- | ------------------------------------ |
| `id`         | AutoField    | PK                                     | Identificador.                       |
| `code`       | CharField    | `max_length=200`, `unique=True`        | Código del turno (ej. `M1`).         |
| `name`       | CharField    | `max_length=200`                       | Nombre (ej. "Mañana").               |
| `start_time` | TimeField    | Obligatorio                            | Hora de inicio.                      |
| `end_time`   | TimeField    | Obligatorio                            | Hora de fin.                         |
| `duration`   | Decimal/Int  | Opcional, calculado                    | Horas de duración.                   |
| `is_active`  | BooleanField | `default=True`                         | Permite desactivar sin borrar.       |

Es una tabla de catálogo pequeña y estable. Se parece a `Department` en la forma: código único y
nombre.

### 5.2 `MonthlyPlan` — Cabecera de planificación mensual

| Campo          | Tipo         | Restricciones                          | Desc                                        |
| -------------- | ------------ | -------------------------------------- | ------------------------------------------ |
| `id`           | AutoField    | PK                                     | Identificador.                             |
| `code`         | CharField    | `max_length=200`, `unique=True`        | Código autogenerado (ej. `PLAN-2026-03`).  |
| `year`         | IntegerField | Obligatorio, 2020–2100                 | Año del plan.                              |
| `month`        | IntegerField | Obligatorio, 1–12                      | Mes del plan.                              |
| `department`   | FK           | `Department`, `null=True`, `on_delete=PROTECT` | Ámbito: un plan por departamento o general. |
| `status`       | CharField    | `choices`, `default="draft"`           | `draft`, `published`, `closed`.             |
| `created_at`   | DateTimeField| `auto_now_add=True`                    | Fecha de creación.                         |
| `published_at` | DateTimeField| `null=True`                            | Fecha de publicación.                      |

**Restricción de unicidad propuesta:** `unique_together = (("year", "month", "department"))` para
que no haya dos planes del mismo mes para el mismo ámbito.

### 5.3 `ScheduleEntry` — Turno asignado (detalle)

| Field          | Tipo         | Restricciones                          | Descripción                             |
| -------------- | ------------ | -------------------------------------- | --------------------------------------- |
| `id`           | AutoField    | PK                                     | Identificador.                          |
| `monthly_plan` | FK           | `MonthlyPlan`, `on_delete=CASCADE`     | Plan al que pertenece.                  |
| `employee`     | FK           | `Employee`, `on_delete=PROTECT`        | Empleado asignado.                      |
| `shift`        | FK           | `Shift`, `on_delete=PROTECT`           | Turno asignado.                         |
| `date`         | DateField    | Obligatorio                            | Fecha concreta dentro del mes.          |
| `notes`        | TextField    | `blank=True`                           | Observaciones.                          |
| `worked_hours` | DecimalField | Opcional                               | Horas realmente trabajadas.             |

**Restricción de unicidad propuesta:** `unique_together = (("monthly_plan", "employee", "date"))`
para impedir dos turnos del mismo empleado el mismo día dentro del mismo plan.

> Se usa la fecha concreta en lugar del "día del mes" para evitar el problema de los meses de 28, 29,
> 30 y 31 días, y para poder cruzar directamente contra la asistencia.

### 5.4 `Attendance` — Registro de asistencia diaria

| Campo            | Tipo          | Restricciones                          | Descripción                              |
| ---------------- | ------------- | -------------------------------------- | ---------------------------------------- |
| `id`             | AutoField     | PK                                     | Identificador.                           |
| `code`           | CharField     | `max_length=200`, `unique=True`        | Código autogenerado (ej. `ATT-0001`).    |
| `employee`       | FK            | `Employee`, `on_delete=PROTECT`        | Empleado.                                |
| `date`           | DateField     | Obligatorio                            | Día de la asistencia.                    |
| `status`         | CharField     | `choices`, `default="present"`         | Estado del día.                          |
| `check_in`       | TimeField     | `null=True`, `blank=True`              | Hora de entrada.                         |
| `check_out`      | TimeField     | `null=True`, `blank=True`              | Hora de salida.                          |
| `worked_hours`   | DecimalField  | Opcional, calculado                    | Horas calculadas.                        |
| `notes`          | TextField     | `blank=True`                           | Justificación (importante si es ausencia o permiso). |
| `recorded_by`    | FK            | `User`, `null=True`                    | Quién registró el movimiento.            |

**Restricción de unicidad propuesta:** `unique_together = (("employee", "date"))` — un empleado, un
registro por día.

### 5.5 Valores de `status` (asistencia)

| Valor          | Etiqueta          | Exige `check_in`/`check_out` | Exige `notes` |
| -------------- | ----------------- | ---------------------------- | ------------- |
| `present`      | Presente          | Sí                            | No            |
| `late`         | Tarde             | Sí                            | No            |
| `absent`       | Ausente           | No                            | Sí            |
| `permission`   | Permiso           | No                            | Sí            |
| `vacation`      | Vacaciones        | No                            | No            |
| `remote`       | Trabajo remoto    | Sí                            | No            |

### 5.6 Estados de `MonthlyPlan`

| Valor       | Etiqueta     | Qué permite                                          |
| ----------- | ------------ | ---------------------------------------------------- |
| `draft`     | Borrador     | Crear, editar y eliminar detalles libremente.        |
| `published` | Publicado    | Consultar. No se edita el detalle (ver reglas).      |
| `closed`    | Cerrado      | Solo consultar. Se usa al terminar el mes.            |

### 5.7 Cambios en tablas existentes

| Cambio                                        | Motivo                                                       |
| --------------------------------------------- | ------------------------------------------------------------ |
| `Employee.is_active` (BooleanField, `default=True`) | Poder dar de baja lógica sin perder el historial de asistencia. Hoy no existe y `Employee` no tiene ningún campo de estado. |
| `Employee.hire_date` (DateField, `null=True`) | Poder validar que la asistencia no anticipe la fecha de ingreso. |
| `CodeSequence` reemplaza a `EmployeeSequence`  | `EmployeeSequence` está atado a un solo modelo. Con tres entidades más que necesitan código, la tabla se generaliza. |

**Generalización propuesta de la secuencia:**

```python
class CodeSequence(models.Model):
    key = models.CharField(max_length=50, unique=True)      # "employee", "attendance", "monthly_plan"
    last_number = models.PositiveIntegerField(default=0)
```

Y cada modelo usaría una clave (`"employee"` → `EMP-0001`, `"attendance"` → `ATT-0001`), manteniendo
el patrón atómico ya implementado en `backend/employees/models.py`:

```python
with transaction.atomic():
    sequence, _ = CodeSequence.objects.get_or_create(key="attendance")
    sequence.last_number += 1
    sequence.save(update_fields=["last_number"])
    self.code = f"ATT-{sequence.last_number:04d}"
```

---

## 6. Relaciones entre entidades

| Origen           | Destino     | Tipo  | `on_delete` | `related_name`  | Nota                                        |
| ---------------- | ----------- | ----- | ----------- | --------------- | ------------------------------------------- |
| `Attendance`     | `Employee`  | N:1   | `PROTECT`   | `attendances`   | No se puede borrar un empleado con asistencia. |
| `ScheduleEntry`  | `Employee`  | N:1   | `PROTECT`   | `schedule_entries` | Ídem.                                   |
| `ScheduleEntry`  | `MonthlyPlan` | N:1 | `CASCADE`   | `entries`       | Si se borra un plan, se borran sus detalles. |
| `ScheduleEntry`  | `Shift`     | N:1   | `PROTECT`   | `schedule_entries` | No se puede borrar un turno usado.     |
| `MonthlyPlan`    | `Department`| N:1   | `PROTECT`   | `monthly_plans` | `null=True` permite planes generales.      |
| `Employee`       | `Department` | N:1   | `PROTECT`   | `employees`     | Ya existe en el sistema.                    |

**Decisión importante sobre `on_delete`.** El sistema ya usa `PROTECT` en
`Employee.department` y eso tiene una consecuencia concreta: `DELETE /api/departments/{id}/` sobre un
departamento con empleados devuelve **500 Internal Server Error** con una página HTML, porque la
vista no captura la `ProtectedError` (está documentado en [api.md](api.md), sección 10.2).

Con asistencia y planificación, `PROTECT` se vuelve un problema frecuente: casi todos los empleados
tendrán registros de asistencia, así que **casi ningún empleado podrá eliminarse**. Se propone:

- Mantener `PROTECT` (es correcto para no perder historial).
- Pero capturar la excepción en la vista y responder **`409 Conflict`** con un JSON que explique
  cuántos registros dependen del recurso, en lugar de dejar que se produzca un 500.

```python
try:
    employee.delete()
except ProtectedError:
    return Response(
        {"error": "El empleado tiene registros de asistencia asociados."},
        status=status.HTTP_409_CONFLICT,
    )
```

Además, para el caso de las bajas se propone `is_active` (baja lógica): el empleado deja de aparecer
en las listas activas, pero su historial de asistencia se conserva intacto.

---

## 7. Pantallas propuestas

El frontend actual tiene tres páginas estáticas (`index.html`, `departments.html`,
`employees.html`) con formularios y tablas construidas con JavaScript y `fetch`. Las pantallas
propuestas siguen ese mismo patrón.

### 7.1 `attendance.html` — Registro de asistencia diaria

- **Formulario de marcado** con los turnos del día ya planificados: una fila por empleado con
  fecha, entrada, salida y selector de estado.
- Permite marcar a **varios empleados a la vez** (pantalla de entrada masiva, que es el caso de uso
  real: marcar 40 personas en 2 minutos).
- Botones rápidos por estado: "Todos presentes", "Todos ausente".
- Tabla de la jornada con el estado de cada empleado.
- Indicador del día: cuántos presentes, cuántos ausentes, cuántos pendientes.

### 7.2 `attendance-report.html` — Reporte mensual

- Selector de mes y de departamento.
- Tabla por empleado: días trabajados, días ausente, días de permiso, horas totales.
- Exportación a CSV (fuera del alcance actual, pero se deja como ampliación).

### 7.3 `schedule.html` — Planificación mensual

- Selector de mes y año, y de departamento.
- Vista de calendario del mes (días en columnas o filas, según el tamaño de pantalla).
- Cada celda muestra el turno del empleado; se puede asignar con un clic desde un catálogo de turnos.
- Colores por turno y por estado del plan.
- Botón **"Publicar plan"**, que bloquea la edición y valida que no queden días sin cubrir.
- Vista de **días sin cobertura** (los días que ningún turno cubre).

### 7.4 `shifts.html` — Catálogo de turnos

- Alta, edición y desactivación de turnos (`M1`, `T1`, `N1`...).
- Muestra código, nombre, hora de inicio y hora de fin.
- Los turnos con uso en planificaciones no se pueden borrar, solo desactivar.

### 7.5 Cambios en la navegación existente

`index.html` pasaría a tener cuatro secciones: Empleados, Departamentos, Asistencia y Planificación.
Se agregaría el enlace a Turnos dentro de Planificación.

---

## 8. Procesos

### Proceso 1: Definir el catálogo de turnos

1. El usuario entra a la pantalla de turnos.
2. Crea un turno con código, nombre, hora de inicio y hora de fin.
3. El sistema lo guarda y queda disponible para asignar.

### Proceso 2: Crear y publicar la planificación del mes

1. El usuario elige mes, año y departamento.
2. El sistema crea un plan en estado **borrador** (o reutiliza el existente si ya está en borrador).
3. El usuario asigna turnos día por día a cada empleado.
4. El sistema valida en cada asignación:
   - El empleado no puede tener dos turnos el mismo día.
   - No se puede asignar a un empleado inactivo.
5. El usuario revisa los días sin cobertura.
6. Pulsa **Publicar**. El sistema valida que no queden empates sin cubrir (o avisa).
7. El plan pasa a **publicado** y ya no se puede editar el detalle.

### Proceso 3: Registrar la asistencia de un día

1. El usuario abre la pantalla de asistencia con la fecha del día.
2. El sistema carga los turnos planificados para esa fecha.
3. El usuario marca entrada, salida y estado para cada empleado.
4. El sistema calcula las horas trabajadas y guarda un registro por empleado y día.
5. Si el empleado no tiene turno planificado, se puede registrar igual, lo que genera un aviso.

### Proceso 4: Corregir un registro de asistencia

1. El usuario busca el registro (por fecha y empleado).
2. Se abre en modo edición.
3. El sistema valida que la fecha no sea futura (ver reglas de negocio) y que las horas sean
   coherentes.
4. Se guarda el cambio.

### Proceso 5: Dar de baja a un empleado

1. El usuario marca `is_active = False` en lugar de eliminarlo.
2. El sistema deja de ofrecerlo en los formularios de planificación.
3. Su historial de asistencia y planificación se conserva.
4. Los planes ya publicados que lo tenían asignado se pueden marcar con un aviso de "empleado
   inactivo".

### Proceso 6: Cierre de mes

1. Se genera el reporte del mes.
2. El plan pasa a estado **cerrado**.
3. Los registros de asistencia de ese mes quedan bloqueados para edición (o requieren un permiso
   especial).

---

## 9. Reglas de negocio

### Assistencia

| # | Regla |
| - | ----- |
| R1 | Un empleado no puede tener más de un registro de asistencia por día. |
| R2 | El estado `present`, `late` y `remote` exige `check_in` y `check_out`. |
| R3 | Los estados `absent` y `permission` exigen `notes` (justificación) y no llevan horas. |
| R4 | `check_out` debe ser posterior a `check_in`. Si el turno cruza la medianoche, se documenta el caso aparte. |
| R5 | Las horas trabajadas se calculan como `check_out - check_in` menos el descanso acordado, y no pueden ser negativas. |
| R6 | No se puede registrar asistencia en una fecha futura. |
| R7 | No se puede registrar asistencia en una fecha anterior a la fecha de ingreso del empleado. |
| R8 | Solo se puede editar la asistencia de un mes que no esté cerrado. |
| R9 | Un empleado inactivo (`is_active = False`) no puede tener asistencia nueva. |
| R10 | El código de asistencia es único y lo genera el sistema con el formato `ATT-0001`. |

### Planificación mensual

| # | Regla |
| - | ----- |
| R11 | Solo puede existir un plan por (año, mes, departamento), incluyendo el caso `department = null` para planes generales. |
| R12 | Un plan en estado `draft` se puede modificar; en `published` y `closed` no. |
| R13 | Un empleado no puede tener dos turnos el mismo día dentro del mismo plan. |
| R14 | No se puede asignar turno a un empleado inactivo. |
| R15 | Un turno inactivo no se puede asignar a nuevos días. |
| R16 | No se puede modificar un plan de un mes que ya está cerrado. |
| R17 | Publicar un plan exige que todos los días laborables tengan cobertura, o un aviso explícito si se publica con faltantes. |
| R18 | El código del plan es único y lo genera el sistema, con el formato `PLAN-{YYYY}-{MM}`. |

### Integridad de datos

| # | Regla |
| - | ----- |
| R19 | No se puede eliminar un empleado, un turno o un departamento que tenga registros de asistencia o planificación asociados. La API debe responder `409`, no `500`. |
| R20 | Los registros históricos nunca se borran en cascada: se usan bajas lógicas. |
| R21 | El código de cada entidad es único y de solo lectura para el cliente, igual que `EMP-0001`. |

---

## 10. Flujo general

```
                    ┌──────────────────────────┐
                    │  Catálogo de turnos      │
                    │  (M1, T1, N1, ...)      │
                    └────────────┬─────────────┘
                                 │ se reutiliza
                                 v
┌──────────────┐  ┐   ┌────────────────────────┐    ┌──────────────────────┐
│ Departamentos│──▶│──▶│  Planificación mensual │───▶│  Plan publicado      │
└──────────────┘   │   │  (borrador → publicado)│    │  (mes cerrado)       │
                   │   └───────────┬────────────┘    └──────────┬───────────┘
┌──────────────┐   │               │                            │
│  Empleados   │───┘               │ genera los turnos          │ se contrasta con
└──────┬───────┘                   │ del mes                    │
       │                           v                            │
       │                ┌──────────────────────┐                 │
       │                │  Registro de la      │◀────────────────┘
       │                │  asistencia diaria   │
       │                └──────────┬───────────┘
       │                           │
       │                           ▼
       │                ┌──────────────────────┐
       │                │  Reporte mensual     │
       │                │  días, ausencias,    │
       │                │  horas               │
       │                └──────────────────────┘
       │
       └──▶ (is_active = False para baja lógica, conservando historial)
```

**Resumen del flujo:** se definen los turnos una vez → se planifica el mes por departamento → se
publica el plan → se registra la asistencia real comparando con lo planificado → se genera el reporte
del mes → el plan se cierra y los datos quedan como histórico.

---

## 11. Consideraciones técnicas

### 11.1 Sigue el patrón existente

La ampliación debe respetar lo que ya funciona:

- **Vistas con `APIView`**, no con `ViewSet` ni `ModelViewSet`, para mantener la coherencia con
  `DepartmentView` y `EmployeeView`.
- **Serializers `ModelSerializer`** como fuente de las validaciones, sin `validate()` manuales para
  lo que DRF ya resuelve.
- **Rutas bajo `/api/`**, agregadas en `backend/api/urls.py`, que hoy solo incluye
  `departments.urls` y `employees.urls`.
- **Departamento anidado en las respuestas** y `department_id` para escribir, igual que en
  `EmployeeSerializer`.

### 11.2 Endpoints propuestos

| Método   | URL                                | Descripción                              |
| -------- | ---------------------------------- | ---------------------------------------- |
| `GET`    | `/api/shifts/`                     | Listar turnos                            |
| `POST`   | `/api/shifts/`                     | Crear turno                              |
| `GET`    | `/api/shifts/{id}/`                | Obtener turno                            |
| `PATCH`  | `/api/shifts/{id}/`                | Actualizar turno                         |
| `DELETE` | `/api/shifts/{id}/`                | Eliminar turno                           |
| `GET`    | `/api/monthly-plans/`              | Listar planes (filtro por año/mes/depto) |
| `POST`   | `/api/monthly-plans/`              | Crear plan en borrador                   |
| `GET`    | `/api/monthly-plans/{id}/`         | Obtener plan con su detalle              |
| `PATCH`  | `/api/monthly-plans/{id}/`         | Actualizar estado o datos del plan       |
| `POST`   | `/api/monthly-plans/{id}/publish/` | Publicar el plan                         |
| `POST`   | `/api/monthly-plans/{id}/close/`   | Cerrar el mes                            |
| `GET`    | `/api/schedule-entries/`           | Listar turnos asignados                  |
| `POST`   | `/api/schedule-entries/`           | Asignar un turno                         |
| `PATCH`  | `/api/schedule-entries/{id}/`      | Actualizar asignación                    |
| `DELETE` | `/api/schedule-entries/{id}/`      | Eliminar asignación                      |
| `GET`    | `/api/attendances/`                | Listar asistencia (filtro por mes/depto) |
| `POST`   | `/api/attendances/`                | Registrar asistencia (individual o masiva) |
| `GET`    | `/api/attendances/{id}/`           | Obtener registro                         |
| `PATCH`  | `/api/attendances/{id}/`           | Corregir registro                        |
| `DELETE` | `/api/attendances/{id}/`           | Eliminar registro                        |
| `GET`    | `/api/attendance-reports/monthly/` | Reporte mensual                          |

Las acciones de publicar y cerrar no encajan en el CRUD estándar. Se proponen como endpoints
separados con `POST` porque son transiciones de estado, no actualizaciones de campos.

### 11.3 Paginación y volumen

Hoy la API **no tiene paginación**: los listados devuelven todos los registros de una vez. Ese
patrón no sirve para la asistencia: un mes de 40 empleados son 40 filas, pero un año son casi
12.000. Sin paginación, ese listado se vuelve lento y pesado.

Lo más simple y consistente con lo actual es usar `LimitOffsetPagination` de DRF solo en los
endpoints nuevos, sin romper el comportamiento de los existentes. El frontend actualtendría que
adaptarse a la forma paginada (`{"count": ..., "results": [...]}`), lo que implica un cambio
visible en `departments.js` y `employees.js` si se aplica a los listados antiguos.

Alternativa: traer los datos del mes ya filtrados por servidor, que es el caso de uso real
(la pantalla de asistencia siempre pide un mes), y reservar la paginación para los reportes.

### 11.4 Validaciones de negocio en serializer vs. vista

Hay dos tipos de validación y conviene no mezclarlas:

- **En el serializer** (DRF las resuelve y devuelve `400` con el mensaje por campo): unicidad,
  campos obligatorios, formato de fecha, rangos, `unique_together`.
- **En la vista** (lógica del proceso): transiciones de estado válidas, "el plan está publicado",
  "el mes está cerrado", "el empleado está inactivo".

Ejemplo de validación en serializer:

```python
class AttendanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attendance
        fields = ["id", "code", "employee", "date", "status", "check_in", "check_out", "notes"]
        read_only_fields = ["id", "code"]

    def validate(self, attrs):
        status_ = attrs.get("status")
        if status_ in ("present", "late", "remote"):
            if not attrs.get("check_in") or not attrs.get("check_out"):
                raise serializers.ValidationError(
                    {"check_in": "Este estado requiere hora de entrada y de salida."}
                )
        if status_ in ("absent", "permission") and not attrs.get("notes"):
            raise serializers.ValidationError(
                {"notes": "Este estado requiere justificación."}
            )
        return attrs
```

### 11.5 Operación masiva de asistencia

Marcar la asistencia de 40 personas con 40 requests es ineficiente. Se propone un endpoint de
escritura masiva que recibe el plan del día completo en una sola llamada, y que usa
`transaction.atomic()` para que se guarde todo o nada:

```json
[
  { "employee": 1, "date": "2026-03-02", "status": "present", "check_in": "08:00", "check_out": "17:00" },
  { "employee": 2, "date": "2026-03-02", "status": "absent", "notes": "Permiso médico" }
]
```

Esto se aparta del CRUD simple actual, pero es el caso de uso dominante.

### 11.6 Zona horaria

`TIME_ZONE = "UTC"` y `USE_TZ = True` en `backend/backend/settings.py`. Como la asistencia se
registra por día con horas locales de la empresa, hay que decidir si las horas se guardan en hora
local o en UTC. La opción más simple para un prototipo es guardar la hora local y documentarlo
claramente; lo correcto a futuro es definir la zona horaria de la empresa y convertir.

### 11.7 Autenticación

Hoy la API es completamente abierta (ver [api.md](api.md), sección 10.1). El registro de asistencia
es información sensible de personas. Antes de producción hace falta autenticación y, sobre todo,
**un campo en el registro que diga quién hizo el movimiento** (`recorded_by`). Sin eso, cualquier
consulta al reporte sería indistinguible de una modification real.

### 11.8 Código de cada entidad

Se propone mantener el formato del sistema actual:

| Entidad        | Formato          | Secuencia        |
| -------------- | ---------------- | ---------------- |
| `Employee`     | `EMP-0001`       | `"employee"`     |
| `Attendance`   | `ATT-0001`       | `"attendance"`   |
| `MonthlyPlan`  | `PLAN-2026-03`   | `"year_month"`   |
| `Shift`        | Definido por el usuario (ej. `M1`) | Ninguna |

`Shift` es la excepción: su código lo elige el usuario porque es corto y legible en el calendario.

---

## 12. Validaciones

### 12.1 Validaciones a nivel de modelo

| Validación                             | Campo / Modelo       | Mensaje esperado                                |
| -------------------------------------- | -------------------- | ----------------------------------------------- |
| Código de asistencia único             | `Attendance.code`    | Código repetido                                 |
| Código de plan único                   | `MonthlyPlan.code`   | Código repetido                                 |
| Código de turno único                  | `Shift.code`         | Código repetido                                 |
| Un registro por empleado y día         | `Attendance`         | Ya existe asistencia para ese empleado y fecha  |
| Un turno por empleado y día en el plan | `ScheduleEntry`      | El empleado ya tiene un turno ese día            |
| Un plan por mes y departamento         | `MonthlyPlan`        | Ya existe un plan para ese mes y departamento    |
| Turno presente y válido                | `Attendance.status`  | Estado inválido                                 |
| Año y mes en rango                     | `MonthlyPlan`        | Mes debe estar entre 1 y 12                     |

### 12.2 Validaciones a nivel de serializer

| Validación                                    | Campo       | Respuesta                                    |
| --------------------------------------------- | ----------- | -------------------------------------------- |
| Obligatorios presentes                        | todos       | `400` con `"This field is required."`         |
| Longitudes máximas                            | textos      | `400` con `"Ensure this field has no more than N characters."` |
| Formato de fecha `YYYY-MM-DD`                 | `date`      | `400` con `"Date has wrong format. Use one of these formats instead: YYYY-MM-DD."` |
| Estados `present`/`late`/`remote` con horas   | `check_in`  | `400` indicando que faltan las horas         |
| Estados `absent`/`permission` con `notes`    | `notes`     | `400` indicando que falta la justificación   |
| `check_out` posterior a `check_in`            | `check_in`  | `400` indicando que la salida es anterior    |
| No se puede registrar en el futuro           | `date`      | `400` indicando que la fecha es futura       |
| No se puede editar un mes cerrado             | `date`      | `400` o `409` indicando que el mes está cerrado |

### 12.3 Validaciones a nivel de vista

| Validación                          | Condición                                | Respuesta sugerida |
| ----------------------------------- | ---------------------------------------- | ------------------ |
| Plan publicado no editable          | `status != "draft"` en un `PATCH` o `DELETE` de detalles | `409 Conflict` |
| Mes cerrado no editable             | `status == "closed"`                    | `409 Conflict`     |
| Empleado inactivo                   | `employee.is_active == False`           | `400 Bad Request`  |
| Turno inactivo                      | `shift.is_active == False`              | `400 Bad Request`  |
| Cobertura incompleta al publicar    | Días laborables sin turno asignado      | `400 Bad Request` con el detalle de los días faltantes |
| Dependencias al eliminar            | Registros de asistencia asociados       | `409 Conflict`     |

### 12.4 Validación de datos ya existente que conviene reutilizar

- `Department.code` es único y el mensaje ya se conoce: `"Departamento with this code already
  exists."`. Los mensajes los genera DRF automáticamente según `LANGUAGE_CODE = "en-us"`, así que
  todos los mensajes de validación **aparecerán en inglés** aunque la interfaz esté en español.
- `Employee.name` y `Employee.last_name` tienen máximo 50 caracteres, igual que se propone para los
  nuevos campos de texto corto.

---

## 13. Preguntas pendientes

Estas preguntas **no tienen respuesta con la información disponible** y deberían aclararse antes de
empezar a implementar.

### Sobre el negocio

1. ¿La asistencia se necesita por **día** o por **turno**? Si es por turno, un empleado puede
   tener dos registros el mismo día.
2. ¿Se necesita justificar las ausencias con un documento adjunto? Si sí, hay que decidir dónde se
   guardan los archivos.
3. ¿Los días **no laborables** (fines de semana, feriados) se registran de alguna forma, o
   directamente no existen en el sistema?
4. ¿La planificación se hace **por departamento** o **por empleado**? El modelo propuesto permite
   ambas, pero hay que definir cuál es el flujo principal.
5. ¿Se necesita calcular **horas extra** o **nocturnidad**? Si sí, hay que agregar reglas de cálculo
   que el prototipo no contempla.
6. ¿Quién puede editar la asistencia de otro? Hace falta definir roles (por ejemplo: el empleado
   ve su propia asistencia, un jefe de departamento ve la de su área, un administrador ve todas).
7. ¿Los reportes deben considerar el mes **calendario** o un ciclo de nómina distinto?

### Sobre el modelo de datos actual

8. ¿Se puede modificar el modelo `Employee` para agregar `is_active` y `hire_date`, o hay que
   cumplir un modelo de datos fijo? Depende de la ampliación permitida en la prueba.
9. ¿Se puede reemplazar `EmployeeSequence` por una tabla `CodeSequence` genérica, o es
   obligatorio mantener el modelo actual tal como está?
10. ¿Existe una definición de "festivo" o "calendario laboral"? Sin ella, la validación de
    cobertura y los días no laborables quedan sin apoyo.
11. ¿La empresa opera en una sola zona horaria? Con `TIME_ZONE = "UTC"` las horas de entrada y
    salida hay que interpretarlas con cuidado.

### Sobre la operación

12. ¿La entrada y salida se marcan en una terminal compartida o cada persona las marca desde su
    dispositivo? Cambia la necesidad de `recorded_by` y de autenticación.
13. ¿Se necesita carga masiva por archivo (CSV)? Es común en el primer día de uso.
14. ¿Quién es responsable de cerrar el mes, y puede reabrir un mes cerrado?

### Sobre el alcance de la prueba

15. ¿La ampliación espera un diseño escrito, una implementación parcial, o ambos? El alcance
    determinable.

---

## 14. Posibles ampliaciones futuras

Ordenadas de menor a mayor complejidad.

### Corto plazo

- **Reportes y exportación a CSV** de asistencia mensual por departamento.
- **Dashboard** con indicadores: porcentaje de asistencia, ausencias del mes, horas totales.
- **Calendario de feriados** como tabla de configuración, para no contar esos días como ausencias.
- **Búsqueda y filtros** en los listados (por nombre, por código, por rango de fechas).
- **Paginación** en todos los listados.

### Medio plazo

- **Notificaciones por correo** al empleado cuando se registra una ausencia o un permiso.
- **Permisos y vacaciones** como módulo propio, con sus días aprobados que se descuentes
  automáticamente de la asistencia.
- **Justificaciones con archivo adjunto** (constancia médica, permiso firmado).
- **Roles y permisos** reales sobre la API, reemplazando el acceso abierto actual.
- **Auditoría**: quién creó y quién modificó cada registro de asistencia.

### Largo plazo

- **Integración con reloj de marcación** (API REST del dispositivo o importación de archivos).
- **Cálculo de planilla** a partir de la asistencia y los turnos.
- **Aplicación móvil** para marcar entrada y salida.
- **Planificación anual** con patrón recurrente, que se genere automáticamente cada mes a partir
  de una plantilla.
- **Tablero de análisis de rotación de turnos** y detección automática de conflictos de cobertura.
- **Reportes de cumplimiento** y auditorías internas.

---

## 15. Conclusión

La ampliación es viable y encaja con el diseño actual sin necesidad de rehacerlo. El sistema ya tiene
la base correcta: empleados con código autogenerado, relación con departamentos protegida y una API
REST con `APIView` y serializers que validan de forma automática.

**Lo más importante que aporta este análisis son tres hallazgos sobre el estado actual:**

1. **El modelo `Employee` no tiene ningún campo de estado ni de fecha.** No se sabe si un empleado
   está activo ni cuándo ingresó. Para asistencia, `is_active` y `hire_date` son indispensables
   (reglas R7 y R9). Es el cambio más urgente.

2. **`on_delete=PROTECT` va a provocar errores frecuentes.** Con asistencia, casi ningún empleado
   podrá eliminarse y el `500` que hoy se devuelve al borrar un departamento con empleados
   (documentado en [api.md](api.md), sección 10.2) se repetiría en cada caso. Hay que capturar la
   `ProtectedError` y responder `409`, tanto en el código actual como en el nuevo.

3. **La secuencia de códigos está atada a un solo modelo.** `EmployeeSequence` funciona, pero con
   tres entidades más que necesitan código conviene generalizarla a `CodeSequence` con clave, en
   lugar de crear tres tablas casi idénticas.

**Sobre el diseño propuesto:** el modelo de `Attendance` con unicidad `(empleado, fecha)` es
simple y encaja con el caso de uso real. La separación entre `MonthlyPlan` (cabecera del mes) y
`ScheduleEntry` (turno por día) permite bloquear el mes una vez publicado sin perder el historial,
y el catálogo `Shift` evita reescribir los turnos cada mes.

**Lo que falta decidir** son las 15 preguntas de la sección 13, y en particular las seis primeras,
porque definen el modelo de datos. Antes de escribir la primera migración conviene resolver, como
mínimo: si la asistencia es por día o por turno, si se permite dar de baja a los empleados, y quién
puede editar la asistencia de cada persona.

Como última consideración: hoy la API es completamente abierta y el registro de asistencia es
dato personal sensible. Agregar asistencia sin autenticación aumenta el riesgo, por lo que
conviene tratar la autenticación como parte del alcance y no como una mejora futura.
