# Análisis SaaS — De proyecto de privada a producto vendible multi-tenant

> Fecha: 2026-10-05
> Estado: documento de decisión futura (no implementado aún)
> Diagrama visual: `diagrama-multitenant.html` (abrir en navegador)

## 1. Contexto

Proyecto nacido para apoyar a una privada (60 casas). Stack: React 19 + Vite + Tailwind 4 + Firebase (Auth Google, Firestore, Storage).

Módulos actuales: pagos de mantenimiento, estados de cuenta, gastos, controles de portón, utilities, áreas comunes, roles dinámicos, adeudos históricos, reportes Excel/PDF.

Objetivo: evaluar qué falta para que sea 100% autosuficiente y vendible, y decidir modelo de despliegue más económico y rentable.

## 2. Qué falta para ser 100% autosuficiente

Hoy cada privada nueva requiere intervención manual en Firebase Console. Si hay que abrir consola para dar de alta un cliente, no es autosuficiente.

### 2.1 Bloqueadores críticos

1. **No existe el concepto "privada".** `houseNumber` validado 1-60 global (`src/services/userService.js`), monto base $300 hardcodeado, sin colección `condominiums`.
2. **Onboarding manual.** Primer admin se crea editando Firestore a mano (ver `README.md`). Falta flujo: registro global → crear privada (nombre, #casas, monto, día corte) → crear admin → generar `inviteCode`.
3. **Seguridad no apta multicliente.** `firestore.rules` actual permite:
   - `users`: `allow read/list if isAuthenticated()` — cualquiera lee todos.
   - `payments`: `allow read if isAuthenticated()` — cualquiera lee todos.
   - `expenses`: `allow create/update/delete if isAuthenticated()` — cualquier residente altera gastos.
   - Chequeo de rol vía `get(/users/uid)` en cada request = 1 lectura extra por validación.
   - Solución: migrar a **Custom Claims** (`{ condoId, role, superadmin }`), cero lecturas en rules.
4. **Sin aislamiento por tenant.** Ningún doc tiene `condoId`. Dos privadas se mezclarían.
5. **Config fija.** Falta `condominiums/{id} = { totalHouses, baseAmount, dueDay, lateFee, ... }`.

### 2.2 Para no recibir llamadas (operación sola)

6. Invitación por admin (`/join/CODIGO`), alta/baja/reasignación de casas por el admin.
7. Notificaciones automáticas (día 1, 8, 11, aprobado/rechazado) con Cloud Functions + Resend/SendGrid.
8. Multas automáticas (`baseAmount + lateFee` tras `dueDay`), hoy es edición manual.
9. Auditoría (`auditLogs`: quién aprobó qué, cuándo). Solo escribe Functions.
10. Observabilidad mínima (Analytics, Crashlytics, alertas de cuota Blaze).
11. Legal MX: aviso de privacidad + términos + aclarar que es comprobante interno, no CFDI.

## 3. Opción A vs Opción B de despliegue

### Opción A — Un deploy / un proyecto Firebase por privada

```
privada-a.web.app → proyecto firebase A
privada-b.web.app → proyecto firebase B
```

- Pros: aislamiento físico total, cada una cabe en free tier.
- Contras: N deploys, N rules, N índices, N dominios Auth, N configs, soporte "¿en qué proyecto está?". Con 10 privadas es insostenible sin DevOps.
- Costo infra: ~$0. Costo real: horas de mantenimiento.

### Opción B — App única multi-tenant (recomendada)

```
app.com → 1 proyecto Firebase → colecciones planas con condoId
```

- Pros: 1 deploy, 1 monitoreo, onboarding en 2 min, dashboard global de negocio (MRR/churn), cobro por suscripción.
- Contras: hay que hacer bien rules + claims una sola vez.
- Costo infra para 20 privadas (1,200 casas): **<$10 USD/mes** (ver §4).

**Decisión: Opción B con separación lógica (`condoId` + Claims).** Separación física solo si lo exige ley (no es el caso: cuotas vecinales).

## 4. Costos Firestore/Storage estimados

Base medida (`FIREBASE_FREE_TIER.md`): 1 privada 60 casas ≈ 2,000 reads/mes + 300 writes/mes.

| Escala | Reads/mes | Writes/mes | Firestore | Storage/egress |
|---|---|---|---|---|
| 1 privada | ~2k | ~300 | $0 | ~50 MB nuevo/mes |
| 20 privadas | ~40k | ~6k | ~$0.03 | ~1 GB / ~$2-3 USD |
| 100 privadas | ~200k | ~30k | ~$0.15 | ~5 GB |

Precios Blaze aprox (us-central): reads $0.06/100k, writes $0.18/100k, egress Storage ~$0.12/GB.

Conclusión: el driver no es Firestore sino Storage (ver comprobantes). Aun así, 20 privadas < $10 USD/mes. Cobrando $999–$1,999 MXN/mes por privada, margen >95% desde 5 clientes. Poner budget alert en $10 USD.

> Intuición de "cada privada su propia DB": se logra igual con aislamiento lógico, a 1/20 del costo operativo.

## 5. Esquema multi-tenant propuesto

Principio: **colecciones planas + `condoId` obligatorio en cada doc.** No subcolecciones (complican super-admin y migración).

### 5.1 `condominiums/{condoId}` (nueva, el corazón)

```js
{
  name: "Privada Las Lomas",
  slug: "las-lomas",
  inviteCode: "LOMAS-4X8K",
  totalHouses: 60,
  baseAmount: 300,
  dueDay: 10,
  lateFee: 50,
  currency: "MXN",
  status: "active", // trial | active | suspended
  plan: "pro",
  adminEmail: "admin@mail.com",
  createdBy: "uid",
  createdAt: Timestamp, updatedAt: Timestamp
}
```

### 5.2 `users/{uid}` (+2 campos)

```js
{ uid, email, displayName, condoId: "abc123", houseNumber: 15, role: "resident", createdAt }
// unicidad: (condoId + houseNumber), no global
// superadmin NO va aquí, va en Claims
```

Ajustar `isHouseNumberTaken()`, `updateUserHouse()`, `getUnregisteredHouses()` para filtrar por `condoId` y usar `totalHouses` del condominio.

### 5.3 Resto (solo agregan `condoId`)

- `payments/{id} = { condoId, userId, houseNumber, amount, month, year, status, ... }`
- `expenses`, `bankStatements`, `gateControls`, `utilities`, `commonAreaReservations`, `initialDeposits`: igual.

### 5.4 `roles` (fase 1: mantener global como plantilla)

Hoy `roles/{roleId}` global. Al crear privada, copiar base. Personalización futura: `roles/{condoId}_{role}` con fallback al global en `AuthContext.jsx`.

### 5.5 `auditLogs/{id}` (nueva, solo Functions)

```js
{ condoId, actorUid, action: "payment.approved", targetId, meta, createdAt }
```

### 5.6 Storage: prefijar por tenant

```
tenants/{condoId}/receipts/{userId}/{month}-{year}-{ts}.jpg
tenants/{condoId}/manual/{houseNumber}/{file}
tenants/{condoId}/bankStatements/{year}/{file}
tenants/{condoId}/expenses/{expenseId}/{file}
```

### 5.7 Custom Claims (ahorra lecturas en rules)

```js
{ condoId: "abc123", role: "admin", superadmin: false }
```

Functions: `onCondoCreate` (asigna admin), `onUserJoin` callable (valida inviteCode + unicidad casa, asigna resident). Superadmin se asigna 1 vez manual con Admin SDK. Frontend lee `getIdTokenResult()` en `AuthContext`.

### 5.8 Rules (resumen, versión completa pendiente de generar)

```js
function sameCondo(c) { return request.auth.token.condoId == c; }
// payments/expenses/etc:
allow read: if isAuth() && sameCondo(resource.data.condoId);
allow create: if isAuth() && sameCondo(request.resource.data.condoId) && (...rol...);
```

Cerrar `allow read if isAuthenticated()` actuales. `auditLogs`: solo lectura admin, escritura denegada (Functions con Admin SDK).

### 5.9 Índices

Agregar `condoId ASC` como primer campo a todos los compuestos de `firestore.indexes.json` (payments por year, por house, expenses, etc.).

## 6. Jerarquía SuperAdmin → Privadas → Casas → Usuarios

```
         ┌──────────────────────┐
         │  👑 SUPERADMIN (tú)  │
         │ claims: superadmin   │
         └──────────┬───────────┘
                    │ crea
        ┌───────────┴───────────┐
        ▼                       ▼
┌───────────────┐       ┌───────────────┐
│ LAS LOMAS     │       │ LOS PINOS     │
│ 60 casas $300 │       │ 30 casas $500 │
└───────┬───────┘       └───────┬───────┘
        │ contiene              │ contiene
        ▼                       ▼
  Casa #15, #16...        Casa #07, #08...
        │ habita                │ habita
        ▼                       ▼
  admin/resident/         admin/resident/
  gate_manager            gate_manager
  claims {condoId,role}   claims {condoId,role}
```

- SuperAdmin fuera de tenants, ve todo, suspende por `status`.
- Casa = pareja `(condoId + houseNumber)`; la #15 existe en ambas sin chocar.
- Usuario cuelga de casa + privada (doc + claims). Rules comparan `token.condoId == resource.data.condoId`.

Flujo: SuperAdmin monitorea → cliente se auto-registra en `/crear-privada` → admin invita por WhatsApp `/join/CODIGO` → operación diaria filtrada por `condoId`.

Ver diagrama visual en `diagrama-multitenant.html`.

## 7. Migración sin romper producción actual

1. Crear `condominiums/legacy-actual` (60, 300, 10).
2. Script Admin SDK: poner `condoId='legacy-actual'` donde falte en las 8 colecciones.
3. Poner claims a usuarios actuales.
4. Desplegar rules con compat temporal (`allow if resource.data.condoId == null`), luego exigir `condoId`.

## 8. Roadmap

Fase 1 (vendible, 2-3 sem): `condominiums` + `condoId` + Claims + rules por tenant + `/crear` + `/join/:code` + config `totalHouses/baseAmount/dueDay` + quitar hardcode 60.
Fase 2 (autosuficiente): super-admin global + Stripe/MP + Functions (recordatorios, multa, audit) + dominios custom opcional.

## 9. Modelo de precios y rentabilidad

Infra real por privada (app única multi-tenant): **~$8-15 MXN/mes**. El negocio se juega en soporte, no en Firebase.

### 9.1 Margen por precio

| Precio | Comisión pasarela (~3.6%) | Neto aprox* | Infra | Margen bruto |
|---|---|---|---|---|
| $500 | -$18 | ~$482 | -$12 | ~$470 (94%) |
| $1,000 | -$36 | ~$964 | -$12 | ~$952 (95%) |

*Sin IVA. Si facturas con IVA incluido, neto = precio / 1.16 ($500 → $431, $1,000 → $862). Sigue sobrando.

Referencia cliente (60 casas × $300 cuota = $18,000 recaudados/mes):
- $500 = $8.3 por casa/mes = 2.7% de lo recaudado (no-brainer).
- $1,000 = $16.6 por casa/mes = 5.5% (barato vs. Excel + WhatsApp + pleitos).

### 9.2 Escenarios MRR (menos ~$12 infra c/u)

| Clientes | A $500 | A $1,000 |
|---|---|---|
| 5 | ~$2,350 | ~$4,760 |
| 10 | ~$4,700 | ~$9,520 |
| 20 | ~$9,400 | ~$19,040 |
| 50 | ~$23,500 | ~$47,600 |

Infra total con 50 privadas: ~$600 MXN/mes. Rentable desde el cliente #1.

### 9.3 Precio recomendado (no salir a $500 fijo)

$500 es rentable pero ancla percepción "app barata" con el mismo soporte que $1,000 por la mitad de ingreso. Estrategia:

- Precio base: **$999/mes**, anual **$9,990** (2 meses gratis).
- Gancho lanzamiento: primeras 5 "privadas fundadoras" a **$499 congelado de por vida** a cambio de testimonio.
- Escalar por tamaño (una privada de 200 casas no cuesta más pero vale más):
  - Hasta 50 casas: **$599**
  - Hasta 100 casas: **$999**
  - Hasta 200 casas: **$1,499**

Con 10 privadas promedio en $999 → ~$10k MRR contra ~$200 de costos totales.

## 10. Siguientes pasos pendientes (cuando se retome)

- [ ] Generar `firestore.rules` + `storage.rules` multi-tenant listas para deploy
- [ ] Script de migración + backfill `condoId`
- [ ] Cloud Functions `onCondoCreate` / `onUserJoin` + cambio `AuthContext`
- [ ] Definir precio final y plan trial → pro
