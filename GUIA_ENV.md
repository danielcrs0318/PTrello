# 📝 Guía de Archivos .env

## 🔍 Resumen Rápido

### Archivos que tienes localmente (NO se suben a Git):
- ✅ `.env.local` - Tu configuración real para Docker local
- ✅ `.env.production` - Tu configuración real para Docker producción
- ✅ `backend/.env` - Tu configuración para ejecutar backend sin Docker

### Archivos de plantilla (SÍ se suben a Git):
- ✅ `.env.example` - Plantilla general del proyecto
- ✅ `.env.local.example` - Plantilla para Docker local
- ✅ `.env.production.example` - Plantilla para Docker producción

---

## 🎯 ¿Qué hace GitHub Actions?

### Durante las pruebas de CI/CD:

**GitHub Actions NO ejecuta tu aplicación**, solo valida que:
1. ✅ El código backend tenga sintaxis correcta
2. ✅ El frontend compile sin errores
3. ✅ Las imágenes Docker se construyan
4. ✅ Los archivos `docker-compose.yml` tengan sintaxis válida

### Para validar docker-compose:

GitHub Actions crea archivos `.env.local` y `.env.production` **temporales** con valores dummy:

```yaml
DB_HOST=localhost          # Valor dummy, no importa
DB_NAME=test_db           # Valor dummy, no importa
DB_PASSWORD=test          # Valor dummy, no importa
```

**¿Por qué valores dummy?** Porque solo se valida la sintaxis del YAML, no se conecta a ninguna base de datos.

---

## 🗄️ DB_HOST: ¿Qué valor usar?

### 1. Desarrollo Local (sin Docker):
```env
# archivo: backend/.env
DB_HOST=localhost\SQLEXPRESS
```
Tu SQL Server local de Windows.

### 2. Docker Compose Local:
```env
# archivo: .env.local
DB_HOST=localhost\SQLEXPRESS
```
Si el contenedor se conecta a tu SQL Server de Windows host.

**O si usas SQL Server en contenedor:**
```env
DB_HOST=sqlserver_container_name
```

### 3. Docker Compose Producción:
```env
# archivo: .env.production
DB_HOST=tu-servidor-produccion.database.windows.net
```
El host real de tu servidor SQL en la nube:
- **Azure SQL:** `nombre.database.windows.net`
- **AWS RDS:** `nombre.region.rds.amazonaws.com`
- **Servidor dedicado:** IP o hostname

### 4. GitHub Actions (CI/CD):
```env
DB_HOST=dummy-host-for-testing
```
Valor temporal, solo para validar sintaxis.

---

## 🚀 Flujo Explicado

### Tu Proyecto Ahora:

```
PTrello/
├── .env.example              ← Plantilla general (se sube a Git)
├── .env.local.example        ← Plantilla Docker local (se sube a Git)
├── .env.production.example   ← Plantilla Docker prod (se sube a Git)
│
├── .env.local               ← TUS datos reales local (NO se sube)
├── .env.production          ← TUS datos reales prod (NO se sube)
│
└── backend/
    └── .env                 ← TUS datos backend (NO se sube)
```

### Cuando haces Push a GitHub:

1. **Se suben los archivos `.example`** ✅
2. **NO se suben tus `.env` reales** ✅ (protegido por .gitignore)
3. **GitHub Actions:**
   - Descarga el código
   - Ve los archivos `.example`
   - Crea archivos `.env.local` y `.env.production` temporales con valores dummy
   - Valida que la sintaxis de docker-compose sea correcta
   - Elimina los archivos temporales
   - **No se conecta a ninguna base de datos**

---

## ✅ Checklist de Validación

Antes de hacer push, verifica:

- [ ] `.env.example` existe en la raíz
- [ ] `.env.local.example` existe en la raíz
- [ ] `.env.production.example` existe en la raíz
- [ ] Tu `.env.local` tiene tus datos reales (pero NO se sube)
- [ ] Tu `.env.production` tiene tus datos reales (pero NO se sube)
- [ ] `.gitignore` está actualizado correctamente

---

## 🔧 Problemas Comunes

### "GitHub Actions falla en Docker Compose"

**Solución:** Asegúrate de que los archivos `.example` existen y tienen todas las variables necesarias.

### "No encuentro mi .env.local"

**Solución:** Créalo desde la plantilla:
```powershell
cp .env.local.example .env.local
# Luego edita .env.local con tus datos reales
```

### "¿Qué DB_HOST uso en producción?"

**Respuesta:** El host de tu servidor SQL real en producción. En GitHub Actions se usa un valor dummy solo para validar sintaxis.

---

## 📚 Comandos Útiles

### Crear tus archivos .env desde las plantillas:

```powershell
# Para Docker local
cp .env.local.example .env.local

# Para Docker producción  
cp .env.production.example .env.production

# Para backend sin Docker
cp .env.example backend/.env
```

### Verificar qué archivos se subirán a Git:

```powershell
git status
git ls-files | grep .env
```

Deberías ver solo los archivos `.example`, NO los `.env` reales.

---

**Fecha:** Febrero 2026  
**Proyecto:** PTrello
