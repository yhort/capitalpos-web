# CapitalPOS Web — Instrucciones para Codex

## Proyecto

CapitalPOS Web es una aplicación comercial desarrollada con Angular.

Tecnologías y decisiones:

- Angular 22
- Componentes standalone
- TypeScript estricto
- Signals
- RxJS
- Lazy loading
- SCSS
- Arquitectura organizada por features
- Diseño responsive para desktop, tablet y móvil
- Backend independiente en ASP.NET Core
- Rama principal: main

## Metodología de trabajo

El usuario está aprendiendo Angular mientras desarrolla el sistema.

Trabajar solamente una tarea pequeña por vez.

Antes de modificar código:

1. Leer los documentos relacionados en Docs/.
2. Inspeccionar los archivos involucrados.
3. Ejecutar git status.
4. Confirmar que el repositorio esté limpio.
5. Explicar el problema que se resolverá.
6. Explicar el concepto de Angular que se utilizará.
7. Indicar qué archivos se modificarán y por qué.
8. Proponer un único cambio pequeño.
9. Esperar autorización del usuario antes de editar.

Después de modificar código:

1. Explicar cada cambio importante.
2. Explicar el flujo de funcionamiento.
3. Ejecutar npm run build.
4. Mostrar git status.
5. Mostrar git diff --stat.
6. Detenerse para que el usuario revise.

## Restricciones

- No hacer commit ni push sin autorización.
- No instalar dependencias sin autorización.
- No modificar archivos no relacionados con la tarea.
- No modificar el backend capitalpos-cpe-api.
- No implementar varias fases al mismo tiempo.
- No ocultar errores del build.
- No reemplazar código funcional sin explicar el motivo.
- Mantener la accesibilidad y el comportamiento responsive.
- Priorizar código claro y educativo.

## Interfaz

La UI se desarrolla progresivamente:

1. Base visual común.
2. UI funcional de cada módulo.
3. Estados de carga, error, vacío y éxito.
4. Responsive.
5. Pulido visual final.

No dejar toda la interfaz para el final.

## Git

Antes de iniciar:

git status

Después de modificar:

npm run build
git status
git diff --stat

Los commits deben tener mensajes claros en español.