# Layout Principal - CapitalPOS Web

## 1. Objetivo

Definir el diseño base del layout principal de CapitalPOS Web antes de crear componentes.

El layout debe ser moderno, profesional, responsive y orientado a un sistema ERP/POS comercial.

## 2. Estructura general

La aplicación tendrá una estructura tipo panel administrativo:

* Sidebar lateral.
* Topbar superior.
* Área principal de contenido.
* Breadcrumb.
* Área de usuario.
* Menú de módulos.
* Notificaciones.
* Accesos rápidos.

## 3. Layout desktop

En escritorio, el sistema usará una distribución amplia:

* Sidebar fijo a la izquierda.
* Topbar en la parte superior.
* Contenido principal a la derecha del sidebar.
* Breadcrumb debajo del topbar o dentro del header de página.
* Cards y tablas dentro del área principal.

Estructura visual:

Sidebar izquierdo
Topbar superior
Contenido principal
Footer opcional

## 4. Layout tablet

En tablet:

* Sidebar colapsable.
* Topbar fijo.
* Contenido adaptable.
* Tablas con scroll horizontal.
* Formularios en una o dos columnas según espacio.

## 5. Layout mobile

En mobile:

* Sidebar convertido en drawer.
* Menú accesible desde botón hamburguesa.
* Contenido en una columna.
* Formularios verticales.
* Acciones principales visibles.
* Tablas simplificadas o con scroll horizontal.

## 6. Sidebar

El sidebar será el menú principal del sistema.

Módulos iniciales:

* Dashboard.
* Facturación CPE.
* Ventas.
* Productos.
* Inventario.
* Compras.
* Caja.
* Reportes.
* Configuración.

Comportamiento:

* En desktop estará expandido.
* En tablet podrá colapsarse.
* En mobile se abrirá como drawer.
* Debe mostrar íconos y texto.
* Debe resaltar la opción activa.
* Debe permitir submenús en módulos grandes.

## 7. Topbar

El topbar tendrá:

* Botón para colapsar sidebar.
* Nombre de la pantalla actual.
* Buscador futuro.
* Notificaciones.
* Usuario actual.
* Acceso a perfil.
* Cerrar sesión.

## 8. Breadcrumb

El breadcrumb ayudará a ubicar al usuario dentro del sistema.

Ejemplos:

Dashboard
Facturación CPE > Emitir CPE
Inventario > Productos
Reportes > Ventas

## 9. Área principal de contenido

El contenido principal debe ser flexible y reutilizable.

Cada pantalla tendrá:

* Título.
* Descripción corta opcional.
* Acciones principales.
* Contenido en cards.
* Tablas o formularios según corresponda.
* Estados de carga, error y vacío.

## 10. Rutas base del layout

Rutas protegidas dentro del layout principal:

/app/dashboard
/app/cpe/emitir
/app/cpe/historial
/app/ventas
/app/productos
/app/inventario
/app/compras
/app/caja
/app/reportes
/app/configuracion

Ruta pública fuera del layout:

/auth/login

## 11. Componentes de layout previstos

layout/
shell/
sidebar/
topbar/
breadcrumb/
footer/

Componentes iniciales:

* ShellComponent.
* SidebarComponent.
* TopbarComponent.
* BreadcrumbComponent.

## 12. Responsabilidades

ShellComponent:

* Contener la estructura general.
* Renderizar sidebar, topbar y router outlet.
* Controlar estado visual del sidebar.

SidebarComponent:

* Mostrar menú principal.
* Resaltar ruta activa.
* Emitir acción de navegación.

TopbarComponent:

* Mostrar título.
* Botón de menú.
* Usuario.
* Notificaciones futuras.

BreadcrumbComponent:

* Mostrar ruta jerárquica.
* Actualizarse según navegación.

## 13. Estilo visual

El diseño debe sentirse como un sistema comercial serio.

Criterios:

* Limpio.
* Profesional.
* Responsive.
* Espaciado cómodo.
* Colores sobrios.
* Buen contraste.
* Preparado para trabajo diario.
* Sin apariencia de landing page.

Tema inicial:

* Fondo general gris claro.
* Cards blancas.
* Sidebar azul oscuro o gris oscuro.
* Color principal azul/indigo.
* Verde para éxito.
* Rojo para error.
* Ámbar para advertencia.
* Azul para información.

## 14. Librería UI

El layout será compatible con PrimeNG.

Se usarán componentes PrimeNG para:

* Menús.
* Botones.
* Cards.
* Toast.
* Dialogs.
* Tablas.
* Formularios.
* Dropdowns.

Sin embargo, el layout base tendrá estructura propia para mantener identidad visual CapitalPOS.

## 15. Reglas antes de implementar

Antes de crear componentes:

* El documento debe estar aprobado.
* La estructura de carpetas debe estar definida.
* El diseño responsive debe estar claro.
* Las rutas base deben estar aprobadas.
* El proyecto debe seguir estable.
* Se debe hacer build antes de commit.
* Se debe mantener GitHub sincronizado.

## 16. Fases de implementación del layout

Fase 2.1:

* Crear carpetas layout.
* Crear ShellComponent.
* Crear SidebarComponent.
* Crear TopbarComponent.
* Crear BreadcrumbComponent.

Fase 2.2:

* Configurar rutas protegidas bajo /app.
* Agregar router outlet dentro del shell.
* Crear página dashboard temporal.

Fase 2.3:

* Aplicar estilos SCSS del layout.
* Validar responsive básico.

Fase 2.4:

* Validar ng serve.
* Validar npm run build.
* Commit y push.
