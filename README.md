# YOJHAN_CHEATS Discord Bot — actualizado

Esta versión conserva el sistema de tickets y agrega la mejora pedida a **`/publicar-embed`**.

## Cambio principal

Al escribir:

```text
/publicar-embed
```

ahora puedes elegir antes del formulario:

- `canal`
- `canal_id` — pega el ID si Discord no muestra el canal en la lista
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

Los tickets normales usan la categoría `TIKET` y se crean con nombre `tiket-1`, `tiket-2`, `tiket-3`, etc.

Los tickets de key gratis usan la categoría `TIKET GRATIS` y se crean con nombre `tiket-gratis-1`, `tiket-gratis-2`, etc. Si la categoría no existe, el bot intenta crearla debajo de `TIKET`.

Los IDs inválidos de `ADMIN_ROLE_IDS` y `MOD_ROLE_IDS` se ignoran.

## Instalar

```bash
npm install
```

Copia `.env.example` como `.env` para probar localmente. **No subas `.env` a GitHub**.

## Registrar los comandos

El bot registra los comandos cuando arranca. En Render normalmente solo debes subir el cambio a GitHub, esperar que el servicio quede en **Live** y recargar Discord.

Para probar localmente puedes ejecutar:

```bash
npm run deploy
```

Si Discord tarda en enseñar opciones nuevas, recarga con `Ctrl + R`. Los comandos de servidor suelen actualizarse rapido cuando `GUILD_ID` esta configurado.

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
- `FREE_KEYS_CATEGORY_NAME`
- `GUILD_ID`
- `MOD_ROLE_IDS`
- `TICKET_CATEGORY_ID`

Opcionalmente agrega:

```ini
TICKET_CATEGORY_NAME=TIKET
FREE_KEYS_CATEGORY_NAME=TIKET GRATIS
TICKET_NAME_PREFIX=tiket
FREE_KEY_TICKET_NAME_PREFIX=tiket-gratis
```

No hace falta cambiar el token del bot.

## Corrección 2.1.1

`/publicar-embed` ahora conserva correctamente las imágenes subidas antes de abrir el formulario y las vuelve a adjuntar al mensaje final. Esto evita que la foto desaparezca al publicar el embed.


## Publicación con imagen + ticket
`/publicar-embed` publica el embed con la foto grande dentro del cuadro y agrega debajo el botón rojo **Abrir ticket**. El botón abre un ticket normal usando la categoría configurada `TIKET`.

## Canales que no aparecen

En `/publicar-embed`, `/anuncio` y `/ticket-panel`, el campo `canal` ya no filtra solo dos tipos de canal. Si Discord de todas formas no enseña un canal, copia el ID del canal y pegalo en `canal_id`.
