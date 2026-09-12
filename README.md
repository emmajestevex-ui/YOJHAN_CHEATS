# YOJHAN_CHEATS Discord Bot

Bot de Discord en Node.js con `discord.js` v14 para paneles administrativos tipo EMBED, tickets normales, tickets especiales para keys gratis, anuncios y moderacion.

## Funciones

- Panel administrativo con botones para crear embeds rojos/negros/blancos.
- Modal para titulo, descripcion, lista de funciones, color, footer y canal destino.
- Vista previa privada antes de publicar.
- Opciones extra para banner/imagen, miniatura/logo, @everyone y boton de ticket.
- Tickets normales y tickets especiales para keys gratis.
- Todos los tickets se abren en la categoria `TIKET` por defecto.
- Paneles de tickets con foto/banner y logo opcional.
- Cierre de tickets con boton o comando.
- Anuncios en embed.
- Moderacion: mute/timeout, unmute, ban y clear.
- Configuracion por `.env`; no se suben tokens ni secretos.
- Keep-alive web opcional para hostings que lo soporten.

## Requisitos

- Node.js 18.17 o superior.
- Una aplicacion/bot creada en Discord Developer Portal.
- El bot invitado con `applications.commands` y permisos de servidor suficientes:
  - Send Messages
  - Embed Links
  - Manage Channels
  - Manage Messages
  - Moderate Members
  - Ban Members
  - Mention Everyone, solo si usaras @everyone desde el panel

## Instalacion

1. Instala dependencias:

```bash
npm install
```

2. Copia el ejemplo de configuracion:

```bash
copy .env.example .env
```

En Linux/VPS:

```bash
cp .env.example .env
```

3. Edita `.env` y coloca tus datos reales:

```env
DISCORD_TOKEN=tu_token_real
CLIENT_ID=id_de_la_aplicacion
GUILD_ID=id_de_tu_servidor
ADMIN_ROLE_IDS=id_rol_admin
MOD_ROLE_IDS=id_rol_mod
TICKET_CATEGORY_ID=id_categoria_tickets
TICKET_CATEGORY_NAME=TIKET
```

Nunca pegues el token en canales, embeds, capturas o repositorios publicos.

4. Registra los comandos slash:

```bash
npm run deploy
```

Con `GUILD_ID`, los comandos aparecen rapido en ese servidor. Sin `GUILD_ID`, se registran globalmente y Discord puede tardar mas en mostrarlos.

5. Enciende el bot:

```bash
npm start
```

## Comandos

- `/panel-admin`: abre un panel privado con botones para crear embeds.
- `/publicar-embed canal`: abre directamente el formulario para publicar un embed en el canal elegido.
- `/ticket-panel tipo canal titulo descripcion foto imagen_url logo logo_url boton`: publica un panel de tickets normal o de keys gratis.
- `/anuncio canal titulo mensaje everyone color imagen foto logo_url logo`: publica un anuncio embed.
- `/mute usuario duracion razon`: aplica timeout. Ejemplos: `10m`, `1h`, `2d`.
- `/unmute usuario razon`: quita timeout.
- `/ban usuario razon borrar_dias`: banea a un usuario.
- `/clear cantidad usuario`: borra mensajes recientes, opcionalmente de un usuario.
- `/cerrar-ticket razon`: cierra el ticket actual.

## Panel de embeds

Flujo recomendado:

1. Usa `/publicar-embed canal` o `/panel-admin`.
2. Llena el formulario principal:
   - Titulo
   - Descripcion
   - Funciones/lista, una por linea
   - Color HEX, por ejemplo `#ff1f1f`
   - Footer
3. Revisa la vista previa privada.
4. Usa `Media` si quieres agregar banner o miniatura/logo.
5. Usa `Opciones` si quieres activar/desactivar @everyone, boton de ticket o tipo de ticket.
6. Pulsa `Publicar`.

El boton de ticket del embed puede abrir ticket normal o ticket especial de keys gratis.

## Tickets

Los tickets se crean como canales privados dentro de la categoria `TIKET`.

El bot busca asi:

1. Usa `TICKET_CATEGORY_ID` si es una categoria valida.
2. Si ese ID falta o era un canal normal por error, busca una categoria llamada `TIKET`, `TICKET` o `TICKETS`.
3. Si no existe, intenta crear la categoria `TIKET`.

Cada ticket queda con:

- acceso para el usuario que abre el ticket;
- acceso para roles en `ADMIN_ROLE_IDS` y `MOD_ROLE_IDS`;
- acceso para el bot;
- bloqueo para `@everyone`.

Los tickets normales y los de keys gratis van a esa misma seccion para mantenerlos juntos.

## Fotos En Paneles

`/ticket-panel` y `/anuncio` aceptan imagen subida desde Discord o URL:

- `foto`: banner/imagen grande.
- `imagen_url` o `imagen`: URL para banner si no subes archivo.
- `logo`: miniatura/logo.
- `logo_url`: URL para miniatura/logo.

En el panel administrativo por modal, Discord no permite subir archivos dentro del formulario; por eso ahi se colocan URLs en el boton `Media`.

## Keep-alive y 24/7

Puedes activar un endpoint de salud con:

```env
ENABLE_KEEP_ALIVE=true
PORT=3000
```

Esto crea `/health` para servicios que hacen ping al bot. Aun asi, el keep-alive solo sirve si tu hosting permite procesos siempre activos o pings externos. Si el proveedor duerme, reinicia o apaga procesos gratis, un ping puede no ser suficiente.

Para que el bot este realmente siempre activo necesitas un host 24/7: VPS, servidor dedicado, panel tipo Pterodactyl, Docker en un servidor propio, o un plan de hosting que no suspenda workers.

## PM2 en VPS

```bash
npm install
npm run deploy
npx pm2 start ecosystem.config.cjs
npx pm2 save
npx pm2 logs yojhan-cheats-bot
```

PM2 reinicia el proceso si se cae, pero no reemplaza un host 24/7.

## Docker

```bash
docker build -t yojhan-cheats-bot .
docker run --env-file .env --name yojhan-cheats-bot -d yojhan-cheats-bot
```

## Seguridad

- No compartas `.env`.
- No hardcodees tokens en el codigo.
- Mantén el rol del bot por encima de los roles que debe moderar.
- Dale al bot solo los permisos que necesita para tu servidor.
