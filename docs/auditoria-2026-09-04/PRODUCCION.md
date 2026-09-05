# Publicación verificada — 5 de septiembre de 2026

La actualización está publicada en **[Recetario](https://recetario-app-self.vercel.app)**.

- Proyecto Vercel: `recetario-app`.
- Despliegue promovido: `dpl_ChFEbmaYvn6pc1V5MBWstdpgcjYb`.
- Proyecto Supabase: `snyelpbcfbzaxadrtxpa`.
- **10 migraciones aplicadas y verificadas en el historial del servidor**: las 6 previstas y 4 adicionales derivadas de la validación real.
- Site URL corregida desde localhost al dominio publicado; `/auth/callback` y `/auth/reset-password` autorizados.

## Qué apareció al probar el servidor real

La copia del esquema de producción se restauró en un PostgreSQL 17 aislado, sin copiar datos de las familias. Se validaron las migraciones y se ejecutó allí el contrato de alta e invitación antes de aplicar las correcciones pertinentes.

1. Producción guarda `home_employees.work_days` como JSONB y no tenía el antiguo trigger de membresía. El alta ahora adapta ese campo y crea explícitamente la membresía de administrador dentro de la transacción.
2. Políticas permisivas antiguas permitían leer recetas de cualquier hogar y asignarse una membresía. Se agregaron **38 políticas restrictivas de pertenencia**, restricciones para modificar membresías y validación del actor al crear propuestas.
3. Las invitaciones carecían de `is_active`, referenciaban al usuario antiguo y devolvían un rol varchar donde el contrato exigía text. Se corrigieron esas diferencias y se bloquea la fila al consumir el código.
4. Un trigger de auditoría intentaba actualizar un campo inexistente. Se agregó `updated_at`; la prueba posterior confirmó que se registra la ejecución y que “Deshacer” restaura realmente el inventario.
5. La interfaz interpretaba cualquier respuesta de aceptación como éxito y trataba de seleccionar el hogar usando membresías anteriores. Ahora comprueba el resultado y selecciona el destino desde las membresías recién cargadas. Se alineó el permiso de inventario de familia con la compra de productos.

## Comprobaciones realizadas

Se crearon **dos cuentas reales temporales en Supabase Auth y dos hogares de prueba**. No se enviaron correos ni se usaron contraseñas de miembros de la familia.

- Inicio de sesión en el sitio publicado y conservación del destino.
- Alta atómica, preferencias, espacios y empleado.
- Receta privada: el otro hogar y una sesión anónima no pueden leerla; se rechaza modificarla desde otro hogar.
- Rechazo de referencias cruzadas de inventario, membresías autoasignadas y suplantación del actor de una propuesta.
- Permisos de familia y empleado: inventario permitido; edición de recetas bloqueada al empleado.
- Invitación aceptada desde el navegador; queda seleccionado el hogar al que se ingresó.
- Publicación explícita de una receta y revocación comprobada: el contenido deja de mostrarse.
- Aprobación y ejecución real de una propuesta de inventario; reversión y valor restaurado comprobados en la base.
- Compra sin conexión con el worker publicado: dos operaciones conservadas y sincronizadas al recuperar la red.
- APIs privadas rechazan con 401 un identificador de usuario falso sin sesión; callback sin código vuelve de forma controlada al acceso.

Las dos cuentas, sus perfiles, los dos hogares y sus datos dependientes se eliminaron al terminar. La evidencia de limpieza está en `verificacion-produccion/cleanup.json`.

## Resultado técnico y alcance

- **461 pruebas pasaron; 8 omitidas; 33 archivos**, incluidos 9 contratos SQL de regresión.
- Compilación de producción en Vercel correcta; versión promovida al dominio público.
- Revisión SQL: **0 hallazgos en 10 migraciones**.
- Lint: **0 errores y 185 advertencias de mantenimiento**.
- Los recorridos de navegador registrados no tuvieron excepciones de ejecución.

Estas verificaciones cubren los flujos descritos. No se hizo una prueba de entrega de correo a un buzón personal ni una prueba exhaustiva de todas las respuestas de proveedores de IA. La configuración del callback sí se leyó nuevamente desde Supabase y el acceso se probó con autenticación real. No se habilitaron pagos, WhatsApp ni nuevos recordatorios automáticos.

La evidencia está en [verificacion-produccion](verificacion-produccion/). La publicación y su validación se realizaron con Vercel CLI antes del commit y del push a GitHub, sin ampliaciones de los workflows.
