# Crear Nuevo API Route

## Parametros

- $ROUTE_PATH: Path del route (ej: analyze-nutrition)
- $METHOD: Metodo HTTP (GET, POST, PUT, DELETE)
- $AUTH_REQUIRED: Si requiere auth (true/false, default true)

## Instrucciones

1. **Crear archivo** `src/app/api/$ROUTE_PATH/route.ts`

2. **Boilerplate con auth**:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function $METHOD(request: NextRequest) {
  try {
    // Auth
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createRouteHandlerClient({ cookies });

    // Validar input
    const body = await request.json();
    // TODO: Validar con schema

    // Logica...

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error(`Error in /api/$ROUTE_PATH:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
```

3. **Si necesita mas de 10s**, agregar en route config:

```typescript
export const maxDuration = 30; // segundos
```

4. **Agregar rate limiting** si es endpoint publico o de IA

5. **Verificar**:
   - [ ] `npm run build` exitoso
   - [ ] Auth implementado (o explicitamente publico)
   - [ ] Input validado
   - [ ] Error handling con try/catch
   - [ ] Sin console.log (usar logger.ts)
   - [ ] Rate limiting si necesario
