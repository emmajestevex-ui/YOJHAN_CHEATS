# YOJHAN_CHEATS Discord Bot — actualizado

Esta versión conserva el sistema de tickets y agrega la mejora pedida a **`/publicar-embed`**.

## Cambio principal

Al escribir:

```text
/publicar-embed
```

ahora puedes elegir antes del formulario:

- `canal`
- `foto` — subir archivo desde Discord
- `imagen_url` — URL directa de una imagen
- `logo` — subir archivo para el logo pequeño
- `logo_url` — URL directa del logo

Después se abre el mismo formulario con:

- Título
- Descripción
- Funciones/lista
- Color HEX
- Footer

La foto se muestra grande en el embed y el logo se muestra pequeño como thumbnail.

## Otros comandos incluidos

- `/ticket-panel`
- `/key-panel`
- `/anuncio`
- `/panel-admin`
- `/mute`
- `/kick`
- `/ban`

Los tickets normales y los de key gratis usan la categoría `TIKET`. Si `TICKET_CATEGORY_ID` está vacío o apunta a un canal normal, el bot busca `TIKET`, `TICKET` o `TICKETS`; si no existe, intenta crear `TIKET`.

Los IDs inválidos de `ADMIN_ROLE_IDS` y `MOD_ROLE_IDS` se ignoran.

## Instalar

```bash
npm install
```

Copia `.env.example` como `.env` para probar localmente. **No subas `.env` a GitHub**.

## Registrar los comandos nuevos

Después de reemplazar los archivos en GitHub/Render, ejecuta una vez:

```bash
npm run deploy
```

Esto es obligatorio porque cambió `/publicar-embed`.

## Iniciar

```bash
npm start
```

## Render

Puedes conservar las variables que ya tienes en Render:

- `ADMIN_ROLE_IDS`
- `CLIENT_ID`
- `DISCORD_TOKEN`
- `ENABLE_KEEP_ALIVE`
- `FREE_KEYS_CATEGORY_ID`
- `GUILD_ID`
- `MOD_ROLE_IDS`
- `TICKET_CATEGORY_ID`

Opcionalmente agrega:

```ini
TICKET_CATEGORY_NAME=TIKET
```

No hace falta cambiar el token del bot.

## Corrección 2.1.1

`/publicar-embed` ahora conserva correctamente las imágenes subidas antes de abrir el formulario y las vuelve a adjuntar al mensaje final. Esto evita que la foto desaparezca al publicar el embed.


## Publicación con imagen + ticket
`/publicar-embed` publica el embed con la foto grande dentro del cuadro y agrega debajo el botón rojo **Abrir ticket**. El botón abre un ticket normal usando la categoría configurada `TIKET`.
