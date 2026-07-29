# Add Save Comment Button

El usuario solicita un botón "Enviar" para la mensajería de respaldo (observaciones) de modo que el comentario se guarde en la auditoría sin necesidad de presionar "Hallazgo" o "Validar".

Actualmente, el comentario se guarda automáticamente al quitar el foco (`onBlur`), pero el usuario no lo percibe y siente que se queda "incrustado" sin enviarse a menos que cambie el estado.

## Cambios Propuestos
- Modificar `frontend/src/app/consolidados/[id]/page.tsx`
- En los componentes de `textarea` (diurno, nocturno, atrasos, viaticos, etc.), agregar un botón secundario "Guardar Nota" o "Enviar Comentario" justo debajo del `textarea`.
- Este botón llamará a `onObs(obs, sub)` y mostrará un pequeño feedback visual (como un toast o un texto "Guardado").

> [!NOTE]
> El texto debe seguir quedando incrustado en el cuadro de texto porque esa es la "Justificación" oficial del registro. Si lo borramos, el registro perderá su estado de observación (el ícono amarillo desaparecería). Le explicaré esto al usuario.
