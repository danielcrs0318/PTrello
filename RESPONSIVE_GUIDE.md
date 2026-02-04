# Guía de Diseño Responsive - SprintFlow

## Breakpoints Implementados

La aplicación sigue un enfoque **mobile-first** con los siguientes breakpoints basados en Tailwind CSS:

### Tamaños de Pantalla

| Dispositivo | Ancho | Clase Tailwind | Ejemplo de Dispositivos |
|------------|-------|----------------|------------------------|
| **Mobile Small** | 360px - 640px | (default) | iPhone SE, Galaxy S8 |
| **Mobile Standard** | 390px - 640px | (default) | iPhone 12/13/14, Pixel 5 |
| **Tablet** | 768px - 1024px | `sm:` | iPad, Galaxy Tab |
| **Desktop Small** | 1024px - 1366px | `md:` | Laptops pequeños |
| **Desktop Large** | 1366px - 1920px | `lg:`, `xl:` | Monitores estándar |

### Breakpoints de Tailwind CSS

```css
sm: 640px   /* Tablet pequeña */
md: 768px   /* Tablet */
lg: 1024px  /* Desktop pequeño */
xl: 1280px  /* Desktop grande */
2xl: 1536px /* Pantallas muy grandes */
```

## Componentes Responsive

### 1. Dashboard (`Dashboard.jsx`)

**Mobile (360px-640px)**:
- Navbar compacto con iconos más pequeños
- Botón "Crear" solo muestra icono en móvil
- Búsqueda con padding reducido
- Footer con texto xs
- Grid de tableros en 1 columna

**Tablet (768px-1024px)**:
- Botón "Crear" muestra texto completo
- Grid de tableros en 2-3 columnas
- Espaciado más generoso

**Desktop (1366px+)**:
- Grid de tableros en 3-4 columnas
- Todos los elementos visibles
- Espaciado completo

### 2. BoardPage (`BoardPage.jsx`)

**Mobile**:
- Título del tablero truncado (max 150px)
- Botones de editar/eliminar ocultos
- Solo iconos esenciales visibles
- Botón compartir oculto
- Columnas ocupan todo el ancho

**Tablet**:
- Botones de edición visibles
- Nombre del tablero sin truncar
- Columnas de 272px

**Desktop**:
- Todos los controles visibles
- Botón "Compartir" con texto
- Columnas de 280-300px

### 3. BoardView (`BoardView.jsx`)

**Comportamiento**:
- Mobile: Scroll horizontal para columnas
- Columnas apiladas con ancho completo en mobile
- Gap reducido entre columnas en mobile (8px vs 12px)

### 4. Column (`Column.jsx`)

**Anchos responsivos**:
```jsx
w-full sm:w-[272px] md:w-[280px] lg:w-[300px]
```

**Mobile**: Ancho completo
**Tablet**: 272px
**Desktop**: 280-300px

### 5. TaskModal (`TaskModal.jsx`)

**Mobile**:
- Modal en pantalla completa (`fullScreen`)
- Padding reducido
- Título más pequeño (1.1rem)

**Desktop**:
- Modal de tamaño medio (`maxWidth: sm`)
- Padding estándar
- Título normal (1.25rem)

### 6. LoginScreen (`LoginScreen.jsx`)

Ya implementado con:
- Layout centrado responsive
- Formularios con max-width
- Botones adaptables
- Textos escalables

## Patrones de Diseño Responsive

### Espaciado Progresivo

```jsx
// Padding
px-2 sm:px-4 md:px-6

// Margen
mb-4 sm:mb-6 md:mb-8

// Gap
gap-2 sm:gap-3 md:gap-4
```

### Tamaños de Texto

```jsx
// Títulos
text-base sm:text-lg md:text-xl

// Texto normal
text-sm sm:text-base

// Texto pequeño
text-xs sm:text-sm
```

### Visibilidad Condicional

```jsx
// Ocultar en mobile
hidden sm:block

// Ocultar en desktop
block sm:hidden

// Mostrar solo en tablet
hidden sm:block lg:hidden
```

### Iconos Responsivos

```jsx
<Icon sx={{ fontSize: { xs: 20, sm: 24 } }} />
```

## Testing Recomendado

### Dimensiones de Prueba

1. **Mobile Small**: 360x640px (iPhone SE)
2. **Mobile Standard**: 390x844px (iPhone 12/13)
3. **Tablet Portrait**: 768x1024px (iPad)
4. **Tablet Landscape**: 1024x768px
5. **Desktop Small**: 1366x768px (Laptop estándar)
6. **Desktop Large**: 1920x1080px (Monitor Full HD)

### Checklist de Pruebas

- [ ] Navegación funciona en todas las pantallas
- [ ] Texto legible sin zoom
- [ ] Botones tienen tamaño táctil adecuado (min 44x44px)
- [ ] Modales no se salen de pantalla
- [ ] Scroll funciona correctamente
- [ ] Columnas accesibles en mobile
- [ ] Footer siempre visible
- [ ] No hay overflow horizontal inesperado

## Herramientas de Desarrollo

### Chrome DevTools

```
Devices to test:
- iPhone SE (375x667)
- iPhone 12 Pro (390x844)
- iPad (768x1024)
- iPad Pro (1024x1366)
- Responsive mode (custom sizes)
```

### Comandos de Inspección

```javascript
// Verificar breakpoint actual
window.innerWidth

// Forzar recarga responsive
location.reload()
```

## Mejores Prácticas

1. **Mobile First**: Diseñar primero para móvil, luego escalar
2. **Touch Targets**: Botones mínimo 44x44px
3. **Readable Text**: Tamaño mínimo 14px (0.875rem)
4. **Spacing**: Usar rem/em en vez de px cuando sea posible
5. **Images**: Optimizar para diferentes densidades
6. **Performance**: Lazy loading en listas largas
7. **Gestures**: Soportar swipe y touch en mobile

## Notas de Implementación

- Todas las medidas usan Tailwind CSS
- Sistema de diseño consistente en toda la app
- Breakpoints alineados con estándares de la industria
- Soporte para modo oscuro/claro en todos los tamaños
