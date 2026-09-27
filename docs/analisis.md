# Análisis de ampliación del sistema

## 1. Situación actual

Actualmente el sistema permite administrar **empleados y departamentos** mediante una API REST. Cada empleado pertenece a un departamento y cuenta con un código generado automáticamente.

La propuesta es ampliar el sistema para agregar:

* **Asistencia:** registrar la asistencia diaria de cada empleado.
* **Planificación mensual:** definir los turnos de los empleados para cada mes.

## 2. Asistencia

Se propone crear un modelo `Attendance` relacionado con `Employee`.

Cada registro tendría información como:

* Empleado.
* Fecha.
* Estado: presente, ausente, tarde o permiso.
* Hora de entrada y salida.
* Observaciones.

Se debe evitar que un empleado tenga más de un registro de asistencia para la misma fecha.

Para registrar la asistencia de varias personas al mismo tiempo se puede utilizar una operación masiva dentro de `transaction.atomic()`, de forma que todos los registros se guarden correctamente o ninguno se guarde.

## 3. Planificación mensual

La planificación se dividiría en:

* `Shift`: catálogo de turnos disponibles.
* `MonthlyPlan`: representa la planificación de un mes.
* `ScheduleEntry`: relaciona a cada empleado con un turno y una fecha.

El plan podría tener estados como `draft`, `published` y `closed`. Mientras esté en borrador puede modificarse; una vez publicado, se limita la edición para conservar el historial.

## 4. Relaciones

Las nuevas entidades se relacionarían principalmente con `Employee`.

Se mantendría `PROTECT` para evitar eliminar empleados o turnos que ya tengan información histórica asociada. Sin embargo, actualmente el sistema no maneja correctamente `ProtectedError`, por lo que debería convertirse en una respuesta HTTP `409 Conflict` en lugar de provocar un `500`.

También sería conveniente agregar `is_active` a `Employee` para poder dar de baja a un empleado sin eliminar su historial.

## 5. Códigos

El sistema actual utiliza una secuencia para generar códigos de empleados.

Como las nuevas entidades también necesitan códigos, se puede generalizar esta lógica mediante `CodeSequence`, utilizando diferentes claves:

```python
with transaction.atomic():
    sequence, _ = CodeSequence.objects.get_or_create(
        key="attendance"
    )
    sequence.last_number += 1
    sequence.save(update_fields=["last_number"])

    self.code = f"ATT-{sequence.last_number:04d}"
```

De esta forma se mantiene el mismo mecanismo que ya utiliza el sistema.

## 6. API

La nueva funcionalidad seguiría el patrón existente:

* `APIView`.
* Serializers de Django REST Framework.
* Respuestas JSON.
* Validaciones en los serializers.
* Lógica de negocio en las vistas.

También sería conveniente utilizar `select_related()` al consultar relaciones como `Employee → Department`, para obtener los datos relacionados de forma eficiente y evitar consultas innecesarias.

## 7. Consideraciones

Antes de implementar completamente la ampliación todavía deben definirse algunos aspectos, principalmente:

* Cómo se manejarán las bajas de empleados.
* Quién podrá modificar la asistencia.
* Cómo se manejarán las zonas horarias.
* Qué usuarios tendrán acceso a la información.

Además, la API actualmente no tiene autenticación, por lo que antes de utilizar información de asistencia en producción debería implementarse control de acceso.

## 8. Conclusión

La ampliación puede realizarse sobre la estructura actual sin rehacer el sistema. Los principales cambios son agregar los modelos de asistencia y planificación, reutilizar la lógica existente de códigos y mejorar el manejo de relaciones protegidas.

La prioridad es mantener la estructura sencilla y reutilizar los patrones que ya existen en el proyecto.
